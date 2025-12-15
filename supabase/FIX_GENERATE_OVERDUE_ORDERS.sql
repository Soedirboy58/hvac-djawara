-- ============================================
-- FIX: check_and_generate_maintenance_orders()
-- Include OVERDUE schedules, not just upcoming
-- ============================================

-- Problem: Current function only generates orders for:
--   next_scheduled_date <= CURRENT_DATE + days_before_reminder
-- This EXCLUDES overdue schedules (negative days_until)

-- Solution: Change condition to include past dates

CREATE OR REPLACE FUNCTION check_and_generate_maintenance_orders()
RETURNS TABLE (
  schedule_id UUID,
  order_id UUID,
  client_name TEXT,
  property_name TEXT,
  scheduled_date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule RECORD;
  v_order_id UUID;
BEGIN
  -- Find schedules that need order generation
  FOR v_schedule IN
    SELECT 
      pms.*,
      c.name as client_name,
      cp.property_name
    FROM property_maintenance_schedules pms
    JOIN clients c ON c.id = pms.client_id
    JOIN client_properties cp ON cp.id = pms.property_id
    WHERE pms.is_active = TRUE
      AND pms.auto_generate_orders = TRUE
      AND pms.next_scheduled_date IS NOT NULL
      -- CHANGED: Include overdue (past dates) OR upcoming within reminder window
      AND (
        pms.next_scheduled_date < CURRENT_DATE  -- Overdue
        OR pms.next_scheduled_date <= CURRENT_DATE + (pms.days_before_reminder || ' days')::INTERVAL  -- Upcoming
      )
      AND (
        pms.last_order_generated_at IS NULL 
        OR pms.last_generated_date < pms.next_scheduled_date
        OR pms.last_generated_date IS NULL
      )
  LOOP
    BEGIN
      -- Generate order
      v_order_id := auto_generate_maintenance_order(v_schedule.id);
      
      -- Return result
      schedule_id := v_schedule.id;
      order_id := v_order_id;
      client_name := v_schedule.client_name;
      property_name := v_schedule.property_name;
      scheduled_date := v_schedule.next_scheduled_date;
      RETURN NEXT;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to generate order for schedule %: %', v_schedule.id, SQLERRM;
        CONTINUE;
    END;
  END LOOP;
END;
$$;

-- Test: Check which schedules will be selected
SELECT 
  pms.id,
  c.name as client_name,
  cp.property_name,
  pms.next_scheduled_date,
  pms.last_order_generated_at,
  pms.last_generated_date,
  CASE 
    WHEN pms.next_scheduled_date < CURRENT_DATE THEN 'OVERDUE - WILL GENERATE'
    WHEN pms.next_scheduled_date <= CURRENT_DATE + (pms.days_before_reminder || ' days')::INTERVAL THEN 'UPCOMING - WILL GENERATE'
    ELSE 'FUTURE - SKIP'
  END as status
FROM property_maintenance_schedules pms
JOIN clients c ON c.id = pms.client_id
JOIN client_properties cp ON cp.id = pms.property_id
WHERE pms.is_active = TRUE
  AND pms.auto_generate_orders = TRUE
  AND pms.next_scheduled_date IS NOT NULL
ORDER BY pms.next_scheduled_date ASC;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Function check_and_generate_maintenance_orders() Updated!';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Changes:';
  RAISE NOTICE '   - Now includes OVERDUE schedules (past dates)';
  RAISE NOTICE '   - Generates orders for overdue + upcoming within reminder window';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test it:';
  RAISE NOTICE '   SELECT * FROM check_and_generate_maintenance_orders();';
  RAISE NOTICE '';
END $$;
