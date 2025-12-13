-- ============================================
-- Migration: Create Overtime Requests Table
-- Purpose: Approval-based overtime system with workflow
-- Domain: Scheduling & Workforce Management
-- Dependencies: tenants, profiles, service_orders tables
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: CREATE OVERTIME STATUS ENUM
-- ================================================
DO $$ BEGIN
  CREATE TYPE overtime_status AS ENUM (
    'pending',      -- Waiting for approval
    'approved',     -- Approved by admin/coordinator
    'rejected',     -- Rejected by admin/coordinator
    'in_progress',  -- Overtime work in progress
    'completed',    -- Overtime work completed
    'needs_review'  -- Actual hours exceeded estimated (needs review)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE overtime_status IS 
'Overtime request status workflow:
- pending: Request submitted, waiting for approval
- approved: Approved by admin/coordinator, technician can start
- rejected: Request rejected, cannot proceed
- in_progress: Technician has started overtime work
- completed: Overtime work finished, hours calculated
- needs_review: Actual hours exceeded estimated, needs admin review';

RAISE NOTICE '✓ Created overtime_status enum';

-- ================================================
-- SECTION 2: CREATE OVERTIME REQUESTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.overtime_requests (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL, -- Optional
  
  -- Request Phase (by Technician)
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  estimated_start_time TIMESTAMPTZ NOT NULL,
  estimated_end_time TIMESTAMPTZ NOT NULL,
  estimated_hours DECIMAL(5,2), -- Auto-calculated
  
  -- Approval Phase (by Admin/Coordinator)
  status overtime_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Execution Phase (by Technician)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_hours DECIMAL(5,2), -- Auto-calculated
  
  -- Calculation Phase (Auto)
  billable_hours DECIMAL(5,2), -- min(actual_hours, estimated_hours) or needs review
  needs_review BOOLEAN DEFAULT false, -- True if actual > estimated
  
  -- Cost Calculation
  overtime_rate DECIMAL(10,2), -- Rate at time of request (from config)
  total_cost DECIMAL(10,2), -- billable_hours * overtime_rate
  
  -- Notes
  admin_notes TEXT,
  technician_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_estimated_time CHECK (estimated_end_time > estimated_start_time),
  CONSTRAINT valid_actual_time CHECK (
    actual_end_time IS NULL OR actual_start_time IS NULL OR actual_end_time > actual_start_time
  ),
  CONSTRAINT valid_status_flow CHECK (
    (status = 'pending' AND approved_by IS NULL) OR
    (status IN ('approved', 'rejected') AND approved_by IS NOT NULL) OR
    (status IN ('in_progress', 'completed', 'needs_review'))
  ),
  CONSTRAINT rejection_reason_required CHECK (
    status != 'rejected' OR rejection_reason IS NOT NULL
  ),
  CONSTRAINT approval_time_required CHECK (
    status NOT IN ('approved', 'rejected') OR approved_at IS NOT NULL
  )
);

-- ================================================
-- SECTION 3: CREATE INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_overtime_requests_tenant ON public.overtime_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_user ON public.overtime_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_order ON public.overtime_requests(service_order_id) 
  WHERE service_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_overtime_requests_status ON public.overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_date ON public.overtime_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_pending ON public.overtime_requests(status) 
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_overtime_requests_needs_review ON public.overtime_requests(needs_review) 
  WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_overtime_requests_approved_by ON public.overtime_requests(approved_by);

-- ================================================
-- SECTION 4: TRIGGERS
-- ================================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.overtime_requests;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.overtime_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 5: COMMENTS
-- ================================================
COMMENT ON TABLE public.overtime_requests IS 
'Overtime request system with approval workflow.
Flow: Request → Approval → Execute → Calculate
Supports automatic billable hours calculation and review flagging.';

-- Request Phase Comments
COMMENT ON COLUMN public.overtime_requests.request_date IS 
'Date when overtime is requested for (not submission date).';

COMMENT ON COLUMN public.overtime_requests.reason IS 
'Reason for overtime request. Required field for justification.';

COMMENT ON COLUMN public.overtime_requests.estimated_start_time IS 
'Estimated overtime start time (e.g., 17:30 after regular hours).';

COMMENT ON COLUMN public.overtime_requests.estimated_end_time IS 
'Estimated overtime end time (e.g., 19:30).';

COMMENT ON COLUMN public.overtime_requests.estimated_hours IS 
'Auto-calculated: (estimated_end_time - estimated_start_time) in hours.';

-- Approval Phase Comments
COMMENT ON COLUMN public.overtime_requests.status IS 
'Workflow status: pending → approved/rejected → in_progress → completed';

COMMENT ON COLUMN public.overtime_requests.approved_by IS 
'Admin/coordinator who approved or rejected the request.';

COMMENT ON COLUMN public.overtime_requests.approved_at IS 
'Timestamp when request was approved or rejected.';

COMMENT ON COLUMN public.overtime_requests.rejection_reason IS 
'Required if status is rejected. Explains why request was denied.';

-- Execution Phase Comments
COMMENT ON COLUMN public.overtime_requests.actual_start_time IS 
'Actual time when technician clocked in for overtime work.';

COMMENT ON COLUMN public.overtime_requests.actual_end_time IS 
'Actual time when technician clocked out from overtime work.';

COMMENT ON COLUMN public.overtime_requests.actual_hours IS 
'Auto-calculated: (actual_end_time - actual_start_time) in hours.';

-- Calculation Phase Comments
COMMENT ON COLUMN public.overtime_requests.billable_hours IS 
'Billable hours for payment calculation.
- If actual <= estimated: billable = actual
- If actual > estimated: billable = estimated, needs_review = true';

COMMENT ON COLUMN public.overtime_requests.needs_review IS 
'True if actual hours exceeded estimated hours. Requires admin review for additional payment.';

COMMENT ON COLUMN public.overtime_requests.overtime_rate IS 
'Overtime rate at time of request (from working_hours_config). Frozen for this request.';

COMMENT ON COLUMN public.overtime_requests.total_cost IS 
'Total cost: billable_hours × overtime_rate. Auto-calculated.';

RAISE NOTICE '✓ Created overtime_requests table with all constraints';

-- ================================================
-- SECTION 6: VALIDATION
-- ================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  enum_exists BOOLEAN;
  index_count INT;
  constraint_count INT;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'overtime_requests'
  ) INTO table_exists;
  
  ASSERT table_exists, 'overtime_requests table not created';
  
  -- Check enum exists
  SELECT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'overtime_status'
  ) INTO enum_exists;
  
  ASSERT enum_exists, 'overtime_status enum not created';
  
  -- Check indexes created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'overtime_requests';
  
  ASSERT index_count >= 8, 
         'Expected at least 8 indexes, found ' || index_count;
  
  -- Check constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
  AND table_name = 'overtime_requests'
  AND constraint_type = 'CHECK';
  
  ASSERT constraint_count >= 5, 
         'Expected at least 5 check constraints, found ' || constraint_count;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 004: OVERTIME TABLE CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ overtime_status enum created: %', enum_exists;
  RAISE NOTICE '   ✅ overtime_requests table created: %', table_exists;
  RAISE NOTICE '   ✅ Indexes created: %', index_count;
  RAISE NOTICE '   ✅ Check constraints: %', constraint_count;
  RAISE NOTICE '   ✅ RLS enabled';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
