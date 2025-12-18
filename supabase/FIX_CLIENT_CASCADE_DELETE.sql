-- ============================================
-- FIX CLIENT CASCADE DELETE
-- Set foreign keys to CASCADE on DELETE
-- ============================================

-- Drop existing foreign key constraints and recreate with CASCADE

-- Fix client_audit_log
ALTER TABLE client_audit_log 
  DROP CONSTRAINT IF EXISTS client_audit_log_client_id_fkey;

ALTER TABLE client_audit_log
  ADD CONSTRAINT client_audit_log_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- Fix client_portal_invitations
ALTER TABLE client_portal_invitations 
  DROP CONSTRAINT IF EXISTS client_portal_invitations_client_id_fkey;

ALTER TABLE client_portal_invitations
  ADD CONSTRAINT client_portal_invitations_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- Fix client_properties
ALTER TABLE client_properties 
  DROP CONSTRAINT IF EXISTS client_properties_client_id_fkey;

ALTER TABLE client_properties
  ADD CONSTRAINT client_properties_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- Fix service_orders (SET NULL instead of CASCADE to preserve order history)
ALTER TABLE service_orders 
  DROP CONSTRAINT IF EXISTS service_orders_client_id_fkey;

ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE RESTRICT;  -- Prevent delete if has orders

-- Fix contract_requests
ALTER TABLE contract_requests 
  DROP CONSTRAINT IF EXISTS contract_requests_client_id_fkey;

ALTER TABLE contract_requests
  ADD CONSTRAINT contract_requests_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ Client cascade delete constraints updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign keys updated:';
  RAISE NOTICE '  ✓ client_audit_log - CASCADE DELETE';
  RAISE NOTICE '  ✓ client_portal_invitations - CASCADE DELETE';
  RAISE NOTICE '  ✓ client_properties - CASCADE DELETE';
  RAISE NOTICE '  ✓ contract_requests - CASCADE DELETE';
  RAISE NOTICE '  ✓ service_orders - RESTRICT (cannot delete if has orders)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Clients with service orders CANNOT be deleted to preserve data integrity';
END $$;
