-- ============================================
-- FIX RLS FOR CLIENTS TABLE
-- Allow authenticated users to create clients
-- ============================================

-- Check current policies on clients table
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY cmd, policyname;

-- Drop existing INSERT policies that might conflict
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Authenticated can insert clients" ON clients;

-- Allow authenticated users to INSERT clients
CREATE POLICY "Authenticated users can create clients"
ON clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT all clients
DROP POLICY IF EXISTS "Users can view clients" ON clients;
CREATE POLICY "Authenticated users can view clients"
ON clients
FOR SELECT
TO authenticated
USING (true);

-- Allow users to UPDATE their own tenant's clients
DROP POLICY IF EXISTS "Users can update clients" ON clients;
CREATE POLICY "Authenticated users can update clients"
ON clients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to clients" ON clients;
CREATE POLICY "Service role has full access to clients"
ON clients
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY cmd, policyname;
