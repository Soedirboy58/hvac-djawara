-- ============================================
-- CREATE STORAGE BUCKETS
-- For client documents and AC photos
-- ============================================

-- ================================================
-- 1. CLIENT DOCUMENTS BUCKET
-- ================================================

-- Create bucket for client documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for client-documents bucket
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid());

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents' AND owner = auth.uid());

-- ================================================
-- 2. AC PHOTOS BUCKET
-- ================================================

-- Create bucket for AC unit photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ac-photos',
  'ac-photos',
  false,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for ac-photos bucket
CREATE POLICY "Authenticated users can view AC photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ac-photos');

CREATE POLICY "Authenticated users can upload AC photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ac-photos');

CREATE POLICY "Users can update AC photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ac-photos' AND owner = auth.uid());

CREATE POLICY "Users can delete AC photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ac-photos' AND owner = auth.uid());

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ STORAGE BUCKETS CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Buckets:';
  RAISE NOTICE '  1. client-documents (10MB limit)';
  RAISE NOTICE '     - PDF, Images, Word, Excel';
  RAISE NOTICE '  2. ac-photos (5MB limit)';
  RAISE NOTICE '     - JPEG, PNG, WEBP only';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Policies:';
  RAISE NOTICE '  - Authenticated users can view/upload';
  RAISE NOTICE '  - Users can update/delete own files';
  RAISE NOTICE '';
END $$;
