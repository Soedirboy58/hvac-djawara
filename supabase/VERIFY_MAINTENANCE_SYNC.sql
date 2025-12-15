-- ============================================
-- VERIFY MAINTENANCE SCHEDULE SYNC
-- Check if maintenance order is synced with calendar, service_orders, and client data
-- ============================================

-- STEP 1: Check if order was created successfully
SELECT 
  id,
  order_number,
  order_type,
  status,
  service_title,
  scheduled_date,
  client_id,
  maintenance_schedule_id,
  created_from_schedule,
  created_at
FROM service_orders
WHERE id = '27c70a94-e247-4e7b-bf5b-2133c3e27c7e'
   OR maintenance_schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 2: Check maintenance schedule tracking fields
SELECT 
  id,
  client_id,
  property_id,
  frequency,
  next_scheduled_date,
  last_order_generated_at,
  last_generated_date,
  is_active
FROM property_maintenance_schedules
WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 3: Check client data link
SELECT 
  c.id as client_id,
  c.name as client_name,
  cp.id as property_id,
  cp.property_name,
  cp.address,
  pms.id as schedule_id,
  pms.next_scheduled_date,
  so.id as order_id,
  so.order_number,
  so.scheduled_date as order_scheduled_date,
  so.status as order_status
FROM clients c
LEFT JOIN client_properties cp ON cp.client_id = c.id
LEFT JOIN property_maintenance_schedules pms ON pms.property_id = cp.id
LEFT JOIN service_orders so ON so.maintenance_schedule_id = pms.id
WHERE pms.id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 4: Check v_upcoming_maintenance view (after fix)
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
  END as display_status
FROM v_upcoming_maintenance
WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 5: Summary
DO $$
DECLARE
  v_order RECORD;
  v_schedule RECORD;
  v_view RECORD;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM service_orders
  WHERE id = '27c70a94-e247-4e7b-bf5b-2133c3e27c7e';
  
  -- Get schedule
  SELECT * INTO v_schedule
  FROM property_maintenance_schedules
  WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
  
  -- Get view
  SELECT * INTO v_view
  FROM v_upcoming_maintenance
  WHERE schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 MAINTENANCE SYNC STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check order
  IF v_order.id IS NOT NULL THEN
    RAISE NOTICE '✅ SERVICE ORDER EXISTS:';
    RAISE NOTICE '   Order ID: %', v_order.id;
    RAISE NOTICE '   Order Number: %', v_order.order_number;
    RAISE NOTICE '   Status: %', v_order.status;
    RAISE NOTICE '   Scheduled Date: %', v_order.scheduled_date;
    RAISE NOTICE '   Created From Schedule: %', v_order.created_from_schedule;
  ELSE
    RAISE NOTICE '❌ SERVICE ORDER NOT FOUND!';
  END IF;
  
  RAISE NOTICE '';
  
  -- Check schedule tracking
  IF v_schedule.last_order_generated_at IS NOT NULL THEN
    RAISE NOTICE '✅ SCHEDULE TRACKING UPDATED:';
    RAISE NOTICE '   Last Generated: %', v_schedule.last_order_generated_at;
    RAISE NOTICE '   Last Generated Date: %', v_schedule.last_generated_date;
    RAISE NOTICE '   Next Scheduled: %', v_schedule.next_scheduled_date;
  ELSE
    RAISE NOTICE '❌ SCHEDULE TRACKING NOT UPDATED!';
    RAISE NOTICE '   This means auto_generate_maintenance_order() did not update tracking fields';
  END IF;
  
  RAISE NOTICE '';
  
  -- Check view
  IF v_view.schedule_id IS NOT NULL THEN
    RAISE NOTICE '✅ VIEW DATA:';
    RAISE NOTICE '   Order Exists: %', v_view.order_exists;
    RAISE NOTICE '   Days Until: %', v_view.days_until;
    RAISE NOTICE '   Latest Order ID: %', v_view.latest_order_id;
    
    IF v_view.order_exists THEN
      RAISE NOTICE '   ✅ Widget should show: Order Created badge + View Order button';
    ELSE
      RAISE NOTICE '   ⚠️ Widget shows: Pending badge + Create Order button';
      RAISE NOTICE '   This means order_exists check is failing!';
    END IF;
  ELSE
    RAISE NOTICE '❌ SCHEDULE NOT FOUND IN VIEW!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 SYNC STATUS SUMMARY:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  IF v_order.id IS NOT NULL AND v_schedule.last_order_generated_at IS NOT NULL AND v_view.order_exists THEN
    RAISE NOTICE '✅ FULLY SYNCED - All systems connected!';
    RAISE NOTICE '   - Service Order: Created';
    RAISE NOTICE '   - Schedule Tracking: Updated';
    RAISE NOTICE '   - Widget Display: Correct';
    RAISE NOTICE '   - Calendar View: Should show order';
  ELSIF v_order.id IS NOT NULL AND v_schedule.last_order_generated_at IS NOT NULL THEN
    RAISE NOTICE '⚠️ PARTIALLY SYNCED - View needs refresh';
    RAISE NOTICE '   - Service Order: ✅ Created';
    RAISE NOTICE '   - Schedule Tracking: ✅ Updated';
    RAISE NOTICE '   - Widget Display: ❌ Not showing order_exists=true';
    RAISE NOTICE '';
    RAISE NOTICE '   ACTION REQUIRED:';
    RAISE NOTICE '   1. Execute FIX_UPCOMING_MAINTENANCE_VIEW.sql';
    RAISE NOTICE '   2. Refresh browser (Ctrl+Shift+R)';
  ELSIF v_order.id IS NOT NULL THEN
    RAISE NOTICE '⚠️ ORDER CREATED BUT TRACKING NOT UPDATED';
    RAISE NOTICE '   - Service Order: ✅ Created';
    RAISE NOTICE '   - Schedule Tracking: ❌ Not updated';
    RAISE NOTICE '';
    RAISE NOTICE '   This means auto_generate_maintenance_order() is missing UPDATE statement';
  ELSE
    RAISE NOTICE '❌ NOT SYNCED - Order not found';
    RAISE NOTICE '   Need to run auto_generate_maintenance_order() again';
  END IF;
  
  RAISE NOTICE '';
  
END $$;
