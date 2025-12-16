-- ============================================
-- FIX STORAGE RLS FOR AC PHOTOS
-- Allow authenticated users to upload AC photos
-- ============================================

-- Check current policies on storage.objects for ac-photos
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%ac%'
ORDER BY policyname;

-- Drop existing AC photo policies
DROP POLICY IF EXISTS "Authenticated users can upload AC photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload AC photos" ON storage.objects;

-- Allow authenticated users to INSERT (upload) AC photos
CREATE POLICY "Authenticated can upload AC photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ac-photos');

-- Allow authenticated users to SELECT (view) AC photos
DROP POLICY IF EXISTS "Authenticated users can view AC photos" ON storage.objects;
CREATE POLICY "Authenticated can view AC photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ac-photos');

-- Allow authenticated users to UPDATE AC photos
DROP POLICY IF EXISTS "Authenticated users can update AC photos" ON storage.objects;
CREATE POLICY "Authenticated can update AC photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ac-photos' AND owner = auth.uid());

-- Allow authenticated users to DELETE AC photos
DROP POLICY IF EXISTS "Authenticated users can delete AC photos" ON storage.objects;
CREATE POLICY "Authenticated can delete AC photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ac-photos' AND owner = auth.uid());

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%ac%'
ORDER BY policyname;
