-- Add check-in and check-out columns to technician_work_logs
-- This fixes PGRST204 error: "Could not find the 'check_in_time' column"

-- Add check-in/check-out timestamp columns
ALTER TABLE technician_work_logs
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN technician_work_logs.check_in_time IS 'Timestamp when technician checked in to start work';
COMMENT ON COLUMN technician_work_logs.check_out_time IS 'Timestamp when technician checked out after completing work';
COMMENT ON COLUMN technician_work_logs.notes IS 'General notes or comments from technician';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_logs_check_in ON technician_work_logs(check_in_time);
CREATE INDEX IF NOT EXISTS idx_work_logs_check_out ON technician_work_logs(check_out_time);
CREATE INDEX IF NOT EXISTS idx_work_logs_service_order ON technician_work_logs(service_order_id);

-- Update existing records that used timestamp as check_in_time (optional migration)
-- Uncomment if you want to migrate existing data:
-- UPDATE technician_work_logs 
-- SET check_in_time = timestamp 
-- WHERE check_in_time IS NULL AND log_type = 'check_in';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'technician_work_logs'
  AND column_name IN ('check_in_time', 'check_out_time', 'notes', 'service_order_id')
ORDER BY ordinal_position;
