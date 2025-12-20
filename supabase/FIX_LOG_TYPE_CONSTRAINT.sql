-- Fix log_type constraint - make it nullable and set default
ALTER TABLE technician_work_logs
  ALTER COLUMN log_type DROP NOT NULL,
  ALTER COLUMN log_type SET DEFAULT 'technical_report';

-- Remove the CHECK constraint if it exists
ALTER TABLE technician_work_logs
  DROP CONSTRAINT IF EXISTS technician_work_logs_log_type_check;

-- Recreate constraint to allow NULL
ALTER TABLE technician_work_logs
  ADD CONSTRAINT technician_work_logs_log_type_check 
  CHECK (log_type IS NULL OR log_type IN ('check_in', 'check_out', 'progress_update', 'technical_report', 'issue'));

COMMENT ON COLUMN technician_work_logs.log_type IS 'Type of log entry - defaults to technical_report, can be null';
