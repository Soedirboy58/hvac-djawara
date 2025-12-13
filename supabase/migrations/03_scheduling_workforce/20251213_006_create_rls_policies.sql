-- ============================================
-- Migration: Create RLS Policies
-- Purpose: Row Level Security policies for all new tables
-- Domain: Scheduling & Workforce Management
-- Dependencies: All previous migrations, auth helpers
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: DAILY ATTENDANCE POLICIES
-- ================================================

-- SELECT: Technicians view own, staff view all in tenant
DROP POLICY IF EXISTS "users_view_attendance" ON public.daily_attendance;
CREATE POLICY "users_view_attendance"
ON public.daily_attendance
FOR SELECT
USING (
  tenant_id = public.get_active_tenant_id()
  AND (
    -- Technicians can view their own attendance
    user_id = auth.uid()
    OR
    -- Admin/coordinator/tech_head can view all
    public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'tech_head'])
  )
);

-- INSERT: Technicians can clock in (create attendance record)
DROP POLICY IF EXISTS "technicians_clock_in" ON public.daily_attendance;
CREATE POLICY "technicians_clock_in"
ON public.daily_attendance
FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND user_id = auth.uid()
  AND public.has_role(ARRAY['technician', 'helper', 'tech_head'])
);

-- UPDATE: Technicians update own (clock out), admins manage all
DROP POLICY IF EXISTS "users_update_attendance" ON public.daily_attendance;
CREATE POLICY "users_update_attendance"
ON public.daily_attendance
FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND (
    -- Technicians can update their own attendance (clock out)
    user_id = auth.uid()
    OR
    -- Admin/coordinator can manage all attendance
    public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic'])
  )
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
);

-- DELETE: Only owner and admins can delete attendance records
DROP POLICY IF EXISTS "admins_delete_attendance" ON public.daily_attendance;
CREATE POLICY "admins_delete_attendance"
ON public.daily_attendance
FOR DELETE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance'])
);

RAISE NOTICE '✓ Created RLS policies for daily_attendance';

-- ================================================
-- SECTION 2: OVERTIME REQUESTS POLICIES
-- ================================================

-- SELECT: Technicians view own, staff view all
DROP POLICY IF EXISTS "users_view_overtime_requests" ON public.overtime_requests;
CREATE POLICY "users_view_overtime_requests"
ON public.overtime_requests
FOR SELECT
USING (
  tenant_id = public.get_active_tenant_id()
  AND (
    -- Technicians can view their own requests
    user_id = auth.uid()
    OR
    -- All staff can view approved/completed overtime (for transparency)
    status IN ('approved', 'in_progress', 'completed', 'needs_review')
    OR
    -- Admin/coordinator/tech_head can view all
    public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'tech_head'])
  )
);

-- INSERT: Technicians can create overtime requests
DROP POLICY IF EXISTS "technicians_create_overtime_requests" ON public.overtime_requests;
CREATE POLICY "technicians_create_overtime_requests"
ON public.overtime_requests
FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND user_id = auth.uid()
  AND public.has_role(ARRAY['technician', 'helper', 'tech_head'])
  AND status = 'pending' -- Initial status must be pending
);

-- UPDATE: Technicians update own (execution), admins approve/manage
DROP POLICY IF EXISTS "users_update_overtime_requests" ON public.overtime_requests;
CREATE POLICY "users_update_overtime_requests"
ON public.overtime_requests
FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND (
    -- Technicians can update their own requests (execution phase)
    (user_id = auth.uid() AND status IN ('approved', 'in_progress'))
    OR
    -- Admin/coordinator/tech_head can approve/reject
    public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'tech_head'])
  )
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
);

-- DELETE: Only owner and admins can delete overtime requests
DROP POLICY IF EXISTS "admins_delete_overtime_requests" ON public.overtime_requests;
CREATE POLICY "admins_delete_overtime_requests"
ON public.overtime_requests
FOR DELETE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance'])
  AND status = 'pending' -- Only delete pending requests
);

RAISE NOTICE '✓ Created RLS policies for overtime_requests';

-- ================================================
-- SECTION 3: TECHNICIAN AVAILABILITY POLICIES
-- ================================================

-- SELECT: All staff can view (for scheduling)
DROP POLICY IF EXISTS "users_view_technician_availability" ON public.technician_availability;
CREATE POLICY "users_view_technician_availability"
ON public.technician_availability
FOR SELECT
USING (
  tenant_id = public.get_active_tenant_id()
);

-- INSERT: Technicians manage own, admins manage all
DROP POLICY IF EXISTS "users_insert_technician_availability" ON public.technician_availability;
CREATE POLICY "users_insert_technician_availability"
ON public.technician_availability
FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND (
    -- Technicians can manage their own availability
    user_id = auth.uid()
    OR
    -- Admin/coordinator/tech_head can manage all
    public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'tech_head'])
  )
);

-- UPDATE: Technicians update own, admins manage all
DROP POLICY IF EXISTS "users_update_technician_availability" ON public.technician_availability;
CREATE POLICY "users_update_technician_availability"
ON public.technician_availability
FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND (
    -- Technicians can update their own availability
    user_id = auth.uid()
    OR
    -- Admin/coordinator/tech_head can manage all
    public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'tech_head'])
  )
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
);

-- DELETE: Only admins can delete availability records
DROP POLICY IF EXISTS "admins_delete_technician_availability" ON public.technician_availability;
CREATE POLICY "admins_delete_technician_availability"
ON public.technician_availability
FOR DELETE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic'])
);

RAISE NOTICE '✓ Created RLS policies for technician_availability';

-- ================================================
-- SECTION 4: ORDER STATUS HISTORY POLICIES
-- ================================================

-- SELECT: All staff can view (audit trail)
DROP POLICY IF EXISTS "users_view_order_status_history" ON public.order_status_history;
CREATE POLICY "users_view_order_status_history"
ON public.order_status_history
FOR SELECT
USING (
  tenant_id = public.get_active_tenant_id()
);

-- INSERT: No direct insert (trigger only)
-- The trigger uses SECURITY DEFINER to bypass RLS
DROP POLICY IF EXISTS "no_manual_insert_order_status_history" ON public.order_status_history;
CREATE POLICY "no_manual_insert_order_status_history"
ON public.order_status_history
FOR INSERT
WITH CHECK (false); -- Deny all manual inserts

-- UPDATE: No manual updates allowed
DROP POLICY IF EXISTS "no_manual_update_order_status_history" ON public.order_status_history;
CREATE POLICY "no_manual_update_order_status_history"
ON public.order_status_history
FOR UPDATE
USING (false); -- Deny all updates

-- DELETE: No manual deletes allowed
DROP POLICY IF EXISTS "no_manual_delete_order_status_history" ON public.order_status_history;
CREATE POLICY "no_manual_delete_order_status_history"
ON public.order_status_history
FOR DELETE
USING (false); -- Deny all deletes

RAISE NOTICE '✓ Created RLS policies for order_status_history (read-only)';

-- ================================================
-- SECTION 5: WORKING HOURS CONFIG POLICIES
-- ================================================

-- SELECT: All staff can view
DROP POLICY IF EXISTS "users_view_working_hours_config" ON public.working_hours_config;
CREATE POLICY "users_view_working_hours_config"
ON public.working_hours_config
FOR SELECT
USING (
  tenant_id = public.get_active_tenant_id()
);

-- INSERT: Only owner can create config
DROP POLICY IF EXISTS "owner_insert_working_hours_config" ON public.working_hours_config;
CREATE POLICY "owner_insert_working_hours_config"
ON public.working_hours_config
FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
);

-- UPDATE: Only owner can update config
DROP POLICY IF EXISTS "owner_update_working_hours_config" ON public.working_hours_config;
CREATE POLICY "owner_update_working_hours_config"
ON public.working_hours_config
FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
);

-- DELETE: Only owner can delete config
DROP POLICY IF EXISTS "owner_delete_working_hours_config" ON public.working_hours_config;
CREATE POLICY "owner_delete_working_hours_config"
ON public.working_hours_config
FOR DELETE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
);

RAISE NOTICE '✓ Created RLS policies for working_hours_config';

-- ================================================
-- SECTION 6: UPDATE SERVICE ORDERS POLICIES
-- ================================================
-- Add policy for technicians to update actual start/end times

DROP POLICY IF EXISTS "technicians_update_job_times" ON public.service_orders;
CREATE POLICY "technicians_update_job_times"
ON public.service_orders
FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND assigned_to = auth.uid()
  AND public.has_role(ARRAY['technician', 'helper', 'tech_head'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND assigned_to = auth.uid()
);

RAISE NOTICE '✓ Added RLS policy for technicians to update job times on service_orders';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  policy_count INT;
  attendance_policies INT;
  overtime_policies INT;
  availability_policies INT;
  history_policies INT;
  config_policies INT;
BEGIN
  -- Count all new policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN (
    'daily_attendance',
    'overtime_requests',
    'technician_availability',
    'order_status_history',
    'working_hours_config'
  );
  
  -- Count by table
  SELECT COUNT(*) INTO attendance_policies
  FROM pg_policies WHERE tablename = 'daily_attendance';
  
  SELECT COUNT(*) INTO overtime_policies
  FROM pg_policies WHERE tablename = 'overtime_requests';
  
  SELECT COUNT(*) INTO availability_policies
  FROM pg_policies WHERE tablename = 'technician_availability';
  
  SELECT COUNT(*) INTO history_policies
  FROM pg_policies WHERE tablename = 'order_status_history';
  
  SELECT COUNT(*) INTO config_policies
  FROM pg_policies WHERE tablename = 'working_hours_config';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 006: RLS POLICIES CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Total RLS policies created: %', policy_count;
  RAISE NOTICE '   ✅ daily_attendance policies: %', attendance_policies;
  RAISE NOTICE '   ✅ overtime_requests policies: %', overtime_policies;
  RAISE NOTICE '   ✅ technician_availability policies: %', availability_policies;
  RAISE NOTICE '   ✅ order_status_history policies: %', history_policies;
  RAISE NOTICE '   ✅ working_hours_config policies: %', config_policies;
  RAISE NOTICE '   ✅ service_orders policy updated';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  ASSERT policy_count >= 19, 
         'Expected at least 19 RLS policies, found ' || policy_count;
END $$;
