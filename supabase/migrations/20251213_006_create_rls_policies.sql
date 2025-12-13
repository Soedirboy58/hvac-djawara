-- Migration: Create Row Level Security policies
-- Description: RLS policies for attendance, overtime, and config tables

-- =====================================================
-- RLS Policies for daily_attendance
-- =====================================================

-- Policy: Technicians can view their own attendance
CREATE POLICY "Technicians can view own attendance"
ON daily_attendance
FOR SELECT
TO authenticated
USING (
    technician_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = daily_attendance.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
);

-- Policy: Technicians can insert their own attendance
CREATE POLICY "Technicians can insert own attendance"
ON daily_attendance
FOR INSERT
TO authenticated
WITH CHECK (
    technician_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = daily_attendance.tenant_id
    )
);

-- Policy: Technicians can update their own attendance
CREATE POLICY "Technicians can update own attendance"
ON daily_attendance
FOR UPDATE
TO authenticated
USING (
    technician_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = daily_attendance.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
)
WITH CHECK (
    technician_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = daily_attendance.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
);

-- Policy: Owners can delete attendance records
CREATE POLICY "Owners can delete attendance"
ON daily_attendance
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = daily_attendance.tenant_id
        AND utr.role = 'owner'
    )
);

-- =====================================================
-- RLS Policies for overtime_requests
-- =====================================================

-- Policy: Technicians can view their own overtime requests
CREATE POLICY "Technicians can view own overtime requests"
ON overtime_requests
FOR SELECT
TO authenticated
USING (
    technician_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = overtime_requests.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
    OR (status = 'approved' AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = overtime_requests.tenant_id
    ))
);

-- Policy: Technicians can create overtime requests
CREATE POLICY "Technicians can create overtime requests"
ON overtime_requests
FOR INSERT
TO authenticated
WITH CHECK (
    technician_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = overtime_requests.tenant_id
        AND utr.role = 'technician'
    )
);

-- Policy: Technicians can update their own pending requests
CREATE POLICY "Technicians can update own pending requests"
ON overtime_requests
FOR UPDATE
TO authenticated
USING (
    technician_id = auth.uid() 
    AND status = 'pending'
)
WITH CHECK (
    technician_id = auth.uid() 
    AND status = 'pending'
);

-- Policy: Managers can approve/reject overtime requests
CREATE POLICY "Managers can approve/reject overtime"
ON overtime_requests
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = overtime_requests.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = overtime_requests.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
);

-- Policy: Owners can delete overtime requests
CREATE POLICY "Owners can delete overtime requests"
ON overtime_requests
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = overtime_requests.tenant_id
        AND utr.role = 'owner'
    )
);

-- =====================================================
-- RLS Policies for technician_availability
-- =====================================================

-- Policy: All staff can view availability
CREATE POLICY "All staff can view availability"
ON technician_availability
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = technician_availability.tenant_id
    )
);

-- Policy: Technicians can manage their own availability
CREATE POLICY "Technicians can manage own availability"
ON technician_availability
FOR ALL
TO authenticated
USING (
    technician_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = technician_availability.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
)
WITH CHECK (
    technician_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = technician_availability.tenant_id
        AND utr.role IN ('owner', 'tech_head')
    )
);

-- =====================================================
-- RLS Policies for order_status_history
-- =====================================================

-- Policy: All staff can view status history (audit trail)
CREATE POLICY "All staff can view status history"
ON order_status_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = order_status_history.tenant_id
    )
);

-- Note: No INSERT/UPDATE/DELETE policies - only trigger can modify

-- =====================================================
-- RLS Policies for working_hours_config
-- =====================================================

-- Policy: All staff can view working hours config
CREATE POLICY "All staff can view working hours config"
ON working_hours_config
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = working_hours_config.tenant_id
    )
);

-- Policy: Only owner can update working hours config
CREATE POLICY "Owner can update working hours config"
ON working_hours_config
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = working_hours_config.tenant_id
        AND utr.role = 'owner'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_tenant_roles utr
        WHERE utr.user_id = auth.uid()
        AND utr.tenant_id = working_hours_config.tenant_id
        AND utr.role = 'owner'
    )
);
