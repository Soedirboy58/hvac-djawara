-- Migration: Create functions and triggers
-- Description: Automated calculations and audit trail triggers

-- A. Function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    config_start_time TIME;
    config_end_time TIME;
BEGIN
    -- Get working hours config for tenant
    SELECT work_start_time, work_end_time 
    INTO config_start_time, config_end_time
    FROM working_hours_config 
    WHERE tenant_id = NEW.tenant_id;
    
    -- Use defaults if config not found
    config_start_time := COALESCE(config_start_time, '09:00:00'::TIME);
    config_end_time := COALESCE(config_end_time, '17:00:00'::TIME);
    
    -- Calculate work_start_time (standard start or actual if late)
    IF NEW.clock_in_time IS NOT NULL THEN
        IF NEW.clock_in_time::TIME > config_start_time THEN
            NEW.work_start_time := NEW.clock_in_time;
            NEW.is_late := true;
        ELSE
            NEW.work_start_time := (NEW.date + config_start_time::TIME)::TIMESTAMPTZ;
            NEW.is_late := false;
        END IF;
    END IF;
    
    -- Calculate work_end_time (standard end or actual if early)
    IF NEW.clock_out_time IS NOT NULL THEN
        IF NEW.clock_out_time::TIME < config_end_time THEN
            NEW.work_end_time := NEW.clock_out_time;
            NEW.is_early_leave := true;
        ELSE
            NEW.work_end_time := (NEW.date + config_end_time::TIME)::TIMESTAMPTZ;
            NEW.is_early_leave := false;
        END IF;
    END IF;
    
    -- Calculate total_work_hours
    IF NEW.work_start_time IS NOT NULL AND NEW.work_end_time IS NOT NULL THEN
        NEW.total_work_hours := EXTRACT(EPOCH FROM (NEW.work_end_time - NEW.work_start_time)) / 3600.0;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_work_hours() IS 'Auto-calculate work hours and set attendance flags';

-- Create trigger for daily_attendance
DROP TRIGGER IF EXISTS trigger_calculate_work_hours ON daily_attendance;
CREATE TRIGGER trigger_calculate_work_hours
    BEFORE INSERT OR UPDATE ON daily_attendance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_work_hours();

-- B. Function to calculate overtime hours
CREATE OR REPLACE FUNCTION calculate_overtime_hours()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate estimated hours from time
    IF NEW.estimated_start_time IS NOT NULL AND NEW.estimated_end_time IS NOT NULL THEN
        NEW.estimated_hours := EXTRACT(EPOCH FROM (NEW.estimated_end_time - NEW.estimated_start_time)) / 3600.0;
    END IF;
    
    -- Calculate actual hours from timestamps
    IF NEW.actual_start_time IS NOT NULL AND NEW.actual_end_time IS NOT NULL THEN
        NEW.actual_hours := EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 3600.0;
        
        -- Set billable hours (minimum of actual vs estimated)
        IF NEW.estimated_hours IS NOT NULL THEN
            NEW.billable_hours := LEAST(NEW.actual_hours, NEW.estimated_hours);
            
            -- Flag for review if actual exceeds estimated
            IF NEW.actual_hours > NEW.estimated_hours THEN
                NEW.needs_review := true;
            ELSE
                NEW.needs_review := false;
            END IF;
        ELSE
            NEW.billable_hours := NEW.actual_hours;
        END IF;
        
        -- Auto-complete status when actual times are recorded
        IF NEW.status = 'approved' THEN
            NEW.status := 'completed';
        END IF;
    END IF;
    
    -- Set approval timestamp
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        NEW.approved_at := NOW();
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_overtime_hours() IS 'Auto-calculate overtime hours and set billable hours';

-- Create trigger for overtime_requests
DROP TRIGGER IF EXISTS trigger_calculate_overtime_hours ON overtime_requests;
CREATE TRIGGER trigger_calculate_overtime_hours
    BEFORE INSERT OR UPDATE ON overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_overtime_hours();

-- C. Function to track status changes
CREATE OR REPLACE FUNCTION track_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Only track if status actually changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
        
        -- Get user role if changed_by is set
        IF NEW.updated_by IS NOT NULL THEN
            SELECT role INTO user_role_val
            FROM user_tenant_roles
            WHERE user_id = NEW.updated_by 
            AND tenant_id = NEW.tenant_id
            LIMIT 1;
        END IF;
        
        -- Insert into history
        INSERT INTO order_status_history (
            tenant_id,
            order_id,
            old_status,
            new_status,
            changed_by,
            changed_by_role
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.updated_by,
            user_role_val
        );
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION track_status_change() IS 'Auto-track service order status changes';

-- Create trigger for service_orders
DROP TRIGGER IF EXISTS trigger_track_status_change ON service_orders;
CREATE TRIGGER trigger_track_status_change
    AFTER INSERT OR UPDATE ON service_orders
    FOR EACH ROW
    EXECUTE FUNCTION track_status_change();

-- D. Function to auto clock out forgotten technicians
CREATE OR REPLACE FUNCTION auto_clock_out_forgot_technicians()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
    config_end_time TIME;
BEGIN
    -- Process each tenant's attendance records
    FOR config_end_time IN 
        SELECT COALESCE(work_end_time, '17:00:00'::TIME)
        FROM working_hours_config
    LOOP
        -- Update attendance records without clock_out_time
        UPDATE daily_attendance
        SET 
            clock_out_time = (date + config_end_time)::TIMESTAMPTZ,
            is_auto_checkout = true,
            updated_at = NOW()
        WHERE 
            date = CURRENT_DATE - INTERVAL '1 day'
            AND clock_in_time IS NOT NULL
            AND clock_out_time IS NULL;
        
        updated_count := updated_count + COALESCE(FOUND, 0);
    END LOOP;
    
    RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION auto_clock_out_forgot_technicians() IS 'Auto clock out technicians who forgot to clock out (for cron job)';
