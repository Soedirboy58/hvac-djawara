-- Check actual service_orders table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'service_orders'
ORDER BY ordinal_position;
