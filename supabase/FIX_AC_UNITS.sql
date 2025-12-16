-- ============================================
-- FIX AC UNITS TABLE AND RLS
-- Add missing column and fix RLS policies
-- ============================================

-- Check if installation_date column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ac_units';

-- Add installation_date column if not exists
ALTER TABLE ac_units 
ADD COLUMN IF NOT EXISTS installation_date DATE;

-- Check current RLS policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'ac_units'
ORDER BY cmd, policyname;

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can insert AC units" ON ac_units;
DROP POLICY IF EXISTS "Authenticated can insert AC units" ON ac_units;

-- Allow authenticated users to INSERT AC units
CREATE POLICY "Authenticated users can create AC units"
ON ac_units
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT AC units
DROP POLICY IF EXISTS "Users can view AC units" ON ac_units;
CREATE POLICY "Authenticated users can view AC units"
ON ac_units
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE AC units
DROP POLICY IF EXISTS "Users can update AC units" ON ac_units;
CREATE POLICY "Authenticated users can update AC units"
ON ac_units
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to DELETE AC units
DROP POLICY IF EXISTS "Users can delete AC units" ON ac_units;
CREATE POLICY "Authenticated users can delete AC units"
ON ac_units
FOR DELETE
TO authenticated
USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role has full access to AC units" ON ac_units;
CREATE POLICY "Service role has full access to AC units"
ON ac_units
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'ac_units'
ORDER BY cmd, policyname;
