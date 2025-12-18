-- ============================================
-- Check Existing Technician Data
-- Verify existing technicians are visible
-- ============================================

-- Step 1: Check all existing roles in database
SELECT 
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM user_tenant_roles
GROUP BY role
ORDER BY count DESC;

-- Step 2: Check all technicians (old and new role names)
-- Note: Only checking 'technician' and 'tech_head' (existing roles)
-- After running EXPAND_USER_ROLES.sql, you can add: 'teknisi', 'senior_teknisi'
SELECT 
  p.full_name,
  au.email,
  utr.role,
  utr.is_active,
  t.name as tenant_name,
  utr.created_at
FROM user_tenant_roles utr
INNER JOIN profiles p ON utr.user_id = p.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN tenants t ON utr.tenant_id = t.id
WHERE utr.role IN ('technician', 'tech_head')
-- Add these after running EXPAND_USER_ROLES.sql: 'teknisi', 'senior_teknisi'
ORDER BY utr.is_active DESC, p.full_name;

-- Step 3: Check if role_hierarchy view exists
SELECT 
  schemaname, 
  viewname, 
  viewowner 
FROM pg_views 
WHERE viewname = 'role_hierarchy';

-- Step 4: If view exists, check its contents
-- Note: This will only work after running EXPAND_USER_ROLES.sql
-- SELECT * FROM role_hierarchy 
-- WHERE role_name IN ('technician', 'teknisi', 'tech_head', 'senior_teknisi')
-- ORDER BY sort_order;

-- Step 5: Check technicians table
SELECT 
  t.id,
  p.full_name as technician_name,
  t.phone,
  t.email,
  t.specializations,
  utr.role,
  utr.is_active
FROM technicians t
LEFT JOIN profiles p ON t.user_id = p.id
LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
ORDER BY p.full_name;

-- ============================================
-- Fix: Ensure all technicians are visible
-- ============================================

-- If technicians exist but not showing in People Management,
-- they might not have user_tenant_roles entry. Let's check:

SELECT 
  p.full_name as technician_name,
  t.email as technician_email,
  au.email as auth_email,
  CASE 
    WHEN utr.id IS NULL THEN '❌ No role assigned in user_tenant_roles'
    WHEN utr.role = 'technician' THEN '✅ Has role: technician'
    ELSE '✅ Has role: ' || utr.role
  END as status,
  t.specializations
FROM technicians t
LEFT JOIN profiles p ON t.user_id = p.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
ORDER BY p.full_name;
-- This shows ALL technicians and their role assignment status

-- ============================================
-- Solution: Link technicians to user_tenant_roles
-- ============================================

-- If technicians exist but not in user_tenant_roles, add them:
-- (Replace tenant-uuid with your actual tenant ID)

-- INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
-- SELECT 
--   t.user_id,
--   'tenant-uuid-here',
--   'technician',
--   TRUE
-- FROM technicians t
-- LEFT JOIN user_tenant_roles utr ON t.user_id = utr.user_id
-- WHERE utr.id IS NULL
--   AND t.user_id IS NOT NULL;

-- ============================================
-- Verification Queries
-- ============================================

-- Check total people by category (current existing roles only)
SELECT 
  CASE 
    WHEN role = 'owner' THEN 'Executive'
    WHEN role IN ('admin_finance', 'admin_logistic') THEN 'Management'
    WHEN role IN ('sales_partner') THEN 'Sales & Marketing'
    WHEN role = 'tech_head' THEN 'Senior Technical'
    WHEN role = 'technician' THEN 'Technical'
    WHEN role = 'helper' THEN 'Support'
    WHEN role = 'client' THEN 'External'
    ELSE 'Other'
  END as category,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active THEN 1 END) as active
FROM user_tenant_roles
GROUP BY category
ORDER BY total DESC;

-- Use this version AFTER running EXPAND_USER_ROLES.sql:
-- SELECT 
--   CASE 
--     WHEN role IN ('owner', 'direktur') THEN 'Executive'
--     WHEN role IN ('manager', 'supervisor', 'admin_finance', 'admin_logistic') THEN 'Management'
--     WHEN role = 'admin' THEN 'Administrative'
--     WHEN role IN ('sales_partner', 'marketing', 'business_dev') THEN 'Sales & Marketing'
--     WHEN role IN ('tech_head', 'senior_teknisi') THEN 'Senior Technical'
--     WHEN role IN ('technician', 'teknisi') THEN 'Technical'
--     WHEN role IN ('helper', 'magang') THEN 'Support'
--     WHEN role = 'client' THEN 'External'
--     ELSE 'Other'
--   END as category,
--   COUNT(*) as total,
--   COUNT(CASE WHEN is_active THEN 1 END) as active
-- FROM user_tenant_roles
-- GROUP BY category
-- ORDER BY total DESC;

-- Check specific user's roles
-- SELECT 
--   p.full_name,
--   au.email,
--   utr.role,
--   utr.is_active,
--   t.name as tenant_name
-- FROM profiles p
-- LEFT JOIN auth.users au ON p.id = au.id
-- LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
-- LEFT JOIN tenants t ON utr.tenant_id = t.id
-- WHERE au.email = 'technician@example.com';
