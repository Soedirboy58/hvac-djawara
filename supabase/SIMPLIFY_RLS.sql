-- ============================================
-- SIMPLIFY RLS - Remove All Conflicts
-- Single policy for SELECT
-- ============================================

-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view technicians" ON technicians;
DROP POLICY IF EXISTS "Technicians can view own record" ON technicians;
DROP POLICY IF EXISTS "Technicians can view own data" ON technicians;
DROP POLICY IF EXISTS "Authenticated can view technicians" ON technicians;
DROP POLICY IF EXISTS "Users can view technicians" ON technicians;

-- Create ONE simple SELECT policy
CREATE POLICY "Allow authenticated to view all technicians"
ON technicians
FOR SELECT
TO authenticated
USING (true);

-- Keep service role full access
DROP POLICY IF EXISTS "Service role has full access to technicians" ON technicians;
CREATE POLICY "Service role has full access"
ON technicians
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
WHERE tablename = 'technicians'
ORDER BY cmd, policyname;

-- Test query (this should work after policy fix)
SELECT 
  id,
  employee_id,
  email,
  user_id,
  is_verified
FROM technicians
WHERE email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com');
