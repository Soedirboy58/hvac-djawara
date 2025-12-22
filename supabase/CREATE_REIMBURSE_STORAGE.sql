-- ============================================
-- REIMBURSE RECEIPTS STORAGE
-- Bucket: reimburse-receipts (private)
-- Receipt/nota wajib untuk pengajuan
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reimburse-receipts',
  'reimburse-receipts',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Technicians (and helpers) can upload receipts
DROP POLICY IF EXISTS "Technicians can upload reimburse receipts" ON storage.objects;
CREATE POLICY "Technicians can upload reimburse receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reimburse-receipts'
  AND (
    public.has_role(ARRAY['technician','helper'])
    OR auth.uid() IN (SELECT user_id FROM public.technicians WHERE user_id IS NOT NULL)
  )
);

-- Submitter can view own receipts; Finance can view all
DROP POLICY IF EXISTS "Users can view reimburse receipts" ON storage.objects;
CREATE POLICY "Users can view reimburse receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reimburse-receipts'
  AND (
    owner = auth.uid()
    OR public.has_role(ARRAY['owner','admin_finance'])
  )
);

-- Submitter can update own receipts (optional)
DROP POLICY IF EXISTS "Users can update own reimburse receipts" ON storage.objects;
CREATE POLICY "Users can update own reimburse receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reimburse-receipts'
  AND owner = auth.uid()
);

-- Submitter can delete own receipts within 24h (optional)
DROP POLICY IF EXISTS "Users can delete recent reimburse receipts" ON storage.objects;
CREATE POLICY "Users can delete recent reimburse receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reimburse-receipts'
  AND owner = auth.uid()
  AND created_at > NOW() - INTERVAL '24 hours'
);
