-- Add columns for conditional form data in technician_work_logs
-- This supports dynamic forms based on work type

-- Add work_type column
ALTER TABLE technician_work_logs
  ADD COLUMN IF NOT EXISTS work_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS check_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ac_units_data JSONB,
  ADD COLUMN IF NOT EXISTS maintenance_units_data JSONB;

-- Add comments
COMMENT ON COLUMN technician_work_logs.work_type IS 'Type of work: pengecekan, pemeliharaan, troubleshooting, instalasi, lain-lain';
COMMENT ON COLUMN technician_work_logs.check_type IS 'For pengecekan: survey or performa';
COMMENT ON COLUMN technician_work_logs.ac_units_data IS 'JSON array of AC unit performance data (for pengecekan performa)';
COMMENT ON COLUMN technician_work_logs.maintenance_units_data IS 'JSON array of maintenance unit data (for pemeliharaan)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_logs_work_type ON technician_work_logs(work_type);

-- Verify
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'technician_work_logs'
  AND column_name IN ('work_type', 'check_type', 'ac_units_data', 'maintenance_units_data')
ORDER BY ordinal_position;
