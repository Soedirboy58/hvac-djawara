-- ============================================
-- CLIENTS TABLE MIGRATION
-- ============================================
-- Purpose: Create clients table for CRM module
-- Project: HVAC/AC Service Management Platform
-- Date: 2025-12-01
-- 
-- INSTRUCTIONS:
-- Run this AFTER DEPLOY_MASTER.sql is deployed successfully
-- ============================================

-- ================================================
-- CREATE CLIENTS TABLE
-- ================================================
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
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- ================================================
-- CREATE INDEXES
-- ================================================
CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX idx_clients_name ON public.clients(name);
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_active ON public.clients(is_active) WHERE is_active = true;
CREATE INDEX idx_clients_created_by ON public.clients(created_by);

-- ================================================
-- CREATE TRIGGERS
-- ================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- ENABLE RLS
-- ================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- SELECT: Users can view clients in their active tenant
CREATE POLICY "users_view_tenant_clients"
ON public.clients
FOR SELECT
USING (tenant_id = public.get_active_tenant_id());

-- INSERT: Owner, admins, and sales partners can create clients
CREATE POLICY "users_insert_clients"
ON public.clients
FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
);

-- UPDATE: Owner, admins, and sales partners can update clients
CREATE POLICY "users_update_clients"
ON public.clients
FOR UPDATE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
);

-- DELETE: Only owner and admins can delete clients (soft delete preferred)
CREATE POLICY "admins_delete_clients"
ON public.clients
FOR DELETE
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance'])
);

-- ================================================
-- TABLE COMMENTS
-- ================================================
COMMENT ON TABLE public.clients IS 
'Client/customer records for CRM module. Scoped by tenant_id for multi-tenant isolation.';

COMMENT ON COLUMN public.clients.tenant_id IS 'Reference to tenant (company) that owns this client';
COMMENT ON COLUMN public.clients.name IS 'Client full name or company name';
COMMENT ON COLUMN public.clients.email IS 'Client email address (optional)';
COMMENT ON COLUMN public.clients.phone IS 'Client primary phone number (required)';
COMMENT ON COLUMN public.clients.address IS 'Client street address';
COMMENT ON COLUMN public.clients.city IS 'Client city';
COMMENT ON COLUMN public.clients.province IS 'Client province/state';
COMMENT ON COLUMN public.clients.postal_code IS 'Client postal/zip code';
COMMENT ON COLUMN public.clients.notes IS 'Additional notes about client';
COMMENT ON COLUMN public.clients.is_active IS 'Active status (use for soft delete)';
COMMENT ON COLUMN public.clients.created_by IS 'User who created this client record';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) INTO table_exists;
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'clients';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CLIENTS TABLE MIGRATION COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Table created: %', table_exists;
  RAISE NOTICE '   ✅ RLS policies applied: % (expected: 4)', policy_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  ASSERT table_exists = true, 'Clients table not created';
  ASSERT policy_count = 4, 'Expected 4 RLS policies, found ' || policy_count;
END $$;
