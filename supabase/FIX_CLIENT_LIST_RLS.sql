-- ============================================
-- FIX CLIENT LIST RLS POLICIES
-- Ensures newly added clients appear in list
-- Fixes tenant_id and user_id synchronization
-- ============================================

-- Step 1: Check current RLS policies on clients table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY policyname;

-- Step 2: Drop and recreate clients RLS policies with proper logic
-- This ensures both INSERT and SELECT work correctly

ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON clients;
DROP POLICY IF EXISTS "Users can insert clients in their tenant" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their tenant" ON clients;
DROP POLICY IF EXISTS "Service users can manage clients" ON clients;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy 1: View clients (SELECT)
-- Allow users to see clients in their active tenant
CREATE POLICY "Users can view clients in their tenant"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 2: Insert clients (INSERT)
-- Allow users to create clients with their active tenant_id
CREATE POLICY "Users can insert clients in their tenant"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (
      SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 3: Update clients (UPDATE)
-- Allow users to update clients in their tenant
CREATE POLICY "Users can update clients in their tenant"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (
      SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
      FROM auth.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

-- Policy 4: Service role bypass (for backend operations)
CREATE POLICY "Service users can manage clients"
  ON clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 3: Create helper function to auto-set tenant_id on INSERT
-- This ensures tenant_id is always set correctly when creating clients

CREATE OR REPLACE FUNCTION set_client_tenant_id()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If tenant_id is not provided, get it from user's active_tenant_id
  IF NEW.tenant_id IS NULL THEN
    SELECT (raw_user_meta_data->>'active_tenant_id')::uuid INTO NEW.tenant_id
    FROM auth.users
    WHERE id = auth.uid();
  END IF;
  
  -- If user_id is not provided, set it to current user
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger to auto-set tenant_id
DROP TRIGGER IF EXISTS set_client_tenant_id_trigger ON clients;

CREATE TRIGGER set_client_tenant_id_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_tenant_id();

-- Step 5: Verify current user's tenant_id
-- Run this to check if user has active_tenant_id set
SELECT 
  id,
  email,
  raw_user_meta_data->>'active_tenant_id' as active_tenant_id,
  raw_user_meta_data->>'tenant_id' as tenant_id,
  created_at
FROM auth.users
WHERE id = auth.uid();

-- Step 6: Test query - Check if clients are visible
-- This should return all clients in user's tenant
SELECT 
  id,
  name,
  email,
  tenant_id,
  user_id,
  created_at
FROM clients
WHERE tenant_id = (
  SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
  FROM auth.users 
  WHERE id = auth.uid()
)
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Debug - Check for orphaned clients (wrong tenant_id)
-- This finds clients that might have wrong tenant_id
SELECT 
  c.id,
  c.name,
  c.email,
  c.tenant_id as client_tenant_id,
  u.raw_user_meta_data->>'active_tenant_id' as user_active_tenant_id,
  CASE 
    WHEN c.tenant_id::text = u.raw_user_meta_data->>'active_tenant_id' THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM clients c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.created_at > CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.created_at DESC;

-- Step 8: Fix orphaned clients (run only if needed)
-- Updates clients with mismatched tenant_id
-- UNCOMMENT AND RUN ONLY IF YOU SEE MISMATCHED CLIENTS

/*
UPDATE clients c
SET tenant_id = (
  SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
  FROM auth.users
  WHERE id = c.user_id
)
WHERE c.tenant_id != (
  SELECT (raw_user_meta_data->>'active_tenant_id')::uuid
  FROM auth.users u
  WHERE u.id = c.user_id
)
AND c.created_at > CURRENT_DATE - INTERVAL '7 days';
*/

-- Step 9: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Step 10: Verify RLS is working
-- This should return count of clients visible to current user
SELECT COUNT(*) as visible_clients
FROM clients;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Client list RLS policies fixed successfully!';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Check Step 5 output - verify user has active_tenant_id';
  RAISE NOTICE '   2. Check Step 6 output - verify clients are visible';
  RAISE NOTICE '   3. Check Step 7 output - look for MISMATCH status';
  RAISE NOTICE '   4. If MISMATCH found, uncomment and run Step 8';
  RAISE NOTICE '   5. Test adding new client in UI';
END $$;
