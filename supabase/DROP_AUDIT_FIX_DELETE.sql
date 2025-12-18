-- ============================================
-- COMPLETE DELETE - Handle all 10 child tables
-- ============================================

CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Business Rule 1: Don't delete if has service orders
  IF EXISTS (SELECT 1 FROM service_orders WHERE client_id = p_client_id LIMIT 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client has existing service orders');
  END IF;

  -- Business Rule 2: Don't delete if has maintenance contracts
  IF EXISTS (SELECT 1 FROM maintenance_contracts WHERE client_id = p_client_id LIMIT 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client has active maintenance contracts');
  END IF;

  -- Delete all child records (safe to delete these)
  DELETE FROM property_maintenance_schedules WHERE client_id = p_client_id;
  DELETE FROM notifications WHERE client_id = p_client_id;
  DELETE FROM client_portal_sessions WHERE client_id = p_client_id;
  DELETE FROM client_portal_activities WHERE client_id = p_client_id;
  DELETE FROM client_documents WHERE client_id = p_client_id;
  DELETE FROM client_properties WHERE client_id = p_client_id;
  DELETE FROM ac_units WHERE client_id = p_client_id;

  -- Now delete the client
  DELETE FROM clients WHERE id = p_client_id;

  RETURN jsonb_build_object('success', true, 'message', 'Client deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION delete_clients_bulk(p_client_ids UUID[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_success INT := 0;
  v_fail INT := 0;
  v_result jsonb;
BEGIN
  FOREACH v_id IN ARRAY p_client_ids LOOP
    v_result := delete_client_safe(v_id);
    IF (v_result->>'success')::boolean THEN
      v_success := v_success + 1;
    ELSE
      v_fail := v_fail + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success_count', v_success, 'fail_count', v_fail);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_client_safe TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION delete_clients_bulk TO authenticated, anon, service_role;

-- Success! Now refresh browser and test deletion
