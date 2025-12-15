-- ============================================
-- TEST: Call auto_generate_maintenance_order directly
-- To see the actual error
-- ============================================

-- Try to generate order for overdue Bank Permata schedule
SELECT auto_generate_maintenance_order('a8f8472e-471a-46f3-a9e6-b19702ad131d'::UUID);

-- If error above, check what data is missing:
-- 1. Check AC units
SELECT 
  au.id,
  au.unit_code,
  au.property_id,
  cp.property_name
FROM ac_units au
JOIN client_properties cp ON cp.id = au.property_id
WHERE au.property_id = (
  SELECT property_id 
  FROM property_maintenance_schedules 
  WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d'
);

-- 2. Check schedule full details
SELECT 
  pms.*,
  c.name as client_name,
  cp.property_name
FROM property_maintenance_schedules pms
JOIN clients c ON c.id = pms.client_id  
JOIN client_properties cp ON cp.id = pms.property_id
WHERE pms.id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
