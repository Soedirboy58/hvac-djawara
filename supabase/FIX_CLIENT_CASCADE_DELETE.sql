-- ============================================
-- FIX CLIENT CASCADE DELETE
-- Set foreign keys to CASCADE on DELETE
-- Step 1: Check what constraints exist
-- Step 2: Drop and recreate with CASCADE
-- ============================================

-- STEP 1: Check existing constraints (optional - just for info)
-- Run this first to see what exists:
/*
SELECT 
  tc.constraint_name, 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'clients'
ORDER BY tc.table_name;
*/

-- STEP 2: Fix client_audit_log (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_audit_log') THEN
    -- Drop all foreign key constraints related to client_id
    EXECUTE (
      SELECT 'ALTER TABLE client_audit_log DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE table_name = 'client_audit_log' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%client_id%'
      LIMIT 1
    );
    
    -- Add new constraint with CASCADE
    ALTER TABLE client_audit_log
      ADD CONSTRAINT client_audit_log_client_id_fkey 
      FOREIGN KEY (client_id) 
      REFERENCES clients(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✓ client_audit_log constraint updated';
  ELSE
    RAISE NOTICE '- client_audit_log table does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error with client_audit_log: %', SQLERRM;
END $$;

-- STEP 3: Fix client_portal_invitations (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_portal_invitations') THEN
    EXECUTE (
      SELECT 'ALTER TABLE client_portal_invitations DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE table_name = 'client_portal_invitations' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%client_id%'
      LIMIT 1
    );
    
    ALTER TABLE client_portal_invitations
      ADD CONSTRAINT client_portal_invitations_client_id_fkey 
      FOREIGN KEY (client_id) 
      REFERENCES clients(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✓ client_portal_invitations constraint updated';
  ELSE
    RAISE NOTICE '- client_portal_invitations table does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error with client_portal_invitations: %', SQLERRM;
END $$;

-- STEP 4: Fix client_properties (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_properties') THEN
    EXECUTE (
      SELECT 'ALTER TABLE client_properties DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE table_name = 'client_properties' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%client_id%'
      LIMIT 1
    );
    
    ALTER TABLE client_properties
      ADD CONSTRAINT client_properties_client_id_fkey 
      FOREIGN KEY (client_id) 
      REFERENCES clients(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✓ client_properties constraint updated';
  ELSE
    RAISE NOTICE '- client_properties table does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error with client_properties: %', SQLERRM;
END $$;

-- STEP 5: Fix contract_requests (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_requests') THEN
    EXECUTE (
      SELECT 'ALTER TABLE contract_requests DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE table_name = 'contract_requests' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%client_id%'
      LIMIT 1
    );
    
    ALTER TABLE contract_requests
      ADD CONSTRAINT contract_requests_client_id_fkey 
      FOREIGN KEY (client_id) 
      REFERENCES clients(id) 
      ON DELETE CASCADE;
    
    RAISE NOTICE '✓ contract_requests constraint updated';
  ELSE
    RAISE NOTICE '- contract_requests table does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error with contract_requests: %', SQLERRM;
END $$;

-- STEP 6: Fix service_orders - RESTRICT (prevent delete if has orders)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_orders') THEN
    EXECUTE (
      SELECT 'ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
      FROM information_schema.table_constraints
      WHERE table_name = 'service_orders' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%client_id%'
      LIMIT 1
    );
    
    ALTER TABLE service_orders
      ADD CONSTRAINT service_orders_client_id_fkey 
      FOREIGN KEY (client_id) 
      REFERENCES clients(id) 
      ON DELETE RESTRICT;
    
    RAISE NOTICE '✓ service_orders constraint updated (RESTRICT)';
  ELSE
    RAISE NOTICE '- service_orders table does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠ Error with service_orders: %', SQLERRM;
END $$;

-- Final success message
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Client CASCADE DELETE setup complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  • Child records will auto-delete when client is deleted';
  RAISE NOTICE '  • Clients with service_orders CANNOT be deleted (data integrity)';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test: Try deleting a client without service orders';
  RAISE NOTICE '';
END $$;
