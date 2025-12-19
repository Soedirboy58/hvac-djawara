-- Create storage bucket for work photos and signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-photos', 'work-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Technicians can upload work photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view work photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can update their photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete their photos" ON storage.objects;

-- RLS Policies for work-photos bucket
CREATE POLICY "Technicians can upload work photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-photos' AND
  auth.uid() IN (
    SELECT user_id FROM technicians
  )
);

CREATE POLICY "Anyone can view work photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'work-photos');

CREATE POLICY "Technicians can update their photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'work-photos' AND
  auth.uid() IN (
    SELECT user_id FROM technicians
  )
);

CREATE POLICY "Technicians can delete their photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-photos' AND
  auth.uid() IN (
    SELECT user_id FROM technicians
  )
);
