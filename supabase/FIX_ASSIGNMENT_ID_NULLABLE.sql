-- Fix nullable constraints for work logs
-- Allow flexibility for completed orders without formal assignments

ALTER TABLE technician_work_logs
ALTER COLUMN assignment_id DROP NOT NULL,
ALTER COLUMN log_type DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN technician_work_logs.assignment_id IS 'Optional reference to technician_assignments. Can be null if order completed without formal assignment.';
COMMENT ON COLUMN technician_work_logs.log_type IS 'Type of log entry - defaults to technical_report';
