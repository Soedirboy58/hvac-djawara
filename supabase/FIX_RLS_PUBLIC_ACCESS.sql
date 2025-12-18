-- ============================================
-- Fix RLS for Public Client Access
-- Allow anon users to read clients by public_token
-- ============================================

-- 1. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'clients';

-- 2. Drop existing restrictive policies if needed
-- DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
-- DROP POLICY IF EXISTS "Enable read access for service role" ON clients;

-- 3. Create policy for public token access
CREATE POLICY "Allow public access by token"
ON clients
FOR SELECT
TO anon, authenticated
USING (public_token IS NOT NULL);

-- 4. Verify policy created
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'clients' AND policyname = 'Allow public access by token';

-- 5. Test query sebagai anon user
-- Di Supabase SQL Editor, harusnya bisa query ini:
-- SELECT * FROM clients WHERE public_token = 'your-token-here' LIMIT 1;
