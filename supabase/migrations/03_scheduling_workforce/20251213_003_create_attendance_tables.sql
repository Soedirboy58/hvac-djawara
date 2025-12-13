-- ============================================
-- Migration: Create Attendance & Support Tables
-- Purpose: Daily attendance, availability, status history, working hours config
-- Domain: Scheduling & Workforce Management
-- Dependencies: tenants, profiles, service_orders tables
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: DAILY ATTENDANCE TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.daily_attendance (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Date
  attendance_date DATE NOT NULL,
  
  -- Clock In/Out (raw times from technician)
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  
  -- Work Hours (calculated, for payroll)
  work_start_time TIMESTAMPTZ, -- Always 09:00 if on time, or actual if late
  work_end_time TIMESTAMPTZ,   -- Always 17:00 or actual if early/auto
  total_work_hours DECIMAL(5,2), -- Auto-calculated in hours
  
  -- Status Flags
  is_late BOOLEAN DEFAULT false,
  is_early_leave BOOLEAN DEFAULT false,
  is_auto_checkout BOOLEAN DEFAULT false,
  
  -- Location (optional GPS tracking)
  clock_in_location JSONB, -- {lat, lng, address}
  clock_out_location JSONB,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_date UNIQUE (user_id, attendance_date),
  CONSTRAINT valid_clock_times CHECK (
    clock_out_time IS NULL OR clock_in_time IS NULL OR clock_out_time > clock_in_time
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_attendance_tenant ON public.daily_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_user ON public.daily_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON public.daily_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_user_date ON public.daily_attendance(user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_daily_attendance_late ON public.daily_attendance(is_late) WHERE is_late = true;

-- Trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.daily_attendance;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.daily_attendance IS 
'Daily attendance records for technicians and staff.
Clock in/out times with automatic work hour calculation.
Supports late detection, early leave tracking, and auto clock-out.';

COMMENT ON COLUMN public.daily_attendance.clock_in_time IS 
'Actual time when technician clocks in (raw time from device).';

COMMENT ON COLUMN public.daily_attendance.clock_out_time IS 
'Actual time when technician clocks out. Auto-set to 17:00 if forgot to clock out.';

COMMENT ON COLUMN public.daily_attendance.work_start_time IS 
'Effective work start time for payroll calculation.
- If clock_in <= 09:00 → 09:00 (standard start)
- If clock_in > 09:00 → actual clock_in (late start)';

COMMENT ON COLUMN public.daily_attendance.work_end_time IS 
'Effective work end time for payroll calculation.
- If clock_out >= 17:00 → 17:00 (standard end)
- If clock_out < 17:00 → actual clock_out (early leave)
- If no clock_out → 17:00 (auto clock-out)';

COMMENT ON COLUMN public.daily_attendance.total_work_hours IS 
'Total work hours calculated from work_start_time to work_end_time.
Auto-calculated by trigger. Used for payroll.';

COMMENT ON COLUMN public.daily_attendance.is_late IS 
'True if clock_in_time > 09:00. Auto-calculated by trigger.';

COMMENT ON COLUMN public.daily_attendance.is_early_leave IS 
'True if clock_out_time < 17:00 and not auto. Auto-calculated by trigger.';

COMMENT ON COLUMN public.daily_attendance.is_auto_checkout IS 
'True if clock_out was set automatically because technician forgot. Set by cron job.';

RAISE NOTICE '✓ Created daily_attendance table';

-- ================================================
-- SECTION 2: TECHNICIAN AVAILABILITY TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.technician_availability (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Availability
  availability_date DATE NOT NULL,
  max_jobs INTEGER NOT NULL DEFAULT 4, -- Max jobs per day
  current_jobs INTEGER NOT NULL DEFAULT 0, -- Current assigned jobs
  
  -- Status
  is_available BOOLEAN NOT NULL DEFAULT true,
  unavailable_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_date_availability UNIQUE (user_id, availability_date),
  CONSTRAINT valid_job_counts CHECK (current_jobs >= 0 AND current_jobs <= max_jobs)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tech_availability_tenant ON public.technician_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tech_availability_user ON public.technician_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_tech_availability_date ON public.technician_availability(availability_date);
CREATE INDEX IF NOT EXISTS idx_tech_availability_available ON public.technician_availability(is_available) 
  WHERE is_available = true;

-- Trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.technician_availability;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.technician_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.technician_availability IS 
'Track technician availability per day to prevent overbooking.
Default max jobs per day is 4. Admins can adjust per technician.';

COMMENT ON COLUMN public.technician_availability.max_jobs IS 
'Maximum number of jobs this technician can handle per day. Default is 4.';

COMMENT ON COLUMN public.technician_availability.current_jobs IS 
'Current number of jobs assigned to this technician for this date.
Auto-updated when jobs are assigned/unassigned.';

COMMENT ON COLUMN public.technician_availability.is_available IS 
'False if technician is on leave, sick, or unavailable for any reason.';

RAISE NOTICE '✓ Created technician_availability table';

-- ================================================
-- SECTION 3: ORDER STATUS HISTORY TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  
  -- Status Change
  old_status order_status,
  new_status order_status NOT NULL,
  
  -- Change Info
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Notes
  notes TEXT,
  
  -- Constraints
  CONSTRAINT different_status CHECK (old_status IS NULL OR old_status != new_status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_tenant ON public.order_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(service_order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON public.order_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history(changed_by);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.order_status_history IS 
'Audit trail for all status changes on service orders.
Automatically populated by trigger. No manual insert/update/delete.';

COMMENT ON COLUMN public.order_status_history.old_status IS 
'Previous status before change. NULL for initial status.';

COMMENT ON COLUMN public.order_status_history.new_status IS 
'New status after change.';

COMMENT ON COLUMN public.order_status_history.changed_by IS 
'User who made the status change. NULL if system-initiated.';

RAISE NOTICE '✓ Created order_status_history table';

-- ================================================
-- SECTION 4: WORKING HOURS CONFIG TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.working_hours_config (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Working Hours
  work_start_time TIME NOT NULL DEFAULT '09:00',
  work_end_time TIME NOT NULL DEFAULT '17:00',
  
  -- Overtime Config
  overtime_rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 5000.00, -- Rp 5,000/hour
  max_overtime_hours_per_day DECIMAL(5,2) NOT NULL DEFAULT 4.00, -- 4 hours max
  
  -- Metadata
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tenant_active UNIQUE (tenant_id, is_active),
  CONSTRAINT valid_work_hours CHECK (work_end_time > work_start_time),
  CONSTRAINT valid_overtime_rate CHECK (overtime_rate_per_hour >= 0),
  CONSTRAINT valid_max_overtime CHECK (max_overtime_hours_per_day > 0 AND max_overtime_hours_per_day <= 8)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_tenant ON public.working_hours_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_active ON public.working_hours_config(is_active) 
  WHERE is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.working_hours_config;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.working_hours_config
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.working_hours_config ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE public.working_hours_config IS 
'Per-tenant configuration for working hours and overtime rates.
Only one active config per tenant at a time.';

COMMENT ON COLUMN public.working_hours_config.work_start_time IS 
'Standard work start time. Default is 09:00. Used for attendance calculation.';

COMMENT ON COLUMN public.working_hours_config.work_end_time IS 
'Standard work end time. Default is 17:00. Used for attendance calculation.';

COMMENT ON COLUMN public.working_hours_config.overtime_rate_per_hour IS 
'Overtime payment rate per hour in IDR. Default is Rp 5,000/hour.';

COMMENT ON COLUMN public.working_hours_config.max_overtime_hours_per_day IS 
'Maximum overtime hours allowed per day. Default is 4 hours.';

COMMENT ON COLUMN public.working_hours_config.effective_from IS 
'Date when this configuration becomes effective. For historical tracking.';

COMMENT ON COLUMN public.working_hours_config.is_active IS 
'Only one active config per tenant. Set to false when replaced by new config.';

RAISE NOTICE '✓ Created working_hours_config table';

-- ================================================
-- SECTION 5: VALIDATION
-- ================================================
DO $$
DECLARE
  table_count INT;
  index_count INT;
BEGIN
  -- Check all tables created
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'daily_attendance',
    'technician_availability',
    'order_status_history',
    'working_hours_config'
  );
  
  ASSERT table_count = 4, 
         'Expected 4 tables created, found ' || table_count;
  
  -- Check indexes created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN (
    'daily_attendance',
    'technician_availability',
    'order_status_history',
    'working_hours_config'
  );
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 003: ATTENDANCE TABLES CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Tables created: %', table_count;
  RAISE NOTICE '   ✅ Indexes created: %', index_count;
  RAISE NOTICE '   ✅ RLS enabled on all tables';
  RAISE NOTICE '   ✅ Triggers configured';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
