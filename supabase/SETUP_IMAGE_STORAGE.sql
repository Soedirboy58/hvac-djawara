-- ============================================
-- SETUP IMAGE STORAGE FOR HVAC DJAWARA
-- Client Avatars + Property Photos
-- ============================================

-- Step 1: Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('client-avatars', 'client-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('property-photos', 'property-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 2: Storage policies for client-avatars
DROP POLICY IF EXISTS "Public read access for client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update client avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete client avatars" ON storage.objects;

CREATE POLICY "Public read access for client avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-avatars');

CREATE POLICY "Authenticated upload client avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-avatars' AND
  (storage.foldername(name))[1] IS NOT NULL
);

CREATE POLICY "Authenticated update client avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-avatars');

CREATE POLICY "Authenticated delete client avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-avatars');

-- Step 3: Storage policies for property-photos
DROP POLICY IF EXISTS "Public read access for property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete property photos" ON storage.objects;

CREATE POLICY "Public read access for property photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' AND
  (storage.foldername(name))[1] IS NOT NULL
);

CREATE POLICY "Authenticated update property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated delete property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');

-- Step 4: Add avatar_url column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN clients.avatar_url IS 'URL to client profile photo in Supabase storage';

-- Step 5: Add photo columns to client_properties table
ALTER TABLE client_properties
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN client_properties.photo_url IS 'Primary property photo URL (deprecated - use photos[0])';
COMMENT ON COLUMN client_properties.photos IS 'Array of property photo objects: [{url, caption, isPrimary, uploadedAt}]';

-- Step 6: Create helper function to get avatar initials
CREATE OR REPLACE FUNCTION get_client_initials(client_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  words TEXT[];
  initials TEXT := '';
BEGIN
  -- Split name by spaces
  words := string_to_array(trim(client_name), ' ');
  
  -- Get first letter of first word
  IF array_length(words, 1) >= 1 AND length(words[1]) > 0 THEN
    initials := initials || upper(substring(words[1], 1, 1));
  END IF;
  
  -- Get first letter of last word (if different from first)
  IF array_length(words, 1) >= 2 AND length(words[array_length(words, 1)]) > 0 THEN
    initials := initials || upper(substring(words[array_length(words, 1)], 1, 1));
  END IF;
  
  -- If only one word or empty, use first 2 letters
  IF length(initials) < 2 AND length(client_name) > 0 THEN
    initials := upper(substring(client_name, 1, 2));
  END IF;
  
  RETURN initials;
END;
$$;

-- Step 7: Create helper function to generate placeholder avatar
CREATE OR REPLACE FUNCTION generate_avatar_placeholder(
  client_id UUID,
  client_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  initials TEXT;
  color_index INTEGER;
  colors TEXT[] := ARRAY['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
BEGIN
  initials := get_client_initials(client_name);
  
  -- Generate consistent color based on client_id
  color_index := (('x' || substring(client_id::text, 1, 8))::bit(32)::int % 6) + 1;
  
  RETURN jsonb_build_object(
    'initials', initials,
    'color', colors[color_index],
    'hasAvatar', false
  );
END;
$$;

-- Step 8: Create view for clients with avatar info
CREATE OR REPLACE VIEW clients_with_avatars AS
SELECT 
  c.*,
  CASE 
    WHEN c.avatar_url IS NOT NULL THEN 
      jsonb_build_object(
        'url', c.avatar_url,
        'hasAvatar', true
      )
    ELSE 
      generate_avatar_placeholder(c.id, c.name)
  END as avatar_info
FROM clients c;

-- Step 9: Create view for properties with photos
CREATE OR REPLACE VIEW properties_with_photos AS
SELECT 
  cp.*,
  CASE 
    WHEN jsonb_array_length(cp.photos) > 0 THEN cp.photos
    ELSE '[]'::jsonb
  END as photo_gallery,
  CASE 
    WHEN jsonb_array_length(cp.photos) > 0 THEN 
      (cp.photos->0->>'url')
    ELSE NULL
  END as primary_photo_url,
  jsonb_array_length(cp.photos) as photo_count
FROM client_properties cp;

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_avatar_url ON clients(avatar_url) WHERE avatar_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_photos ON client_properties USING GIN(photos) WHERE jsonb_array_length(photos) > 0;

-- Step 11: Test queries
-- Verify buckets created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('client-avatars', 'property-photos');

-- Verify policies created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Test avatar placeholder generation
SELECT 
  id,
  name,
  avatar_url,
  (generate_avatar_placeholder(id, name))->>'initials' as initials,
  (generate_avatar_placeholder(id, name))->>'color' as color
FROM clients
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Image storage setup completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Storage Buckets:';
  RAISE NOTICE '   ✓ client-avatars (max 5MB, jpg/png/webp)';
  RAISE NOTICE '   ✓ property-photos (max 5MB, jpg/png/webp)';
  RAISE NOTICE '';
  RAISE NOTICE '🗄️ Database Updates:';
  RAISE NOTICE '   ✓ clients.avatar_url column added';
  RAISE NOTICE '   ✓ client_properties.photos column added';
  RAISE NOTICE '   ✓ Helper functions created';
  RAISE NOTICE '   ✓ Views created for easy querying';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '   ✓ Public read access enabled';
  RAISE NOTICE '   ✓ Authenticated users can upload/update/delete';
  RAISE NOTICE '   ✓ File type restrictions applied';
  RAISE NOTICE '   ✓ 5MB file size limit enforced';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Update frontend with image upload components';
  RAISE NOTICE '   2. Test upload from client form';
  RAISE NOTICE '   3. Test upload from property management';
  RAISE NOTICE '   4. Verify images display correctly';
END $$;
