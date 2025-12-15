-- ============================================
-- CHECK: Kenapa data berbeda di widget vs edit form?
-- ============================================

-- STEP 1: Cek data aktual Bank Permata
SELECT 
  id,
  frequency,
  next_scheduled_date,
  last_order_generated_at,
  last_generated_date,
  custom_interval_days,
  (next_scheduled_date - CURRENT_DATE) as days_until
FROM property_maintenance_schedules
WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- STEP 2: Cek fungsi calculate_next_maintenance_date
-- Test dengan First Date: 20 Oct 2025, Monthly
SELECT calculate_next_maintenance_date(
  '2025-10-20'::DATE,  -- base_date (First Maintenance Date)
  'monthly',           -- frequency
  NULL                 -- custom_interval_days
) as next_from_first;

-- Test dengan Last Generated: 16 Feb 2026, Monthly  
SELECT calculate_next_maintenance_date(
  '2026-02-16'::DATE,  -- base_date (Last Service)
  'monthly',           -- frequency
  NULL                 -- custom_interval_days
) as next_from_last;

-- STEP 3: Cek order yang sudah dibuat
SELECT 
  id,
  order_number,
  scheduled_date,
  status,
  maintenance_schedule_id,
  created_at
FROM service_orders
WHERE maintenance_schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d'
ORDER BY created_at DESC;

-- DIAGNOSTIC
DO $$
DECLARE
  v_schedule RECORD;
BEGIN
  SELECT * INTO v_schedule
  FROM property_maintenance_schedules
  WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSTIC: Data Inconsistency';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Current Data in Database:';
  RAISE NOTICE '   Frequency: %', v_schedule.frequency;
  RAISE NOTICE '   Next Scheduled Date: %', v_schedule.next_scheduled_date;
  RAISE NOTICE '   Last Generated Date: %', v_schedule.last_generated_date;
  RAISE NOTICE '   Last Order Generated: %', v_schedule.last_order_generated_at;
  RAISE NOTICE '';
  
  IF v_schedule.frequency = 'monthly' THEN
    RAISE NOTICE '✅ Frequency is MONTHLY (setiap 1 bulan)';
    RAISE NOTICE '   Expected next from 2026-02-16: 2026-03-16';
    RAISE NOTICE '   Actual next_scheduled_date: %', v_schedule.next_scheduled_date;
    
    IF v_schedule.next_scheduled_date != '2026-03-16' THEN
      RAISE NOTICE '   ❌ MISMATCH! Ada yang salah dengan calculate function';
    END IF;
  ELSIF v_schedule.frequency = 'quarterly' THEN
    RAISE NOTICE '✅ Frequency is QUARTERLY (setiap 3 bulan)';
    RAISE NOTICE '   Expected next from 2026-02-16: 2026-05-16';
    RAISE NOTICE '   Actual next_scheduled_date: %', v_schedule.next_scheduled_date;
  ELSE
    RAISE NOTICE '⚠️ Unknown frequency: %', v_schedule.frequency;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'KESIMPULAN:';
  RAISE NOTICE '   Widget menampilkan: next_scheduled_date dari database';
  RAISE NOTICE '   Edit form menampilkan: hasil calculate ulang?';
  RAISE NOTICE '   Kemungkinan frontend calculate sendiri tidak konsisten dengan backend';
  RAISE NOTICE '';
END $$;
