-- ============================================
-- Check Client Authentication Setup
-- Verify if client has login account or uses public link
-- ============================================

-- 1. Check if client email exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'yennita.anggraeniputri@gmail.com';

-- 2. Check client record
SELECT 
  id,
  name,
  email,
  phone,
  user_id,
  portal_enabled,
  created_at
FROM clients
WHERE email ILIKE '%yennita%' OR name ILIKE '%putra%';
