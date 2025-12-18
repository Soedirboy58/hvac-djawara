-- ============================================
-- Get Client Premium Status and Registration Link
-- ============================================

-- Untuk client Putra, cek status premium
SELECT 
  id,
  name,
  email,
  user_id,
  public_token,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ Premium Member (Has Account)'
    ELSE '⭐ Basic Access Only (No Account)'
  END as account_status,
  'https://hvac-djawara.vercel.app/c/' || public_token as public_link,
  CASE 
    WHEN user_id IS NULL THEN 'https://hvac-djawara.vercel.app/client/register?token=' || public_token
    ELSE 'Already registered - use /client/login'
  END as registration_info
FROM clients
WHERE name ILIKE '%putra%' OR email ILIKE '%yennita%';

-- Cek auth.users untuk client Putra
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  c.name as client_name
FROM auth.users u
LEFT JOIN clients c ON c.user_id = u.id
WHERE u.email ILIKE '%yennita%';

-- Verify RLS policies allow public access
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'clients' AND policyname LIKE '%public%';
