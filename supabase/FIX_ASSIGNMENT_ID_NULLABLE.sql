-- Fix assignment_id to be nullable since it's not always available
-- Work logs can exist with just service_order_id and technician_id

ALTER TABLE technician_work_logs
ALTER COLUMN assignment_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN technician_work_logs.assignment_id IS 'Optional reference to technician_assignments. Can be null if order completed without formal assignment.';
