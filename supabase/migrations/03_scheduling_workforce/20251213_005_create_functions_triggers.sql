-- ============================================
-- Migration: Create Functions & Triggers
-- Purpose: Auto-calculate work hours, overtime, status tracking, auto clock-out
-- Domain: Scheduling & Workforce Management
-- Dependencies: daily_attendance, overtime_requests, order_status_history, working_hours_config
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- FUNCTION 1: Calculate Work Hours (for Attendance)
-- ================================================
DROP FUNCTION IF EXISTS public.calculate_work_hours() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS TRIGGER AS $$
DECLARE
  config_start TIME;
  config_end TIME;
  work_start TIMESTAMPTZ;
  work_end TIMESTAMPTZ;
  hours_worked DECIMAL(5,2);
BEGIN
  -- Get working hours config for tenant
  SELECT work_start_time, work_end_time
  INTO config_start, config_end
  FROM public.working_hours_config
  WHERE tenant_id = NEW.tenant_id
  AND is_active = true
  LIMIT 1;
  
  -- Use default if no config found
  IF config_start IS NULL THEN
    config_start := '09:00'::TIME;
    config_end := '17:00'::TIME;
  END IF;
  
  -- Calculate work_start_time
  IF NEW.clock_in_time IS NOT NULL THEN
    -- If clock in <= 09:00, work starts at 09:00
    -- If clock in > 09:00, work starts at actual time (late)
    IF NEW.clock_in_time::TIME <= config_start THEN
      work_start := (NEW.attendance_date || ' ' || config_start::TEXT)::TIMESTAMPTZ;
      NEW.is_late := false;
    ELSE
      work_start := NEW.clock_in_time;
      NEW.is_late := true;
    END IF;
    NEW.work_start_time := work_start;
  END IF;
  
  -- Calculate work_end_time
  IF NEW.clock_out_time IS NOT NULL THEN
    -- If clock out >= 17:00, work ends at 17:00
    -- If clock out < 17:00, work ends at actual time (early leave)
    IF NEW.clock_out_time::TIME >= config_end THEN
      work_end := (NEW.attendance_date || ' ' || config_end::TEXT)::TIMESTAMPTZ;
      NEW.is_early_leave := false;
    ELSE
      work_end := NEW.clock_out_time;
      -- Only mark as early leave if not auto checkout
      IF NOT COALESCE(NEW.is_auto_checkout, false) THEN
        NEW.is_early_leave := true;
      END IF;
    END IF;
    NEW.work_end_time := work_end;
  END IF;
  
  -- Calculate total work hours
  IF NEW.work_start_time IS NOT NULL AND NEW.work_end_time IS NOT NULL THEN
    hours_worked := EXTRACT(EPOCH FROM (NEW.work_end_time - NEW.work_start_time)) / 3600.0;
    NEW.total_work_hours := ROUND(hours_worked, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_work_hours() IS 
'Auto-calculate work hours and flags for daily attendance.
Triggered on INSERT/UPDATE of daily_attendance table.
Rules:
- work_start_time = 09:00 if on time, actual if late
- work_end_time = 17:00 if on time, actual if early/auto
- Sets is_late, is_early_leave flags
- Calculates total_work_hours in decimal hours';

-- Create trigger
DROP TRIGGER IF EXISTS calculate_work_hours_trigger ON public.daily_attendance;
CREATE TRIGGER calculate_work_hours_trigger
  BEFORE INSERT OR UPDATE OF clock_in_time, clock_out_time, is_auto_checkout
  ON public.daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_work_hours();

RAISE NOTICE '✓ Created calculate_work_hours() function and trigger';

-- ================================================
-- FUNCTION 2: Calculate Overtime Hours
-- ================================================
DROP FUNCTION IF EXISTS public.calculate_overtime_hours() CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_overtime_hours()
RETURNS TRIGGER AS $$
DECLARE
  config_rate DECIMAL(10,2);
BEGIN
  -- Calculate estimated hours on INSERT or when estimated times change
  IF (TG_OP = 'INSERT' OR 
      NEW.estimated_start_time IS DISTINCT FROM OLD.estimated_start_time OR
      NEW.estimated_end_time IS DISTINCT FROM OLD.estimated_end_time) THEN
    IF NEW.estimated_start_time IS NOT NULL AND NEW.estimated_end_time IS NOT NULL THEN
      NEW.estimated_hours := ROUND(
        EXTRACT(EPOCH FROM (NEW.estimated_end_time - NEW.estimated_start_time)) / 3600.0,
        2
      );
    END IF;
  END IF;
  
  -- Calculate actual hours when actual_end_time is set
  IF NEW.actual_start_time IS NOT NULL AND NEW.actual_end_time IS NOT NULL THEN
    NEW.actual_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 3600.0,
      2
    );
    
    -- Calculate billable hours (only if estimated_hours is set)
    IF NEW.estimated_hours IS NOT NULL AND NEW.actual_hours IS NOT NULL THEN
      IF NEW.actual_hours <= NEW.estimated_hours THEN
        -- Actual within estimate: bill actual
        NEW.billable_hours := NEW.actual_hours;
        NEW.needs_review := false;
      ELSE
        -- Actual exceeds estimate: bill only estimated, flag for review
        NEW.billable_hours := NEW.estimated_hours;
        NEW.needs_review := true;
      END IF;
    END IF;
    
    -- Update status to completed if not already
    IF NEW.status = 'in_progress' THEN
      IF NEW.needs_review THEN
        NEW.status := 'needs_review';
      ELSE
        NEW.status := 'completed';
      END IF;
    END IF;
  END IF;
  
  -- Get overtime rate from config if not already set
  IF NEW.overtime_rate IS NULL AND TG_OP = 'INSERT' THEN
    SELECT overtime_rate_per_hour
    INTO config_rate
    FROM public.working_hours_config
    WHERE tenant_id = NEW.tenant_id
    AND is_active = true
    LIMIT 1;
    
    -- Use default if no config found (Rp 5,000/hour - standard rate)
    -- Note: This default should match working_hours_config.overtime_rate_per_hour default
    NEW.overtime_rate := COALESCE(config_rate, 5000.00);
  END IF;
  
  -- Calculate total cost
  IF NEW.billable_hours IS NOT NULL AND NEW.overtime_rate IS NOT NULL THEN
    NEW.total_cost := ROUND(NEW.billable_hours * NEW.overtime_rate, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_overtime_hours() IS 
'Auto-calculate overtime hours and costs.
Triggered on INSERT/UPDATE of overtime_requests table.
Rules:
- estimated_hours = (estimated_end - estimated_start) in hours
- actual_hours = (actual_end - actual_start) in hours
- billable_hours = min(actual, estimated) or flag needs_review
- total_cost = billable_hours × overtime_rate
- Sets needs_review flag if actual > estimated';

-- Create trigger
DROP TRIGGER IF EXISTS calculate_overtime_hours_trigger ON public.overtime_requests;
CREATE TRIGGER calculate_overtime_hours_trigger
  BEFORE INSERT OR UPDATE
  ON public.overtime_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_overtime_hours();

RAISE NOTICE '✓ Created calculate_overtime_hours() function and trigger';

-- ================================================
-- FUNCTION 3: Track Status Changes (for Order History)
-- ================================================
DROP FUNCTION IF EXISTS public.track_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.track_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (
      tenant_id,
      service_order_id,
      old_status,
      new_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(
        auth.uid(), -- Current user from auth context
        NEW.created_by -- Fallback to order creator
      ),
      NOW()
    );
  ELSIF TG_OP = 'INSERT' THEN
    -- Track initial status
    INSERT INTO public.order_status_history (
      tenant_id,
      service_order_id,
      old_status,
      new_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NULL, -- No old status on insert
      NEW.status,
      COALESCE(
        auth.uid(),
        NEW.created_by
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.track_status_change() IS 
'Auto-track status changes on service orders.
Triggered on INSERT/UPDATE of service_orders table.
Creates audit trail in order_status_history table.
SECURITY DEFINER: Runs with function owner permissions to bypass RLS.';

-- Create trigger
DROP TRIGGER IF EXISTS track_status_change_trigger ON public.service_orders;
CREATE TRIGGER track_status_change_trigger
  AFTER INSERT OR UPDATE OF status
  ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.track_status_change();

RAISE NOTICE '✓ Created track_status_change() function and trigger';

-- ================================================
-- FUNCTION 4: Auto Clock-Out Forgot Technicians
-- ================================================
DROP FUNCTION IF EXISTS public.auto_clock_out_forgot_technicians() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_clock_out_forgot_technicians()
RETURNS TABLE(
  attendance_id UUID,
  user_id UUID,
  attendance_date DATE,
  auto_clocked_out_at TIMESTAMPTZ
) AS $$
DECLARE
  affected_count INT := 0;
  config_end TIME;
BEGIN
  -- This function should be called daily at 00:01 via cron or external scheduler
  -- It auto-sets clock_out_time to 17:00 for technicians who forgot to clock out
  
  -- Get yesterday's date
  -- Update attendance records where:
  -- 1. clock_in_time is set (they clocked in)
  -- 2. clock_out_time is NULL (they forgot to clock out)
  -- 3. attendance_date is yesterday
  
  RETURN QUERY
  UPDATE public.daily_attendance da
  SET 
    clock_out_time = (da.attendance_date || ' ' || 
      COALESCE(
        (SELECT work_end_time::TEXT FROM public.working_hours_config 
         WHERE tenant_id = da.tenant_id AND is_active = true LIMIT 1),
        '17:00'
      )
    )::TIMESTAMPTZ,
    is_auto_checkout = true,
    notes = COALESCE(notes || E'\n', '') || 'Auto clock-out at ' || NOW()::TEXT
  WHERE 
    da.clock_in_time IS NOT NULL
    AND da.clock_out_time IS NULL
    AND da.attendance_date = CURRENT_DATE - INTERVAL '1 day'
  RETURNING 
    da.id as attendance_id,
    da.user_id,
    da.attendance_date,
    NOW() as auto_clocked_out_at;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RAISE NOTICE '✓ Auto clock-out completed: % technicians processed', affected_count;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_clock_out_forgot_technicians() IS 
'Auto clock-out technicians who forgot to clock out.
Should be run daily at 00:01 via cron job or external scheduler.
Sets clock_out_time to 17:00 (or configured time) for yesterday''s date.
Sets is_auto_checkout flag to true.
Returns list of affected attendance records.
SECURITY DEFINER: Runs with function owner permissions to bypass RLS.';

RAISE NOTICE '✓ Created auto_clock_out_forgot_technicians() function (for cron)';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  function_count INT;
  trigger_count INT;
BEGIN
  -- Check functions created
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'calculate_work_hours',
    'calculate_overtime_hours',
    'track_status_change',
    'auto_clock_out_forgot_technicians'
  );
  
  ASSERT function_count = 4, 
         'Expected 4 functions, found ' || function_count;
  
  -- Check triggers created
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'calculate_work_hours_trigger',
    'calculate_overtime_hours_trigger',
    'track_status_change_trigger'
  );
  
  ASSERT trigger_count = 3, 
         'Expected 3 triggers, found ' || trigger_count;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 005: FUNCTIONS & TRIGGERS CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Functions created: %', function_count;
  RAISE NOTICE '   ✅ Triggers created: %', trigger_count;
  RAISE NOTICE '   ✅ calculate_work_hours() → daily_attendance';
  RAISE NOTICE '   ✅ calculate_overtime_hours() → overtime_requests';
  RAISE NOTICE '   ✅ track_status_change() → service_orders';
  RAISE NOTICE '   ✅ auto_clock_out_forgot_technicians() (for cron)';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
