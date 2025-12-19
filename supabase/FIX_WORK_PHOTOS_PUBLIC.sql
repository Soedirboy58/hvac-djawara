-- Make work-photos bucket PUBLIC
UPDATE storage.buckets 
SET public = true 
WHERE id = 'work-photos';

-- Update policies to allow public read access
DROP POLICY IF EXISTS "Anyone can view work photos" ON storage.objects;

CREATE POLICY "Public can view work photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-photos');

-- Keep authenticated policies for write operations
DROP POLICY IF EXISTS "Technicians can upload work photos" ON storage.objects;
CREATE POLICY "Technicians can upload work photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-photos' AND
  auth.uid() IN (
    SELECT user_id FROM technicians
  )
);
