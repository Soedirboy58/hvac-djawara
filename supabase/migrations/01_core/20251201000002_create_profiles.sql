-- ============================================
-- Migration: Create Profiles Table
-- Domain: Core
-- Purpose: Extended user profile (1:1 with auth.users)
-- Dependencies: auth.users (Supabase), tenants
-- Author: System Architect
-- Date: 2025-12-01
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: TABLE CREATION
-- ================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  -- Primary Key (FK to auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Info
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  phone_alt TEXT,
  address TEXT,
  
  -- Tenant Context
  active_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- SECTION 2: INDEXES
-- ================================================
CREATE INDEX idx_profiles_active_tenant ON public.profiles(active_tenant_id);
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name) 
  WHERE full_name IS NOT NULL;

-- ================================================
-- SECTION 3: TRIGGERS
-- ================================================

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Auto-create profile for new user
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

COMMENT ON FUNCTION public.create_profile_for_new_user() IS 
'Auto-create profile record when new user registers.
Triggered after INSERT on auth.users.
Extracts full_name from user metadata or uses email as fallback.';

-- ================================================
-- SECTION 4: RLS (Enable only, policies in separate file)
-- ================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 5: COMMENTS (Documentation)
-- ================================================
COMMENT ON TABLE public.profiles IS 
'Extended user profile (1:1 relationship with auth.users).
Automatically created when user registers via trigger.
Contains additional user information not stored in auth.users.
See: PANDUAN-AWAL.md → Domain 1: CORE/IDENTITY';

COMMENT ON COLUMN public.profiles.id IS 
'Primary key, references auth.users.id.
1:1 relationship - one profile per auth user.
CASCADE delete when auth user is deleted.';

COMMENT ON COLUMN public.profiles.active_tenant_id IS 
'Current active tenant for this user.
NULL if user has no tenant access or not selected.
User can switch active tenant if they have access to multiple tenants.
Used by auth.get_active_tenant_id() for RLS filtering.';

COMMENT ON COLUMN public.profiles.full_name IS 
'User full name (display name).
Auto-populated from auth.users.raw_user_meta_data on registration.
Can be updated by user.';

COMMENT ON COLUMN public.profiles.phone IS 
'Primary phone number.
Recommended format: E.164 (+62812...)
Use clean_phone() function for formatting.';

COMMENT ON COLUMN public.profiles.phone_alt IS 
'Alternative phone number (optional).
For emergency contact or WhatsApp number if different.';

-- ================================================
-- SECTION 6: VALIDATION
-- ================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  trigger_count INT;
  fk_count INT;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO table_exists;
  
  ASSERT table_exists, 'Table profiles not created';
  
  -- Check RLS enabled
  SELECT rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  INTO rls_enabled;
  
  ASSERT rls_enabled, 'RLS not enabled on profiles';
  
  -- Check triggers
  SELECT COUNT(*) 
  FROM pg_trigger 
  WHERE tgrelid = 'public.profiles'::regclass
  INTO trigger_count;
  
  ASSERT trigger_count >= 1, 
         'Expected at least 1 trigger on profiles, found ' || trigger_count;
  
  -- Check foreign keys
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_name = 'profiles' 
  AND constraint_type = 'FOREIGN KEY'
  INTO fk_count;
  
  ASSERT fk_count >= 2, 
         'Expected at least 2 foreign keys (auth.users, tenants), found ' || fk_count;
  
  RAISE NOTICE '✓ Profiles table created successfully';
  RAISE NOTICE '  - Table exists: %', table_exists;
  RAISE NOTICE '  - RLS enabled: %', rls_enabled;
  RAISE NOTICE '  - Triggers: %', trigger_count;
  RAISE NOTICE '  - Foreign keys: %', fk_count;
END $$;
