-- ============================================
-- FIX v_upcoming_maintenance VIEW
-- Problem: order_exists check fails after next_scheduled_date updates
-- Solution: Check using last_order_generated_at and last_generated_date
-- ============================================

-- Drop existing view first (structure changed)
DROP VIEW IF EXISTS v_upcoming_maintenance CASCADE;

CREATE VIEW v_upcoming_maintenance AS
SELECT 
  pms.id as schedule_id,
  pms.tenant_id,
  pms.client_id,
  c.name as client_name,
  pms.property_id,
  cp.property_name,
  cp.address as property_address,
  pms.frequency,
  pms.next_scheduled_date,
  pms.maintenance_type,
  pms.days_before_reminder,
  pms.is_active,
  pms.last_order_generated_at,
  pms.last_generated_date,
  
  -- Calculate days until next maintenance
  (pms.next_scheduled_date - CURRENT_DATE) as days_until,
  
  -- Check if order already generated for CURRENT cycle
  -- Order exists if last_generated_date matches next_scheduled_date
  -- OR if order was generated within last 3 days
  (
    pms.last_order_generated_at IS NOT NULL 
    AND pms.last_generated_date = pms.next_scheduled_date
  ) as order_exists,
  
  -- Get latest order for this schedule
  (
    SELECT so.id 
    FROM service_orders so
    WHERE so.maintenance_schedule_id = pms.id
      AND so.created_from_schedule = TRUE
    ORDER BY so.created_at DESC
    LIMIT 1
  ) as latest_order_id,
  
  -- Unit count
  CASE 
    WHEN pms.apply_to_all_units THEN 
      (SELECT COUNT(*) FROM ac_units WHERE property_id = pms.property_id)
    ELSE 
      array_length(pms.selected_unit_ids, 1)
  END as unit_count
  
FROM property_maintenance_schedules pms
JOIN clients c ON c.id = pms.client_id
JOIN client_properties cp ON cp.id = pms.property_id
WHERE pms.is_active = TRUE
  AND pms.next_scheduled_date IS NOT NULL
ORDER BY pms.next_scheduled_date ASC;

-- Test query
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  last_generated_date,
  last_order_generated_at,
  days_until,
  order_exists,
  latest_order_id,
  CASE 
    WHEN order_exists THEN '✅ Order Created'
    WHEN days_until < 0 THEN '❌ Overdue - Need Order'
    WHEN days_until <= 7 THEN '⚠️ Urgent - Need Order'
    ELSE '✓ Upcoming'
  END as status
FROM v_upcoming_maintenance
ORDER BY days_until ASC;

-- Verify Bank Permata
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result
  FROM v_upcoming_maintenance
  WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Bank Permata Schedule Status:';
  RAISE NOTICE '   Next Scheduled: %', v_result.next_scheduled_date;
  RAISE NOTICE '   Last Generated: %', v_result.last_generated_date;
  RAISE NOTICE '   Days Until: %', v_result.days_until;
  RAISE NOTICE '   Order Exists: %', v_result.order_exists;
  RAISE NOTICE '   Latest Order ID: %', v_result.latest_order_id;
  RAISE NOTICE '';
  
  IF v_result.order_exists THEN
    RAISE NOTICE '✅ Status: Order Created - Should show "View Order" button';
  ELSIF v_result.days_until < 0 THEN
    RAISE NOTICE '❌ Status: Overdue - Should be in Overdue KPI';
  ELSIF v_result.days_until <= 7 THEN
    RAISE NOTICE '⚠️ Status: Urgent - Should be in Urgent KPI';
  ELSE
    RAISE NOTICE '✓ Status: Upcoming - Should be in Next 30 Days KPI';
  END IF;
  
  RAISE NOTICE '';
END $$;
