-- ============================================
-- TEST v_upcoming_maintenance VIEW
-- Cek apakah view mengembalikan data Bank Permata
-- ============================================

-- Test 1: Cek semua data dari view (tanpa filter)
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,
  is_active,
  order_exists,
  unit_count
FROM v_upcoming_maintenance
ORDER BY days_until ASC;

-- Test 2: Cek data dengan filter yang sama seperti API (days_until <= 30)
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,
  is_active,
  order_exists,
  unit_count
FROM v_upcoming_maintenance
WHERE days_until <= 30
ORDER BY days_until ASC;

-- Test 3: Include overdue (negative days_until)
SELECT 
  schedule_id,
  client_name,
  property_name,
  next_scheduled_date,
  days_until,
  CASE 
    WHEN days_until < 0 THEN 'OVERDUE'
    WHEN days_until <= 7 THEN 'URGENT'
    WHEN days_until <= 30 THEN 'UPCOMING'
    ELSE 'FUTURE'
  END as urgency,
  is_active,
  order_exists,
  unit_count
FROM v_upcoming_maintenance
WHERE days_until <= 30 OR days_until < 0  -- Include overdue
ORDER BY days_until ASC;
