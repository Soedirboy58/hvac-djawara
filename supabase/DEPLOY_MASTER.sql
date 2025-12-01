-- ============================================
-- MASTER MIGRATION FILE - DEPLOY TO SUPABASE
-- ============================================
-- Purpose: Complete database setup in ONE execution
-- Project: HVAC/AC Service Management Platform
-- Author: System Architect
-- Date: 2025-12-01
-- 
-- INSTRUCTIONS:
-- 1. Open: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql/new
-- 2. Copy ENTIRE file content
-- 3. Paste into SQL Editor
-- 4. Click "RUN" button
-- 5. Check output for success messages (✓)
-- 
-- EXECUTION ORDER (DO NOT CHANGE):
-- Phase 1: Shared Types & Functions
-- Phase 2: Core Tables
-- Phase 3: Auth Helpers (requires tables)
-- Phase 4: RLS Policies (requires auth helpers)
-- ============================================

-- ============================================
-- PHASE 1: SHARED TYPES & FUNCTIONS
-- ============================================

-- ================================================
-- 1.1 ENUM TYPES
-- ================================================
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

COMMENT ON TYPE user_role IS 
'User roles in the platform:
- owner: Full access, approvals
- investor: Read-only analytics
- admin_finance: Finance management
- admin_logistic: Inventory management
- tech_head: Team lead, assignments
- technician: Execute jobs
- helper: Assistant technician
- sales_partner: Manage own clients
- client: Customer portal access';

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

COMMENT ON TYPE subscription_status IS 
'Tenant subscription status:
- trial: 14 days free trial
- active: Paid and active
- suspended: Non-payment, temporary block
- cancelled: Permanently closed';

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM (
    'basic',
    'pro',
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE subscription_plan IS 
'Subscription plan tiers:
- basic: Up to 10 users, basic features
- pro: Up to 50 users, advanced features
- enterprise: Unlimited users, all features + custom';

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 1.1: Enum types created';
END $$;

-- ================================================
-- 1.2 HANDLE_UPDATED_AT FUNCTION
-- ================================================
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_updated_at() IS 
'Automatically update updated_at timestamp on row update. 
Apply as BEFORE UPDATE trigger.
Example: CREATE TRIGGER set_updated_at BEFORE UPDATE ON table_name 
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();';

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 1.2: handle_updated_at function created';
END $$;

-- ================================================
-- 1.3 TEXT HELPER FUNCTIONS
-- ================================================
DROP FUNCTION IF EXISTS public.slugify(TEXT) CASCADE;

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

COMMENT ON FUNCTION public.slugify(TEXT) IS 
'Convert text to URL-safe slug.
Example: slugify(''AC Jaya Service'') → ''ac-jaya-service''';

DROP FUNCTION IF EXISTS public.generate_code(TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.generate_code(
  prefix TEXT,
  sequence_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
  code TEXT;
BEGIN
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_val;
  code := prefix || '-' || 
          TO_CHAR(NOW(), 'YYYYMM') || '-' || 
          LPAD(next_val::TEXT, 4, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.generate_code(TEXT, TEXT) IS 
'Generate unique code with prefix and sequence.
Example: generate_code(''SO'', ''service_orders_seq'') → ''SO-202512-0001''';

DROP FUNCTION IF EXISTS public.clean_phone(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.clean_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  cleaned := REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
  IF LEFT(cleaned, 1) = '0' THEN
    cleaned := '+62' || SUBSTRING(cleaned FROM 2);
  END IF;
  IF LEFT(cleaned, 1) != '+' AND LEFT(cleaned, 2) != '62' THEN
    cleaned := '+62' || cleaned;
  END IF;
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.clean_phone(TEXT) IS 
'Clean and format Indonesian phone number to E.164 format.
Example: clean_phone(''0812-3456-7890'') → ''+628123456890''';

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 1.3: Text helper functions created';
END $$;

-- ============================================
-- PHASE 2: CORE TABLES
-- ============================================

-- ================================================
-- 2.1 TENANTS TABLE
-- ================================================
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT email_format CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT trial_expiry_check CHECK (
    subscription_status != 'trial' OR subscription_expires_at IS NOT NULL
  )
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_subscription_status ON public.tenants(subscription_status);
CREATE INDEX idx_tenants_is_active ON public.tenants(is_active) WHERE is_active = true;
CREATE INDEX idx_tenants_subscription_expires ON public.tenants(subscription_expires_at) 
  WHERE subscription_status = 'trial';

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.generate_tenant_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_slug
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tenant_slug();

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tenants IS 
'Perusahaan jasa yang subscribe platform. Root table untuk multi-tenant isolation.';

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 2.1: Tenants table created';
END $$;

-- ================================================
-- 2.2 PROFILES TABLE
-- ================================================
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

CREATE INDEX idx_profiles_active_tenant ON public.profiles(active_tenant_id);
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name) 
  WHERE full_name IS NOT NULL;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.profiles IS 
'Extended user profile (1:1 relationship with auth.users). Auto-created on registration.';

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 2.2: Profiles table created';
END $$;

-- ================================================
-- 2.3 USER_TENANT_ROLES TABLE
-- ================================================
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
  CONSTRAINT unique_user_tenant_role UNIQUE (user_id, tenant_id, role),
  CONSTRAINT self_assignment_check CHECK (user_id != assigned_by OR assigned_by IS NULL)
);

CREATE INDEX idx_user_tenant_roles_user ON public.user_tenant_roles(user_id);
CREATE INDEX idx_user_tenant_roles_tenant ON public.user_tenant_roles(tenant_id);
CREATE INDEX idx_user_tenant_roles_role ON public.user_tenant_roles(role);
CREATE INDEX idx_user_tenant_roles_active ON public.user_tenant_roles(user_id, tenant_id) 
  WHERE is_active = true;
CREATE INDEX idx_user_tenant_roles_branch ON public.user_tenant_roles(branch_id) 
  WHERE branch_id IS NOT NULL;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_tenant_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.set_first_active_tenant()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET active_tenant_id = NEW.tenant_id
  WHERE id = NEW.user_id
    AND active_tenant_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_first_active_tenant
  AFTER INSERT ON public.user_tenant_roles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.set_first_active_tenant();

ALTER TABLE public.user_tenant_roles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_tenant_roles IS 
'Junction table: user ↔ tenant ↔ role. One user can have multiple roles in multiple tenants.';

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 2.3: User Tenant Roles table created';
END $$;

-- ============================================
-- PHASE 3: AUTH HELPER FUNCTIONS
-- (MUST RUN AFTER TABLES CREATED)
-- ============================================

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

DROP FUNCTION IF EXISTS auth.is_owner() CASCADE;

CREATE OR REPLACE FUNCTION auth.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role(ARRAY['owner']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.has_role(ARRAY['admin_finance', 'admin_logistic']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 3: Auth helper functions created';
END $$;

-- ============================================
-- PHASE 4: RLS POLICIES
-- (MUST RUN AFTER AUTH HELPERS)
-- ============================================

-- ================================================
-- 4.1 TENANTS POLICIES
-- ================================================
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

CREATE POLICY "system_insert_tenants"
ON public.tenants
FOR INSERT
WITH CHECK (true);

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 4.1: Tenants RLS policies applied';
END $$;

-- ================================================
-- 4.2 PROFILES POLICIES
-- ================================================
CREATE POLICY "users_view_own_profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "users_update_own_profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

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

CREATE POLICY "system_insert_profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 4.2: Profiles RLS policies applied';
END $$;

-- ================================================
-- 4.3 USER_TENANT_ROLES POLICIES
-- ================================================
CREATE POLICY "users_view_own_roles"
ON public.user_tenant_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "owners_view_tenant_roles"
ON public.user_tenant_roles
FOR SELECT
USING (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
);

CREATE POLICY "owners_insert_tenant_roles"
ON public.user_tenant_roles
FOR INSERT
WITH CHECK (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
  AND role != 'owner'
);

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
  AND role != 'owner'
);

CREATE POLICY "owners_delete_tenant_roles"
ON public.user_tenant_roles
FOR DELETE
USING (
  tenant_id = auth.get_active_tenant_id()
  AND auth.has_role(ARRAY['owner'])
  AND role != 'owner'
);

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

DO $$ BEGIN
  RAISE NOTICE '✓ Phase 4.3: User Tenant Roles RLS policies applied';
END $$;

-- ============================================
-- FINAL VALIDATION
-- ============================================
DO $$
DECLARE
  table_count INT;
  function_count INT;
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('tenants', 'profiles', 'user_tenant_roles');
  
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname IN (
    'handle_updated_at',
    'slugify',
    'generate_code',
    'clean_phone',
    'get_active_tenant_id',
    'has_role',
    'is_owner',
    'is_admin',
    'get_user_branch_id',
    'get_user_role'
  );
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('tenants', 'profiles', 'user_tenant_roles');
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 DEPLOYMENT SUCCESSFUL!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Tables created: % (expected: 3)', table_count;
  RAISE NOTICE '   ✅ Functions created: % (expected: 10)', function_count;
  RAISE NOTICE '   ✅ RLS policies applied: % (expected: 13+)', policy_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '   1. Verify tables in Table Editor';
  RAISE NOTICE '   2. Run seed data (01_core_seed.sql)';
  RAISE NOTICE '   3. Test authentication flow';
  RAISE NOTICE '   4. Initialize Next.js project';
  RAISE NOTICE '';
  
  ASSERT table_count = 3, 'Expected 3 tables, found ' || table_count;
  ASSERT function_count = 10, 'Expected 10 functions, found ' || function_count;
  ASSERT policy_count >= 13, 'Expected at least 13 policies, found ' || policy_count;
END $$;
