-- Check valid enum values
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('order_type', 'order_status', 'priority_level')
ORDER BY t.typname, e.enumsortorder;
