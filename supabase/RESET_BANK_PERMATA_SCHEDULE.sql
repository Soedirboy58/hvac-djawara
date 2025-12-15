-- ============================================
-- QUICK FIX: Reset Bank Permata Schedule + Clean Orders
-- ============================================

-- STEP 1: Delete orders dengan tanggal salah
DELETE FROM service_orders
WHERE maintenance_schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 2: Reset schedule ke pattern yang benar
-- First: 20 Mei 2025, Semi-Annual
-- Timeline: 20 Mei → 20 November → 20 Mei (dst)
-- Sekarang 15 Des 2025, jadi periode 20 November sudah lewat (OVERDUE 25 hari)

UPDATE property_maintenance_schedules
SET 
  next_scheduled_date = '2025-11-20',  -- Periode yang terlewat
  last_generated_date = NULL,           -- Reset tracking
  last_order_generated_at = NULL,
  updated_at = NOW()
WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- VERIFY
SELECT 
  id,
  frequency,
  next_scheduled_date,
  (next_scheduled_date - CURRENT_DATE) as days_until,
  last_generated_date,
  last_order_generated_at
FROM property_maintenance_schedules
WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- Check orders (should be empty)
SELECT COUNT(*) as order_count
FROM service_orders
WHERE maintenance_schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- SUCCESS
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SCHEDULE RESET COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'Bank Permata Purbalingga:';
  RAISE NOTICE '   Pattern: 20 Mei dan 20 November (Semi-Annual)';
  RAISE NOTICE '   Next Scheduled: 2025-11-20';
  RAISE NOTICE '   Days Until: -25 (OVERDUE 25 hari)';
  RAISE NOTICE '';
  RAISE NOTICE 'Widget should now show:';
  RAISE NOTICE '   Overdue: 1 (Bank Permata - lewat 25 hari)';
  RAISE NOTICE '   Status: Pending (belum ada order)';
  RAISE NOTICE '   Button: Create Order';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Action: Refresh browser and click "Create Order"';
  RAISE NOTICE '';
END $$;
