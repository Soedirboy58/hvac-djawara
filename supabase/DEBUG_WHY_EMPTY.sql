-- ============================================
-- DEBUG: Why widget shows empty?
-- ============================================

-- STEP 1: Check if view exists and has data
SELECT COUNT(*) as total_schedules
FROM v_upcoming_maintenance;

-- STEP 2: Check Bank Permata specifically
SELECT *
FROM v_upcoming_maintenance
WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 3: Check all schedules (without filter)
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,
  order_exists,
  last_order_generated_at,
  last_generated_date
FROM v_upcoming_maintenance
ORDER BY days_until ASC;

-- STEP 4: Check raw table data
SELECT 
  id,
  client_id,
  property_id,
  frequency,
  next_scheduled_date,
  last_order_generated_at,
  last_generated_date,
  is_active,
  (next_scheduled_date - CURRENT_DATE) as days_until_raw
FROM property_maintenance_schedules
WHERE is_active = TRUE
ORDER BY next_scheduled_date ASC;

-- STEP 5: Test order_exists logic manually
SELECT 
  pms.id,
  pms.next_scheduled_date,
  pms.last_generated_date,
  pms.last_order_generated_at,
  (pms.last_order_generated_at IS NOT NULL AND pms.last_generated_date = pms.next_scheduled_date) as should_be_order_exists,
  EXISTS(
    SELECT 1 FROM service_orders so
    WHERE so.maintenance_schedule_id = pms.id
      AND so.created_from_schedule = TRUE
  ) as has_any_orders
FROM property_maintenance_schedules pms
WHERE pms.id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 6: Debug message
DO $$
DECLARE
  v_count INT;
  v_bank_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v_upcoming_maintenance;
  SELECT EXISTS(
    SELECT 1 FROM v_upcoming_maintenance 
    WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d'
  ) INTO v_bank_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DEBUG EMPTY WIDGET';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total schedules in view: %', v_count;
  RAISE NOTICE 'Bank Permata in view: %', v_bank_exists;
  RAISE NOTICE '';
  
  IF v_count = 0 THEN
    RAISE NOTICE '❌ VIEW IS EMPTY!';
    RAISE NOTICE '   Possible causes:';
    RAISE NOTICE '   1. View was not created (DROP failed silently)';
    RAISE NOTICE '   2. View has wrong JOIN conditions';
    RAISE NOTICE '   3. RLS policies blocking data';
    RAISE NOTICE '   4. No active schedules in property_maintenance_schedules';
  ELSIF NOT v_bank_exists THEN
    RAISE NOTICE '⚠️ VIEW HAS DATA BUT BANK PERMATA MISSING';
    RAISE NOTICE '   Check STEP 3 results to see what schedules exist';
  ELSE
    RAISE NOTICE '✅ VIEW HAS DATA INCLUDING BANK PERMATA';
    RAISE NOTICE '   Widget should show data - check API endpoint or frontend';
  END IF;
  
  RAISE NOTICE '';
END $$;
