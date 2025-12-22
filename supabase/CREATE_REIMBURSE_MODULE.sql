-- ============================================
-- REIMBURSE MODULE (MINIMAL)
-- - Categories master
-- - Reimburse requests inbox (receipt required)
-- - RLS scoped by active tenant
-- ============================================

-- ENUM (optional but safer than free-text)
DO $$ BEGIN
  CREATE TYPE public.reimburse_status AS ENUM ('submitted', 'approved', 'rejected', 'paid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLE: reimburse_categories
-- ============================================
CREATE TABLE IF NOT EXISTS public.reimburse_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_reimburse_categories_tenant ON public.reimburse_categories (tenant_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.reimburse_categories;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.reimburse_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TABLE: reimburse_requests
-- ============================================
CREATE TABLE IF NOT EXISTS public.reimburse_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.reimburse_categories(id) ON DELETE RESTRICT,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  receipt_path TEXT NOT NULL,
  status public.reimburse_status NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimburse_requests_tenant ON public.reimburse_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_reimburse_requests_submitted_by ON public.reimburse_requests (submitted_by);
CREATE INDEX IF NOT EXISTS idx_reimburse_requests_status ON public.reimburse_requests (status);

DROP TRIGGER IF EXISTS set_updated_at ON public.reimburse_requests;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.reimburse_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.reimburse_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimburse_requests ENABLE ROW LEVEL SECURITY;

-- Categories: finance only (owner/admin_finance) for active tenant
DROP POLICY IF EXISTS reimburse_categories_select_finance ON public.reimburse_categories;
CREATE POLICY reimburse_categories_select_finance
ON public.reimburse_categories
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS reimburse_categories_insert_finance ON public.reimburse_categories;
CREATE POLICY reimburse_categories_insert_finance
ON public.reimburse_categories
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS reimburse_categories_update_finance ON public.reimburse_categories;
CREATE POLICY reimburse_categories_update_finance
ON public.reimburse_categories
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS reimburse_categories_delete_finance ON public.reimburse_categories;
CREATE POLICY reimburse_categories_delete_finance
ON public.reimburse_categories
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- Requests: submitter can see own; finance can see all (active tenant)
DROP POLICY IF EXISTS reimburse_requests_select_own ON public.reimburse_requests;
CREATE POLICY reimburse_requests_select_own
ON public.reimburse_requests
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND submitted_by = auth.uid()
);

DROP POLICY IF EXISTS reimburse_requests_select_finance ON public.reimburse_requests;
CREATE POLICY reimburse_requests_select_finance
ON public.reimburse_requests
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS reimburse_requests_insert_own ON public.reimburse_requests;
CREATE POLICY reimburse_requests_insert_own
ON public.reimburse_requests
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND submitted_by = auth.uid()
  AND receipt_path IS NOT NULL
);

-- Finance can update status/decision fields
DROP POLICY IF EXISTS reimburse_requests_update_finance ON public.reimburse_requests;
CREATE POLICY reimburse_requests_update_finance
ON public.reimburse_requests
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);
