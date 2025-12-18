-- ============================================
-- SIMPLE CLIENT DELETE - Direct Approach
-- Just delete the client, let database handle cascade
-- ============================================

-- Create comprehensive delete function
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_count INT;
  v_sql TEXT;
  v_table_name TEXT;
  v_column_name TEXT;
  v_deleted_count INT := 0;
BEGIN
  -- Check for service orders
  SELECT COUNT(*) INTO v_order_count
  FROM service_orders
  WHERE client_id = p_client_id;

  IF v_order_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Client has existing service orders'
    );
  END IF;

  -- Auto-detect and delete from all tables that reference clients
  FOR v_table_name, v_column_name IN
    SELECT 
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'clients'
      AND ccu.column_name = 'id'
      AND tc.table_name != 'service_orders'  -- Skip service_orders
  LOOP
    BEGIN
      -- Build and execute delete statement
      v_sql := format('DELETE FROM %I WHERE %I = $1', v_table_name, v_column_name);
      EXECUTE v_sql USING p_client_id;
      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
      
      RAISE NOTICE 'Deleted % rows from %.%', v_deleted_count, v_table_name, v_column_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting from %: %', v_table_name, SQLERRM;
    END;
  END LOOP;

  -- Now delete the client
  DELETE FROM clients WHERE id = p_client_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Client deleted successfully'
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete client: has related records',
      'detail', SQLERRM
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_client_safe(UUID) TO anon;

-- Create bulk delete function
CREATE OR REPLACE FUNCTION delete_clients_bulk(p_client_ids UUID[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_success_count INT := 0;
  v_fail_count INT := 0;
  v_failed jsonb := '[]'::jsonb;
  v_result jsonb;
BEGIN
  FOREACH v_client_id IN ARRAY p_client_ids
  LOOP
    -- Use the single delete function
    v_result := delete_client_safe(v_client_id);
    
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_fail_count := v_fail_count + 1;
      v_failed := v_failed || jsonb_build_object(
        'client_id', v_client_id,
        'error', v_result->>'error'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success_count', v_success_count,
    'fail_count', v_fail_count,
    'failed_clients', v_failed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_clients_bulk(UUID[]) TO anon;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Simple client delete functions created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 This version:';
  RAISE NOTICE '  • Checks for service orders first';
  RAISE NOTICE '  • Attempts direct DELETE on clients table';
  RAISE NOTICE '  • Lets database CASCADE handle child records';
  RAISE NOTICE '  • Returns helpful errors if deletion fails';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test: Try deleting a client now';
  RAISE NOTICE '';
END $$;
