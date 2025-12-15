-- QUICK CHECK: Apa aja maintenance schedule yang ada?
SELECT 
  id,
  (SELECT name FROM clients WHERE id = pms.client_id) as client_name,
  (SELECT property_name FROM client_properties WHERE id = pms.property_id) as property_name,
  frequency,
  next_scheduled_date,
  (next_scheduled_date - CURRENT_DATE) as days_until,
  last_order_generated_at,
  is_active
FROM property_maintenance_schedules pms
WHERE is_active = TRUE
ORDER BY next_scheduled_date ASC;

-- Kalau hanya ada 1 row (Bank Permata), maka memang tidak ada data overdue lain!
-- Solusinya: Buat dummy schedule yang overdue untuk testing
