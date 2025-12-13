-- Migration: Create attendance and availability tables
-- Description: Tables for tracking daily attendance, availability, status history, and working hours config

-- A. Daily Attendance Table
CREATE TABLE IF NOT EXISTS daily_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    work_start_time TIMESTAMPTZ,
    work_end_time TIMESTAMPTZ,
    total_work_hours DECIMAL(5, 2),
    is_late BOOLEAN DEFAULT false,
    is_early_leave BOOLEAN DEFAULT false,
    is_auto_checkout BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, technician_id, date)
);

-- Comments for daily_attendance
COMMENT ON TABLE daily_attendance IS 'Daily attendance records for technicians';
COMMENT ON COLUMN daily_attendance.clock_in_time IS 'When technician clocked in';
COMMENT ON COLUMN daily_attendance.clock_out_time IS 'When technician clocked out';
COMMENT ON COLUMN daily_attendance.work_start_time IS 'Calculated work start time (09:00 or actual if late)';
COMMENT ON COLUMN daily_attendance.work_end_time IS 'Calculated work end time (17:00 or actual if early)';
COMMENT ON COLUMN daily_attendance.total_work_hours IS 'Total working hours for the day';
COMMENT ON COLUMN daily_attendance.is_late IS 'Flag if technician clocked in after 09:00';
COMMENT ON COLUMN daily_attendance.is_early_leave IS 'Flag if technician left before 17:00';
COMMENT ON COLUMN daily_attendance.is_auto_checkout IS 'Flag if system auto-checked out';

-- Indexes for daily_attendance
CREATE INDEX IF NOT EXISTS idx_daily_attendance_tenant_id ON daily_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_technician_id ON daily_attendance(technician_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance(date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_tenant_tech_date ON daily_attendance(tenant_id, technician_id, date);

-- Enable RLS
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;

-- B. Technician Availability Table
CREATE TABLE IF NOT EXISTS technician_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT true,
    max_jobs_per_day INTEGER DEFAULT 4,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, technician_id, date)
);

-- Comments for technician_availability
COMMENT ON TABLE technician_availability IS 'Technician availability and capacity settings per day';
COMMENT ON COLUMN technician_availability.is_available IS 'Whether technician is available for work';
COMMENT ON COLUMN technician_availability.max_jobs_per_day IS 'Maximum number of jobs technician can handle per day';
COMMENT ON COLUMN technician_availability.reason IS 'Reason if unavailable (sick, leave, etc)';

-- Indexes for technician_availability
CREATE INDEX IF NOT EXISTS idx_technician_availability_tenant_id ON technician_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_technician_availability_technician_id ON technician_availability(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_availability_date ON technician_availability(date);
CREATE INDEX IF NOT EXISTS idx_technician_availability_available ON technician_availability(is_available);

-- Enable RLS
ALTER TABLE technician_availability ENABLE ROW LEVEL SECURITY;

-- C. Order Status History Table
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    changed_by_role user_role,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments for order_status_history
COMMENT ON TABLE order_status_history IS 'Audit trail for service order status changes';
COMMENT ON COLUMN order_status_history.old_status IS 'Previous status before change';
COMMENT ON COLUMN order_status_history.new_status IS 'New status after change';
COMMENT ON COLUMN order_status_history.changed_by IS 'User who made the status change';
COMMENT ON COLUMN order_status_history.changed_by_role IS 'Role of user who made the change';

-- Indexes for order_status_history
CREATE INDEX IF NOT EXISTS idx_order_status_history_tenant_id ON order_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- Enable RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- D. Working Hours Config Table
CREATE TABLE IF NOT EXISTS working_hours_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '17:00:00',
    overtime_rate_per_hour DECIMAL(10, 2) DEFAULT 5000.00,
    max_overtime_hours_per_day INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments for working_hours_config
COMMENT ON TABLE working_hours_config IS 'Working hours configuration per tenant';
COMMENT ON COLUMN working_hours_config.work_start_time IS 'Standard work start time';
COMMENT ON COLUMN working_hours_config.work_end_time IS 'Standard work end time';
COMMENT ON COLUMN working_hours_config.overtime_rate_per_hour IS 'Overtime rate in Rupiah per hour';
COMMENT ON COLUMN working_hours_config.max_overtime_hours_per_day IS 'Maximum overtime hours allowed per day';

-- Indexes for working_hours_config
CREATE INDEX IF NOT EXISTS idx_working_hours_config_tenant_id ON working_hours_config(tenant_id);

-- Enable RLS
ALTER TABLE working_hours_config ENABLE ROW LEVEL SECURITY;
