-- ============================================
-- DEBUG AND FIX ORDERS VIEW
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check if there are any orders in the system
DO $$
DECLARE
  order_count INT;
  tenant_id_var UUID;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║  DEBUGGING ORDERS ISSUE                    ║';
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Get hvac-djawara tenant ID
  SELECT id INTO tenant_id_var FROM public.tenants WHERE slug = 'hvac-djawara';
  RAISE NOTICE '1. Tenant ID: %', tenant_id_var;
  
  -- Check total orders
  SELECT COUNT(*) INTO order_count FROM public.service_orders WHERE tenant_id = tenant_id_var;
  RAISE NOTICE '2. Total orders in system: %', order_count;
  
  -- Show recent orders
  RAISE NOTICE '';
  RAISE NOTICE '3. Recent orders:';
END $$;

-- Show recent orders
SELECT 
  order_number,
  service_title,
  status,
  created_at
FROM public.service_orders
WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check user profiles and active_tenant_id
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '4. User profiles status:';
END $$;

SELECT 
  p.id,
  au.email,
  p.full_name,
  p.active_tenant_id,
  CASE 
    WHEN p.active_tenant_id IS NULL THEN '❌ NO ACTIVE TENANT'
    ELSE '✓ Has active tenant'
  END as status
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
ORDER BY au.email;

-- Step 3: Check user roles
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '5. User roles:';
END $$;

SELECT 
  au.email,
  utr.role,
  utr.is_active,
  t.name as tenant_name
FROM public.user_tenant_roles utr
JOIN public.profiles p ON p.id = utr.user_id
JOIN auth.users au ON au.id = p.id
JOIN public.tenants t ON t.id = utr.tenant_id
WHERE t.slug = 'hvac-djawara'
ORDER BY au.email;

-- Step 4: FIX - Set active_tenant_id for all hvac-djawara users
DO $$
DECLARE
  tenant_id_var UUID;
  updated_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '6. Fixing active_tenant_id for users...';
  
  -- Get tenant ID
  SELECT id INTO tenant_id_var FROM public.tenants WHERE slug = 'hvac-djawara';
  
  -- Update all users who have roles in hvac-djawara but no active_tenant_id
  WITH users_to_update AS (
    SELECT DISTINCT utr.user_id
    FROM public.user_tenant_roles utr
    WHERE utr.tenant_id = tenant_id_var
    AND utr.is_active = true
  )
  UPDATE public.profiles
  SET active_tenant_id = tenant_id_var
  WHERE id IN (SELECT user_id FROM users_to_update)
  AND (active_tenant_id IS NULL OR active_tenant_id != tenant_id_var);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '   ✓ Updated % user(s)', updated_count;
END $$;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '7. Verification after fix:';
END $$;

SELECT 
  au.email,
  p.full_name,
  CASE 
    WHEN p.active_tenant_id IS NOT NULL THEN '✓ Fixed'
    ELSE '❌ Still broken'
  END as status
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
JOIN public.user_tenant_roles utr ON utr.user_id = p.id
WHERE utr.tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
GROUP BY au.email, p.full_name, p.active_tenant_id;

-- Step 5: Check RLS policies
DO $$
DECLARE
  policy_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '8. Checking RLS policies...';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'service_orders'
  AND cmd = 'SELECT';
  
  RAISE NOTICE '   SELECT policies on service_orders: %', policy_count;
END $$;

-- Show all policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('service_orders', 'clients')
ORDER BY tablename, cmd;

-- Final summary
DO $$
DECLARE
  order_count INT;
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO order_count 
  FROM public.service_orders 
  WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara');
  
  SELECT COUNT(DISTINCT p.id) INTO user_count
  FROM public.profiles p
  JOIN public.user_tenant_roles utr ON utr.user_id = p.id
  WHERE utr.tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
  AND p.active_tenant_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ DEBUG & FIX COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total orders: %', order_count;
  RAISE NOTICE '👥 Users with active_tenant_id: %', user_count;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Now refresh your dashboard:';
  RAISE NOTICE '   Press Ctrl+Shift+R or F5';
  RAISE NOTICE '';
END $$;
