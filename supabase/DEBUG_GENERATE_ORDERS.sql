-- ============================================
-- DEBUG: Why Generate Orders Return 0
-- Check all conditions that might block generation
-- ============================================

-- ================================================
-- STEP 1: Check Bank Permata schedule details
-- ================================================

SELECT 
  pms.id as schedule_id,
  c.name as client_name,
  cp.property_name,
  pms.next_scheduled_date,
  pms.is_active,
  pms.auto_generate_orders,
  pms.last_order_generated_at,
  pms.last_generated_date,
  pms.days_before_reminder,
  -- Check each condition
  CASE WHEN pms.is_active = TRUE THEN '✓' ELSE '✗' END as "active?",
  CASE WHEN pms.auto_generate_orders = TRUE THEN '✓' ELSE '✗' END as "auto_gen?",
  CASE WHEN pms.next_scheduled_date IS NOT NULL THEN '✓' ELSE '✗' END as "has_date?",
  CASE WHEN pms.next_scheduled_date < CURRENT_DATE THEN '✓ OVERDUE' 
       WHEN pms.next_scheduled_date <= CURRENT_DATE + (pms.days_before_reminder || ' days')::INTERVAL THEN '✓ UPCOMING'
       ELSE '✗ TOO FAR' END as "date_check?",
  CASE WHEN pms.last_order_generated_at IS NULL THEN '✓ NULL'
       WHEN pms.last_generated_date < pms.next_scheduled_date THEN '✓ OLDER'
       WHEN pms.last_generated_date IS NULL THEN '✓ NULL'
       ELSE '✗ ALREADY GENERATED' END as "tracking_check?"
FROM property_maintenance_schedules pms
JOIN clients c ON c.id = pms.client_id
JOIN client_properties cp ON cp.id = pms.property_id
WHERE c.name ILIKE '%permata%'
ORDER BY pms.next_scheduled_date ASC;

-- ================================================
-- STEP 2: Test function directly
-- ================================================

SELECT * FROM check_and_generate_maintenance_orders();

-- ================================================
-- STEP 3: Check if service orders already exist
-- ================================================

SELECT 
  so.id,
  so.order_number,
  so.scheduled_date,
  so.status,
  so.maintenance_schedule_id,
  so.created_from_schedule,
  so.created_at
FROM service_orders so
WHERE so.maintenance_schedule_id IN (
  SELECT id FROM property_maintenance_schedules 
  WHERE client_id IN (SELECT id FROM clients WHERE name ILIKE '%permata%')
)
ORDER BY so.created_at DESC;

-- ================================================
-- STEP 4: Force reset tracking (if needed)
-- ================================================

-- UNCOMMENT THIS IF YOU WANT TO FORCE REGENERATE:
-- UPDATE property_maintenance_schedules
-- SET 
--   last_order_generated_at = NULL,
--   last_generated_date = NULL
-- WHERE client_id IN (SELECT id FROM clients WHERE name ILIKE '%permata%')
-- RETURNING id, 
--   (SELECT name FROM clients WHERE id = client_id) as client_name,
--   last_order_generated_at,
--   last_generated_date;

-- ================================================
-- STEP 5: Check function source code
-- ================================================

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'check_and_generate_maintenance_orders';
