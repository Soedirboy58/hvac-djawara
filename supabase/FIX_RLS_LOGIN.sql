-- ============================================
-- FIX RLS FOR TECHNICIAN LOGIN
-- Allow authenticated users to SELECT their own technician record
-- ============================================

-- Drop and recreate SELECT policy for technicians
DROP POLICY IF EXISTS "Technicians can view own data" ON technicians;
DROP POLICY IF EXISTS "Authenticated can view technicians" ON technicians;

-- Allow authenticated users to read ALL technician data (needed for login check)
CREATE POLICY "Authenticated users can view technicians"
ON technicians
FOR SELECT
TO authenticated
USING (true);

-- Allow technicians to view their own data
CREATE POLICY "Technicians can view own record"
ON technicians
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow service role full access (for API routes)
DROP POLICY IF EXISTS "Service role has full access to technicians" ON technicians;
CREATE POLICY "Service role has full access to technicians"
ON technicians
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Show all policies for technicians table
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'technicians'
ORDER BY cmd, policyname;

-- Verify: Show technician data with auth link
SELECT 
  t.id,
  t.employee_id,
  t.email,
  t.user_id,
  t.is_verified,
  u.id as auth_user_id,
  u.email as auth_email,
  u.email_confirmed_at IS NOT NULL as email_confirmed
FROM technicians t
LEFT JOIN auth.users u ON t.user_id = u.id
ORDER BY t.created_at DESC;
