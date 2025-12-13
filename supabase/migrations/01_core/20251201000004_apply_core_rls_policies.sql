-- ============================================
-- Migration: Apply Core RLS Policies
-- Domain: Core
-- Purpose: Security layer for tenants, profiles, user_tenant_roles
-- Dependencies: All core tables + auth helper functions
-- Author: System Architect
-- Date: 2025-12-01
-- Version: 1.0.0
-- ============================================

-- ================================================
-- TENANTS POLICIES
-- ================================================

-- Policy: Users can view tenants they have access to
CREATE POLICY "users_view_accessible_tenants"
ON public.tenants
FOR SELECT
USING (
  id IN (
    SELECT tenant_id 
    FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);

-- Policy: Only owners can update their tenant
CREATE POLICY "owners_update_own_tenant"
ON public.tenants
FOR UPDATE
USING (
  id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
)
WITH CHECK (
  id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
);

-- Policy: System can insert tenants (for onboarding)
-- Note: This will be restricted via Edge Function with service role
CREATE POLICY "system_insert_tenants"
ON public.tenants
FOR INSERT
WITH CHECK (true);
-- Later: Restrict to service role only via Edge Function

COMMENT ON POLICY "users_view_accessible_tenants" ON public.tenants IS 
'Users can view tenants where they have an active role.
Prevents seeing other tenants data.';

COMMENT ON POLICY "owners_update_own_tenant" ON public.tenants IS 
'Only owners can update tenant settings.
Must be in their active tenant context.';

-- ================================================
-- PROFILES POLICIES
-- ================================================

-- Policy: Users can view their own profile
CREATE POLICY "users_view_own_profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Owners can view all profiles in their tenant
CREATE POLICY "owners_view_tenant_profiles"
ON public.profiles
FOR SELECT
USING (
  auth.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic'])
  AND id IN (
    SELECT user_id 
    FROM public.user_tenant_roles
    WHERE tenant_id = auth.get_active_tenant_id()
  )
);

-- Policy: System can insert profiles (auto-created via trigger)
CREATE POLICY "system_insert_profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);
-- Auto-created by trigger on auth.users INSERT

COMMENT ON POLICY "users_view_own_profile" ON public.profiles IS 
'Users can always view their own profile.
Basic self-access right.';

COMMENT ON POLICY "owners_view_tenant_profiles" ON public.profiles IS 
'Owners and admins can view profiles of users in their tenant.
Used for user management, team overview.';

-- ================================================
-- USER_TENANT_ROLES POLICIES
-- ================================================

-- Policy: Users can view their own role assignments
CREATE POLICY "users_view_own_roles"
ON public.user_tenant_roles
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Owners can view all role assignments in their tenant
CREATE POLICY "owners_view_tenant_roles"
ON public.user_tenant_roles
FOR SELECT
USING (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
);

-- Policy: Owners can insert role assignments in their tenant
CREATE POLICY "owners_insert_tenant_roles"
ON public.user_tenant_roles
FOR INSERT
WITH CHECK (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
  AND role != 'owner' -- Cannot assign owner role (security)
);

-- Policy: Owners can update role assignments in their tenant
CREATE POLICY "owners_update_tenant_roles"
ON public.user_tenant_roles
FOR UPDATE
USING (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
)
WITH CHECK (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
  AND role != 'owner' -- Cannot change to owner role
);

-- Policy: Owners can delete (deactivate) role assignments
CREATE POLICY "owners_delete_tenant_roles"
ON public.user_tenant_roles
FOR DELETE
USING (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
  AND role != 'owner' -- Cannot delete owner role
);

-- Policy: System can insert initial owner role (tenant creation)
CREATE POLICY "system_insert_initial_owner"
ON public.user_tenant_roles
FOR INSERT
WITH CHECK (
  role = 'owner'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_tenant_roles
    WHERE tenant_id = NEW.tenant_id
    AND role = 'owner'
  )
);
-- Allows first owner assignment during tenant onboarding

COMMENT ON POLICY "users_view_own_roles" ON public.user_tenant_roles IS 
'Users can see all their role assignments across all tenants.
Needed for tenant switcher and access control.';

COMMENT ON POLICY "owners_insert_tenant_roles" ON public.user_tenant_roles IS 
'Owners can assign roles to users in their tenant.
Security: Cannot assign owner role (prevent privilege escalation).
Owner role only assigned during tenant creation.';

COMMENT ON POLICY "system_insert_initial_owner" ON public.user_tenant_roles IS 
'Special policy: Allow creating first owner during tenant onboarding.
Only works if no owner exists yet in the tenant.
Used by onboarding Edge Function.';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  tenants_policies INT;
  profiles_policies INT;
  roles_policies INT;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO tenants_policies
  FROM pg_policies WHERE tablename = 'tenants';
  
  SELECT COUNT(*) INTO profiles_policies
  FROM pg_policies WHERE tablename = 'profiles';
  
  SELECT COUNT(*) INTO roles_policies
  FROM pg_policies WHERE tablename = 'user_tenant_roles';
  
  ASSERT tenants_policies >= 3, 
         'Expected at least 3 policies on tenants, found ' || tenants_policies;
  
  ASSERT profiles_policies >= 4, 
         'Expected at least 4 policies on profiles, found ' || profiles_policies;
  
  ASSERT roles_policies >= 6, 
         'Expected at least 6 policies on user_tenant_roles, found ' || roles_policies;
  
  RAISE NOTICE '✓ Core RLS policies applied successfully';
  RAISE NOTICE '  - Tenants policies: %', tenants_policies;
  RAISE NOTICE '  - Profiles policies: %', profiles_policies;
  RAISE NOTICE '  - User Tenant Roles policies: %', roles_policies;
  RAISE NOTICE '  - Total policies: %', tenants_policies + profiles_policies + roles_policies;
END $$;
