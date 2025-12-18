-- ============================================
-- Fix Missing Technicians in People Management
-- For: delta.sc58@gmail.com and putra.soedirboy@gmail.com
-- ============================================

-- Step 1: Check if these users exist in auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
ORDER BY email;

-- Step 2: Check if they have profiles
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.active_tenant_id,
  p.created_at
FROM profiles p
INNER JOIN auth.users au ON p.id = au.id
WHERE au.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
ORDER BY au.email;

-- Step 3: Check if they have entries in technicians table
SELECT 
  t.id,
  t.user_id,
  t.email,
  t.phone,
  t.specializations,
  p.full_name
FROM technicians t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE t.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
   OR p.id IN (
     SELECT id FROM auth.users 
     WHERE email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
   )
ORDER BY t.email;

-- Step 4: Check if they have roles in user_tenant_roles
SELECT 
  utr.id,
  utr.user_id,
  utr.role,
  utr.is_active,
  au.email,
  p.full_name,
  t.name as tenant_name
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
INNER JOIN auth.users au ON p.id = au.id
LEFT JOIN tenants t ON utr.tenant_id = t.id
WHERE au.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
ORDER BY au.email;

-- ============================================
-- SOLUTION: Add missing role assignments
-- ============================================

-- Add role for delta.sc58@gmail.com
INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
SELECT 
  au.id,
  t.id,
  'technician',
  TRUE
FROM auth.users au
CROSS JOIN tenants t
WHERE au.email = 'delta.sc58@gmail.com'
  AND t.slug = 'hvac-djawara'
  AND NOT EXISTS (
    SELECT 1 FROM user_tenant_roles utr 
    WHERE utr.user_id = au.id
  );

-- Add role for putra.soedirboy@gmail.com
INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
SELECT 
  au.id,
  t.id,
  'technician',
  TRUE
FROM auth.users au
CROSS JOIN tenants t
WHERE au.email = 'putra.soedirboy@gmail.com'
  AND t.slug = 'hvac-djawara'
  AND NOT EXISTS (
    SELECT 1 FROM user_tenant_roles utr 
    WHERE utr.user_id = au.id
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify both technicians now have roles
SELECT 
  au.email,
  p.full_name,
  utr.role,
  utr.is_active,
  t.name as tenant_name
FROM auth.users au
INNER JOIN profiles p ON au.id = p.id
LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
LEFT JOIN tenants t ON utr.tenant_id = t.id
WHERE au.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
ORDER BY au.email;

-- Check if they appear in People Management query
SELECT 
  p.id,
  p.full_name,
  au.email,
  utr.role,
  utr.is_active
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
INNER JOIN auth.users au ON p.id = au.id
WHERE au.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
  AND utr.is_active = TRUE
ORDER BY p.full_name;

-- ============================================
-- If technicians table needs linking
-- ============================================

-- Update technicians table to link with user_id
-- UPDATE technicians t
-- SET user_id = au.id
-- FROM auth.users au
-- WHERE t.email = au.email
--   AND t.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
--   AND t.user_id IS NULL;
