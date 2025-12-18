-- ============================================
-- Debug People Management - Why technicians not showing
-- ============================================

-- 1. Check current user's active_tenant_id
-- (Run this with your login: aris.seridadu3g@gmail.com)
SELECT 
  id as user_id,
  full_name,
  active_tenant_id
FROM profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'aris.seridadu3g@gmail.com'
);

-- 2. Check all tenants
SELECT id, name, slug FROM tenants;

-- 3. Check user_tenant_roles for the technicians
SELECT 
  utr.id,
  utr.user_id,
  utr.tenant_id,
  utr.role,
  utr.is_active,
  au.email,
  p.full_name,
  t.name as tenant_name,
  t.slug as tenant_slug
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
INNER JOIN auth.users au ON p.id = au.id
LEFT JOIN tenants t ON utr.tenant_id = t.id
WHERE au.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com')
ORDER BY au.email;

-- 4. Check if tenant_id matches what's expected
-- Compare tenant_id from user_tenant_roles with active_tenant_id from profiles
SELECT 
  'Owner Profile' as source,
  p.id,
  p.full_name,
  p.active_tenant_id as tenant_id,
  t.name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON p.active_tenant_id = t.id
WHERE p.id IN (SELECT id FROM auth.users WHERE email = 'aris.seridadu3g@gmail.com')

UNION ALL

SELECT 
  'Technician Roles' as source,
  utr.user_id,
  p.full_name,
  utr.tenant_id,
  t.name as tenant_name
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
INNER JOIN auth.users au ON p.id = au.id
LEFT JOIN tenants t ON utr.tenant_id = t.id
WHERE au.email IN ('delta.sc58@gmail.com', 'putra.soedirboy@gmail.com');

-- 5. Simulate the exact query from People Management page
-- This should show the technicians if everything is correct
SELECT 
  utr.id,
  utr.user_id,
  utr.role,
  utr.is_active,
  utr.created_at,
  p.id as profile_id,
  p.full_name,
  au.email,
  p.phone,
  p.avatar_url
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
INNER JOIN auth.users au ON p.id = au.id
WHERE utr.tenant_id = (
  SELECT active_tenant_id 
  FROM profiles 
  WHERE id IN (SELECT id FROM auth.users WHERE email = 'aris.seridadu3g@gmail.com')
)
ORDER BY utr.is_active DESC, utr.role;
