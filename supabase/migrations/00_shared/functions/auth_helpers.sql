-- ============================================
-- Shared Functions: Auth Helpers
-- Purpose: Reusable authentication & authorization helpers
-- Dependencies: profiles, user_tenant_roles tables
-- Author: System Architect
-- Date: 2025-12-01
-- ============================================

-- ================================================
-- FUNCTION: get_active_tenant_id
-- Purpose: Get current user's active tenant
-- ================================================
DROP FUNCTION IF EXISTS auth.get_active_tenant_id() CASCADE;

CREATE OR REPLACE FUNCTION auth.get_active_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT active_tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.get_active_tenant_id() IS 
'Returns active_tenant_id of current authenticated user.
Returns NULL if user not authenticated or no active tenant set.
SECURITY DEFINER: Bypasses RLS on profiles table.
STABLE: Result does not change within a single query.';

-- ================================================
-- FUNCTION: has_role
-- Purpose: Check if user has specific role(s) in active tenant
-- ================================================
DROP FUNCTION IF EXISTS auth.has_role(text[]) CASCADE;

CREATE OR REPLACE FUNCTION auth.has_role(check_roles text[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND tenant_id = auth.get_active_tenant_id()
      AND role = ANY(check_roles)
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.has_role(text[]) IS 
'Check if current user has any of the specified roles in active tenant.
Parameters: check_roles - array of role names to check
Returns: true if user has at least one of the roles, false otherwise
Example: auth.has_role(ARRAY[''owner'', ''admin_finance''])';

-- ================================================
-- FUNCTION: is_owner
-- Purpose: Quick check if user is owner
-- ================================================
DROP FUNCTION IF EXISTS auth.is_owner() CASCADE;

CREATE OR REPLACE FUNCTION auth.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role(ARRAY['owner']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_owner() IS 
'Convenience function to check if current user is owner.
Equivalent to: auth.has_role(ARRAY[''owner''])';

-- ================================================
-- FUNCTION: is_admin
-- Purpose: Check if user is any type of admin
-- ================================================
DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role(ARRAY['admin_finance', 'admin_logistic']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.is_admin() IS 
'Check if current user is any type of admin (finance or logistic).
Returns true if user has admin_finance OR admin_logistic role.';

-- ================================================
-- FUNCTION: get_user_branch_id
-- Purpose: Get branch_id of user (if scoped to branch)
-- ================================================
DROP FUNCTION IF EXISTS auth.get_user_branch_id() CASCADE;

CREATE OR REPLACE FUNCTION auth.get_user_branch_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT branch_id 
    FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND tenant_id = auth.get_active_tenant_id()
      AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.get_user_branch_id() IS 
'Returns branch_id of current user in active tenant.
Returns NULL if user not scoped to specific branch or no active tenant.
Used for branch-level data filtering (e.g., technician only sees jobs in their branch).';

-- ================================================
-- FUNCTION: get_user_role
-- Purpose: Get current user's role in active tenant
-- ================================================
DROP FUNCTION IF EXISTS auth.get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::text
    FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND tenant_id = auth.get_active_tenant_id()
      AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.get_user_role() IS 
'Returns current user''s role in active tenant as text.
Returns NULL if user has no role in active tenant.
Note: If user has multiple roles, returns first one (unpredictable order).';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  func_count INT;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname IN (
    'get_active_tenant_id',
    'has_role',
    'is_owner',
    'is_admin',
    'get_user_branch_id',
    'get_user_role'
  );
  
  ASSERT func_count = 6, 
         'Expected 6 auth helper functions, found ' || func_count;
         
  RAISE NOTICE '✓ All auth helper functions created successfully';
END $$;
