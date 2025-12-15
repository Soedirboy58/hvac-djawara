-- ============================================
-- DEBUG: Kenapa Semi-Annual jadi Agustus bukan November?
-- ============================================

-- Test calculate function
SELECT 
  '2025-05-20'::DATE as first_date,
  calculate_next_maintenance_date('2025-05-20'::DATE, 'semi_annual', NULL) as next_1,
  calculate_next_maintenance_date(
    calculate_next_maintenance_date('2025-05-20'::DATE, 'semi_annual', NULL),
    'semi_annual', NULL
  ) as next_2,
  calculate_next_maintenance_date(
    calculate_next_maintenance_date(
      calculate_next_maintenance_date('2025-05-20'::DATE, 'semi_annual', NULL),
      'semi_annual', NULL
    ),
    'semi_annual', NULL
  ) as next_3;

-- Expected hasil:
-- first_date: 2025-05-20
-- next_1: 2025-11-20 (+ 6 bulan)
-- next_2: 2026-05-20 (+ 6 bulan lagi)
-- next_3: 2026-11-20 (+ 6 bulan lagi)

-- Check data Bank Permata saat ini
SELECT 
  id,
  frequency,
  next_scheduled_date,
  last_generated_date,
  last_order_generated_at
FROM property_maintenance_schedules
WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';

-- Check orders yang sudah dibuat
SELECT 
  id,
  order_number,
  scheduled_date,
  status,
  created_at
FROM service_orders
WHERE maintenance_schedule_id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d'
ORDER BY scheduled_date ASC;

-- DIAGNOSTIC
DO $$
DECLARE
  v_first DATE := '2025-05-20';
  v_next1 DATE;
  v_next2 DATE;
  v_next3 DATE;
BEGIN
  v_next1 := calculate_next_maintenance_date(v_first, 'semi_annual', NULL);
  v_next2 := calculate_next_maintenance_date(v_next1, 'semi_annual', NULL);
  v_next3 := calculate_next_maintenance_date(v_next2, 'semi_annual', NULL);
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 SEMI-ANNUAL CALCULATION TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'First Date: %', v_first;
  RAISE NOTICE 'Next 1 (expected 2025-11-20): %', v_next1;
  RAISE NOTICE 'Next 2 (expected 2026-05-20): %', v_next2;
  RAISE NOTICE 'Next 3 (expected 2026-11-20): %', v_next3;
  RAISE NOTICE '';
  
  IF v_next1 != '2025-11-20' THEN
    RAISE NOTICE '❌ WRONG! Next 1 should be 2025-11-20 but got %', v_next1;
  END IF;
  
  IF v_next2 != '2026-05-20' THEN
    RAISE NOTICE '❌ WRONG! Next 2 should be 2026-05-20 but got %', v_next2;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'KESIMPULAN:';
  RAISE NOTICE '   Kalau function benar, masalahnya di:';
  RAISE NOTICE '   1. Data initial salah saat create schedule';
  RAISE NOTICE '   2. Manual edit schedule menggunakan tanggal salah';
  RAISE NOTICE '   3. Order pertama dijadwalkan tanggal salah (18 Nov bukan 20 Nov)';
  RAISE NOTICE '';
END $$;

-- FIX: Reset next_scheduled_date ke tanggal yang benar
-- Kalau Last Generated: 2026-02-16, harusnya Next: 2026-08-16 (Semi-Annual)
-- TAPI yang diinginkan user: First 20 Mei → pattern 20 Mei dan 20 November
-- Jadi perlu reset ke 2025-11-20 (periode pertama yang terlewat)

SELECT 
  'Current next_scheduled_date' as label,
  next_scheduled_date,
  'Should be (if from 2026-02-16)' as should_be_label,
  calculate_next_maintenance_date('2026-02-16'::DATE, 'semi_annual', NULL) as should_be_next
FROM property_maintenance_schedules
WHERE id = 'a8f8472e-471a-46f3-a9e6-b19702ad131d';
