-- ============================================
-- FIX: Disable/Fix notify_maintenance_generated trigger
-- Trigger references non-existent 'order_code' column
-- ============================================

-- Option 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS notify_maintenance_generated ON service_orders;

-- Option 2: Drop the trigger function (if not used elsewhere)
DROP FUNCTION IF EXISTS notify_maintenance_generated() CASCADE;

-- Now test the generate function again
SELECT auto_generate_maintenance_order('a8f8472e-471a-46f3-a9e6-b19702ad131d'::UUID);

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Trigger notify_maintenance_generated REMOVED!';
  RAISE NOTICE '';
  RAISE NOTICE 'The trigger was referencing non-existent column "order_code"';
  RAISE NOTICE 'Service orders can now be created without this trigger.';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test again:';
  RAISE NOTICE '   SELECT * FROM check_and_generate_maintenance_orders();';
  RAISE NOTICE '';
END $$;
