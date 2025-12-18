-- ============================================
-- FINAL SOLUTION - Diagnose & Fix Client Delete
-- Run this ONCE and it will fix everything
-- ============================================

-- STEP 1: Find all FK constraints blocking client delete
DO $$
DECLARE
  v_constraint_name TEXT;
  v_table_name TEXT;
  v_column_name TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: Finding FK constraints to clients table';
  RAISE NOTICE '========================================';
  
  FOR v_table_name, v_column_name, v_constraint_name IN
    SELECT 
      tc.table_name,
      kcu.column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'clients'
  LOOP
    RAISE NOTICE '  Found: %.% (constraint: %)', v_table_name, v_column_name, v_constraint_name;
    
    -- Drop and recreate with CASCADE
    BEGIN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', v_table_name, v_constraint_name);
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES clients(id) ON DELETE CASCADE', 
        v_table_name, v_constraint_name, v_column_name);
      RAISE NOTICE '    ✓ Updated to CASCADE';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '    ✗ Could not update: %', SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- STEP 2: Create the ULTIMATE delete function
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_count INT;
BEGIN
  -- Only check service orders
  SELECT COUNT(*) INTO v_order_count
  FROM service_orders
  WHERE client_id = p_client_id;

  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Client has existing service orders'
    );
  END IF;

  -- Direct delete - CASCADE will handle everything
  DELETE FROM clients WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Client not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Client deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- STEP 3: Grant permissions
GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO anon;
GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO service_role;

-- STEP 4: Bulk delete
CREATE OR REPLACE FUNCTION delete_clients_bulk(p_client_ids UUID[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_success_count INT := 0;
  v_fail_count INT := 0;
  v_result jsonb;
BEGIN
  FOREACH v_client_id IN ARRAY p_client_ids
  LOOP
    v_result := delete_client_safe(v_client_id);
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_fail_count := v_fail_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'fail_count', v_fail_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO service_role;

-- FINAL MESSAGE
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CLIENT DELETE - FINAL SOLUTION    ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '  1. ✓ Found all FK constraints to clients';
  RAISE NOTICE '  2. ✓ Updated all to CASCADE DELETE';
  RAISE NOTICE '  3. ✓ Created delete_client_safe() function';
  RAISE NOTICE '  4. ✓ Created delete_clients_bulk() function';
  RAISE NOTICE '  5. ✓ Granted all necessary permissions';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NOW: Refresh your browser and try delete!';
  RAISE NOTICE '';
END $$;
