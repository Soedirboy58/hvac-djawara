-- ============================================
-- CHECK AND FIX RLS POLICIES FOR TECHNICIANS TABLE
-- Allow service role to update user_id
-- ============================================

-- Check current policies
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
WHERE tablename = 'technicians'
ORDER BY policyname;

-- Drop existing policies that might block service role
DROP POLICY IF EXISTS "Service role can update technicians" ON technicians;
DROP POLICY IF EXISTS "Admin can update technicians" ON technicians;

-- Create policy that allows service role to do anything (for API routes)
CREATE POLICY "Service role has full access to technicians"
ON technicians
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Recreate admin update policy
CREATE POLICY "Admins can update technicians"
ON technicians
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM user_tenant_roles 
    WHERE role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_tenant_roles 
    WHERE role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
  )
);

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'technicians'
ORDER BY policyname;

-- Test: Show current technician data for delta.sc58@gmail.com
SELECT 
  id,
  employee_id,
  email,
  user_id,
  is_verified,
  verification_token IS NOT NULL as has_token
FROM technicians
WHERE email = 'delta.sc58@gmail.com';
