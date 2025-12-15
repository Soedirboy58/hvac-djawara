-- ============================================
-- FIX: View Logic + Widget Should Show Recently Generated
-- ============================================

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
  
  -- FIXED: Check if order already generated for CURRENT or PREVIOUS cycle
  -- Show as "order_exists" if:
  -- 1. Has generated date AND order created within last 7 days (recently generated)
  -- OR
  -- 2. Has generated date AND next schedule is still upcoming (not yet due for new order)
  (
    pms.last_order_generated_at IS NOT NULL 
    AND (
      -- Recently generated (within 7 days)
      pms.last_order_generated_at >= CURRENT_DATE - INTERVAL '7 days'
      OR
      -- Next schedule not yet due (still more than 7 days away)
      pms.next_scheduled_date > CURRENT_DATE + INTERVAL '7 days'
    )
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

-- Test the fix
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
WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- SUCCESS
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result
  FROM v_upcoming_maintenance
  WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VIEW LOGIC FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Bank Permata Status:';
  RAISE NOTICE '   Order Exists: %', v_result.order_exists;
  RAISE NOTICE '   Days Until Next: %', v_result.days_until;
  RAISE NOTICE '   Last Generated: %', v_result.last_order_generated_at;
  RAISE NOTICE '';
  
  IF v_result.order_exists THEN
    RAISE NOTICE '✅ Widget should show: "Order Created" badge';
  ELSE
    RAISE NOTICE '❌ Still showing "Pending" - check logic';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next Step: Update API endpoint to show recently generated schedules';
  RAISE NOTICE '';
END $$;
