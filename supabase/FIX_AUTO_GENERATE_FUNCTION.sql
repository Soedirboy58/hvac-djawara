-- ============================================
-- FIX: auto_generate_maintenance_order()
-- Remove non-existent 'title' column
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_maintenance_order(
  p_schedule_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_schedule RECORD;
  v_order_id UUID;
  v_unit_ids UUID[];
  v_unit_count INT;
BEGIN
  -- Get schedule details
  SELECT * INTO v_schedule
  FROM property_maintenance_schedules
  WHERE id = p_schedule_id
    AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or inactive';
  END IF;
  
  -- Determine which units to include
  IF v_schedule.apply_to_all_units THEN
    SELECT array_agg(id) INTO v_unit_ids
    FROM ac_units
    WHERE property_id = v_schedule.property_id;
  ELSE
    v_unit_ids := v_schedule.selected_unit_ids;
  END IF;
  
  v_unit_count := array_length(v_unit_ids, 1);
  
  -- Create service order with correct column names and enum values
  INSERT INTO service_orders (
    tenant_id,
    client_id,
    order_type,
    status,
    scheduled_date,
    service_title,
    service_description,
    location_address,
    priority,
    estimated_duration,
    created_from_schedule,
    maintenance_schedule_id
  ) VALUES (
    v_schedule.tenant_id,
    v_schedule.client_id,
    'maintenance',  -- Changed from 'perawatan' to valid enum 'maintenance'
    'scheduled',     -- Changed from 'pending' to 'scheduled' for better status
    v_schedule.next_scheduled_date,
    'Scheduled Maintenance - ' || (SELECT property_name FROM client_properties WHERE id = v_schedule.property_id),
    'Auto-generated from maintenance schedule.' || E'\n' ||
    COALESCE(v_schedule.special_instructions, '') || E'\n' ||
    'Frequency: ' || v_schedule.frequency || E'\n' ||
    'Units: ' || COALESCE(v_unit_count::TEXT, '0') || ' AC units',
    COALESCE((SELECT address FROM client_properties WHERE id = v_schedule.property_id), 'No address'),
    'medium',
    CASE 
      WHEN v_unit_count <= 5 THEN 2
      WHEN v_unit_count <= 10 THEN 4
      WHEN v_unit_count <= 20 THEN 6
      ELSE 8
    END,
    TRUE,
    p_schedule_id
  ) RETURNING id INTO v_order_id;
  
  -- Link AC units to order
  IF v_unit_ids IS NOT NULL AND array_length(v_unit_ids, 1) > 0 THEN
    INSERT INTO service_order_units (service_order_id, ac_unit_id)
    SELECT v_order_id, unnest(v_unit_ids);
  END IF;
  
  -- Update schedule tracking
  UPDATE property_maintenance_schedules
  SET 
    last_order_generated_at = NOW(),
    last_generated_date = v_schedule.next_scheduled_date,
    next_scheduled_date = calculate_next_maintenance_date(
      v_schedule.next_scheduled_date,
      v_schedule.frequency,
      v_schedule.custom_interval_days
    ),
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  RETURN v_order_id;
END;
$$;

-- ================================================
-- Test the fixed function
-- ================================================

SELECT auto_generate_maintenance_order('a8f8472e-471a-46f3-a9e6-b19702ad131d'::UUID);

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Function auto_generate_maintenance_order() Fixed!';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Changes:';
  RAISE NOTICE '   - Removed non-existent "title" column from INSERT';
  RAISE NOTICE '   - Description now includes property name';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test it:';
  RAISE NOTICE '   SELECT * FROM check_and_generate_maintenance_orders();';
  RAISE NOTICE '';
END $$;
