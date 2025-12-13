-- Migration: Create overtime_requests table
-- Description: Table for tracking overtime requests with approval workflow

CREATE TABLE IF NOT EXISTS overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
    request_date DATE NOT NULL,
    reason TEXT NOT NULL,
    estimated_start_time TIME NOT NULL,
    estimated_end_time TIME NOT NULL,
    estimated_hours DECIMAL(5, 2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_hours DECIMAL(5, 2),
    billable_hours DECIMAL(5, 2),
    needs_review BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments for overtime_requests
COMMENT ON TABLE overtime_requests IS 'Overtime requests from technicians with approval workflow';
COMMENT ON COLUMN overtime_requests.job_id IS 'Related service order if overtime is for a specific job';
COMMENT ON COLUMN overtime_requests.request_date IS 'Date when overtime will be performed';
COMMENT ON COLUMN overtime_requests.estimated_start_time IS 'Estimated overtime start time';
COMMENT ON COLUMN overtime_requests.estimated_end_time IS 'Estimated overtime end time';
COMMENT ON COLUMN overtime_requests.estimated_hours IS 'Calculated estimated overtime hours';
COMMENT ON COLUMN overtime_requests.status IS 'Approval status: pending, approved, rejected, completed';
COMMENT ON COLUMN overtime_requests.approved_by IS 'Manager/coordinator who approved the request';
COMMENT ON COLUMN overtime_requests.actual_start_time IS 'Actual time when overtime started';
COMMENT ON COLUMN overtime_requests.actual_end_time IS 'Actual time when overtime ended';
COMMENT ON COLUMN overtime_requests.actual_hours IS 'Actual overtime hours worked';
COMMENT ON COLUMN overtime_requests.billable_hours IS 'Billable hours (minimum of actual vs estimated)';
COMMENT ON COLUMN overtime_requests.needs_review IS 'Flag if actual hours exceed estimated hours';

-- Indexes for overtime_requests
CREATE INDEX IF NOT EXISTS idx_overtime_requests_tenant_id ON overtime_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_technician_id ON overtime_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_job_id ON overtime_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_request_date ON overtime_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_status ON overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_needs_review ON overtime_requests(needs_review) WHERE needs_review = true;

-- Enable RLS
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
