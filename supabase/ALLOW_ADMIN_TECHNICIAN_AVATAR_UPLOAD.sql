-- Allow admins/owners/tech_head to upload & update technician avatars from People Management
-- Bucket: technician-avatars

-- INSERT policy
DROP POLICY IF EXISTS "Admins can upload technician avatars" ON storage.objects;
CREATE POLICY "Admins can upload technician avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-avatars'
  AND auth.uid() IN (
    SELECT user_id
    FROM user_tenant_roles
    WHERE role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
      AND is_active = true
  )
);

-- UPDATE policy
DROP POLICY IF EXISTS "Admins can update technician avatars" ON storage.objects;
CREATE POLICY "Admins can update technician avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'technician-avatars'
  AND auth.uid() IN (
    SELECT user_id
    FROM user_tenant_roles
    WHERE role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
      AND is_active = true
  )
);
