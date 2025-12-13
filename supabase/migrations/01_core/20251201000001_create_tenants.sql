-- ============================================
-- Migration: Create Tenants Table
-- Domain: Core
-- Purpose: Multi-tenant foundation - root table
-- Dependencies: None (root table)
-- Author: System Architect
-- Date: 2025-12-01
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: TABLE CREATION
-- ================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique Identifiers
  slug TEXT NOT NULL UNIQUE,
  
  -- Company Info
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  
  -- Address
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  
  -- Subscription
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_plan subscription_plan NOT NULL DEFAULT 'basic',
  subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_expires_at TIMESTAMPTZ,
  
  -- Configuration
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
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT email_format CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT trial_expiry_check CHECK (
    subscription_status != 'trial' OR subscription_expires_at IS NOT NULL
  )
);

-- ================================================
-- SECTION 2: INDEXES
-- ================================================
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_subscription_status ON public.tenants(subscription_status);
CREATE INDEX idx_tenants_is_active ON public.tenants(is_active) WHERE is_active = true;
CREATE INDEX idx_tenants_subscription_expires ON public.tenants(subscription_expires_at) 
  WHERE subscription_status = 'trial';

-- ================================================
-- SECTION 3: TRIGGERS
-- ================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-generate slug from name if not provided
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

-- ================================================
-- SECTION 4: RLS (Enable only, policies in separate file)
-- ================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 5: COMMENTS (Documentation)
-- ================================================
COMMENT ON TABLE public.tenants IS 
'Perusahaan jasa yang subscribe platform. 
Root table untuk multi-tenant isolation.
Setiap tenant adalah instance terpisah dari perusahaan jasa (AC, HVAC, dll).
See: PANDUAN-AWAL.md → Domain 2: TENANT/COMPANY';

COMMENT ON COLUMN public.tenants.slug IS 
'URL-safe identifier untuk subdomain.
Format: lowercase alphanumeric with hyphens only.
Example: "ac-jaya" → https://ac-jaya.platform.com
Auto-generated from name if not provided.';

COMMENT ON COLUMN public.tenants.subscription_status IS 
'Subscription status:
- trial: 14 hari gratis (expires_at wajib diisi)
- active: Berbayar dan aktif
- suspended: Tidak bisa akses (belum bayar)
- cancelled: Soft delete (berhenti berlangganan)';

COMMENT ON COLUMN public.tenants.subscription_plan IS 
'Subscription plan tier:
- basic: Up to 10 users, basic features
- pro: Up to 50 users, advanced features  
- enterprise: Unlimited users, all features + custom';

COMMENT ON COLUMN public.tenants.business_hours IS 
'Jam operasional per hari (JSON).
Format: {"day": "HH:MM-HH:MM" or null}
null = hari libur.
Digunakan untuk auto-scheduling dan notification.';

COMMENT ON COLUMN public.tenants.timezone IS 
'Timezone untuk semua timestamp di tenant ini.
Default: Asia/Jakarta.
Format: IANA timezone database name.';

-- ================================================
-- SECTION 6: VALIDATION
-- ================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  index_count INT;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tenants'
  ) INTO table_exists;
  
  ASSERT table_exists, 'Table tenants not created';
  
  -- Check RLS enabled
  SELECT rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'tenants'
  INTO rls_enabled;
  
  ASSERT rls_enabled, 'RLS not enabled on tenants';
  
  -- Check indexes
  SELECT COUNT(*) 
  FROM pg_indexes 
  WHERE tablename = 'tenants'
  INTO index_count;
  
  ASSERT index_count >= 4, 
         'Expected at least 4 indexes, found ' || index_count;
  
  RAISE NOTICE '✓ Tenants table created successfully';
  RAISE NOTICE '  - Table exists: %', table_exists;
  RAISE NOTICE '  - RLS enabled: %', rls_enabled;
  RAISE NOTICE '  - Indexes created: %', index_count;
END $$;
