-- ============================================
-- Check and Fix Token Mismatch
-- ============================================

-- 1. Cek token yang ada untuk Bank Permata
SELECT 
  id,
  name,
  email,
  public_token,
  'https://hvac-djawara.vercel.app/c/' || public_token as current_link
FROM clients
WHERE name ILIKE '%permata%';

-- 2. Cek apakah token di URL ada di database
SELECT 
  id,
  name,
  email,
  public_token
FROM clients
WHERE public_token = '0abc50ec4fe3e6093d2d30a84fa5c2c7716264cc5a923467';

-- 3. Update token Bank Permata ke token yang di UI
-- UPDATE clients
-- SET public_token = '0abc50ec4fe3e6093d2d30a84fa5c2c7716264cc5a923467'
-- WHERE name ILIKE '%permata%';

-- 4. Verify semua clients punya token
SELECT 
  name,
  email,
  CASE 
    WHEN public_token IS NULL THEN '❌ NO TOKEN'
    ELSE '✅ HAS TOKEN'
  END as status,
  'https://hvac-djawara.vercel.app/c/' || COALESCE(public_token, 'missing') as link
FROM clients
ORDER BY name;
