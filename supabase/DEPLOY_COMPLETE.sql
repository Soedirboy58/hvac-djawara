-- ============================================
-- COMPLETE DATABASE DEPLOYMENT - SINGLE FILE
-- ============================================
-- Purpose: Deploy entire database in ONE execution
-- Project: HVAC/AC Service Management Platform
-- Date: 2025-12-01
-- 
-- INSTRUCTIONS:
-- 1. Open: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql/new
-- 2. Copy ENTIRE file content
-- 3. Paste into SQL Editor
-- 4. Click "RUN" button
-- 
-- This file contains:
-- ✓ Enum types
-- ✓ Helper functions
-- ✓ Core tables (tenants, profiles, user_tenant_roles)
-- ✓ Clients table
-- ✓ RLS policies
-- ============================================

-- ============================================
-- PHASE 1: ENUM TYPES
-- ============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'owner',
    'investor',
    'admin_finance',
    'admin_logistic',
    'tech_head',
    'technician',
    'helper',
    'sales_partner',
    'client'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trial',
    'active',
    'suspended',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM (
    'basic',
    'pro',
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PHASE 2: HELPER FUNCTIONS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Slugify function
CREATE OR REPLACE FUNCTION public.slugify(text_input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := LOWER(text_input);
  result := REGEXP_REPLACE(result, '\s+', '-', 'g');
  result := REGEXP_REPLACE(result, '[^a-z0-9-]', '', 'g');
  result := REGEXP_REPLACE(result, '-+', '-', 'g');
  result := TRIM(BOTH '-' FROM result);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- PHASE 3: CORE TABLES
-- ============================================

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_plan subscription_plan NOT NULL DEFAULT 'basic',
  subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_expires_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  business_hours JSONB DEFAULT '{
    "mon": "08:00-17:00",
    "tue": "08:00-17:00",
    "wed": "08:00-17:00",
    "thu": "08:00-17:00",
    "fri": "08:00-17:00",
    "sat": "08:00-12:00",
    "sun": null
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON public.tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON public.tenants(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS set_updated_at ON public.tenants;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  phone_alt TEXT,
  address TEXT,
  active_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_active_tenant ON public.profiles(active_tenant_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User tenant roles table
CREATE TABLE IF NOT EXISTS public.user_tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  branch_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_tenant_role UNIQUE (user_id, tenant_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_user ON public.user_tenant_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_tenant ON public.user_tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_roles_active ON public.user_tenant_roles(user_id, tenant_id) WHERE is_active = true;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_tenant_roles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_tenant_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_tenant_roles ENABLE ROW LEVEL SECURITY;

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_active ON public.clients(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS set_updated_at ON public.clients;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PHASE 4: AUTH HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_active_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT active_tenant_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_role(check_roles text[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_active_tenant_id()
      AND role = ANY(check_roles)
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PHASE 5: RLS POLICIES
-- ============================================

-- Tenants policies
DROP POLICY IF EXISTS "users_view_accessible_tenants" ON public.tenants;
CREATE POLICY "users_view_accessible_tenants"
ON public.tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM public.user_tenant_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS "system_insert_tenants" ON public.tenants;
CREATE POLICY "system_insert_tenants"
ON public.tenants FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "owners_update_own_tenant" ON public.tenants;
CREATE POLICY "owners_update_own_tenant"
ON public.tenants FOR UPDATE
USING (
  id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
)
WITH CHECK (
  id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
);

-- Profiles policies
DROP POLICY IF EXISTS "users_view_own_profile" ON public.profiles;
CREATE POLICY "users_view_own_profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "system_insert_profiles" ON public.profiles;
CREATE POLICY "system_insert_profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- User tenant roles policies
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_tenant_roles;
CREATE POLICY "users_view_own_roles"
ON public.user_tenant_roles FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_view_tenant_roles" ON public.user_tenant_roles;
CREATE POLICY "owners_view_tenant_roles"
ON public.user_tenant_roles FOR SELECT
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
);

DROP POLICY IF EXISTS "owners_insert_tenant_roles" ON public.user_tenant_roles;
CREATE POLICY "owners_insert_tenant_roles"
ON public.user_tenant_roles FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner'])
);

DROP POLICY IF EXISTS "system_insert_initial_owner" ON public.user_tenant_roles;
CREATE POLICY "system_insert_initial_owner"
ON public.user_tenant_roles FOR INSERT
WITH CHECK (
  role = 'owner'
);

-- Clients policies
DROP POLICY IF EXISTS "users_view_tenant_clients" ON public.clients;
CREATE POLICY "users_view_tenant_clients"
ON public.clients FOR SELECT
USING (tenant_id = public.get_active_tenant_id());

DROP POLICY IF EXISTS "users_insert_clients" ON public.clients;
CREATE POLICY "users_insert_clients"
ON public.clients FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
);

DROP POLICY IF EXISTS "users_update_clients" ON public.clients;
CREATE POLICY "users_update_clients"
ON public.clients FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
);

DROP POLICY IF EXISTS "admins_delete_clients" ON public.clients;
CREATE POLICY "admins_delete_clients"
ON public.clients FOR DELETE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance'])
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ DATABASE DEPLOYMENT COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '   • 3 enum types';
  RAISE NOTICE '   • 2 helper functions';
  RAISE NOTICE '   • 4 tables (tenants, profiles, user_tenant_roles, clients)';
  RAISE NOTICE '   • 2 auth helper functions';
  RAISE NOTICE '   • 13 RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next: Test authentication in your app!';
  RAISE NOTICE '';
END $$;
