-- ============================================
-- SIMPLIFIED FIX - Just create working delete functions
-- ============================================

-- Just fix known FK constraints that we can control
DO $$
BEGIN
  -- Fix contract_requests if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_requests') THEN
    BEGIN
      ALTER TABLE contract_requests DROP CONSTRAINT IF EXISTS contract_requests_client_id_fkey;
      ALTER TABLE contract_requests ADD CONSTRAINT contract_requests_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Fix client_properties if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_properties') THEN
    BEGIN
      ALTER TABLE client_properties DROP CONSTRAINT IF EXISTS client_properties_client_id_fkey;
      ALTER TABLE client_properties ADD CONSTRAINT client_properties_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Fix client_portal_invitations if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_portal_invitations') THEN
    BEGIN
      ALTER TABLE client_portal_invitations DROP CONSTRAINT IF EXISTS client_portal_invitations_client_id_fkey;
      ALTER TABLE client_portal_invitations ADD CONSTRAINT client_portal_invitations_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- Create smart delete function that handles child records manually
CREATE OR REPLACE FUNCTION delete_client_safe(p_client_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_orders BOOLEAN;
BEGIN
  -- Check if client has service orders (these we DON'T want to delete)
  SELECT EXISTS(SELECT 1 FROM service_orders WHERE client_id = p_client_id LIMIT 1) INTO v_has_orders;
  
  IF v_has_orders THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client has existing service orders');
  END IF;

  -- Manually delete child records first
  DELETE FROM contract_requests WHERE client_id = p_client_id;
  DELETE FROM client_properties WHERE client_id = p_client_id;
  DELETE FROM client_portal_invitations WHERE client_id = p_client_id;

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
