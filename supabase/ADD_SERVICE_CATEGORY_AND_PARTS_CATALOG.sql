-- ============================================
-- ADD SERVICE CATEGORY (A-D) + PARTS CATALOG/PRICING
-- Purpose:
-- - Allow admin to plan A-D category on service_orders
-- - Allow technician to set actual A-D category after work
-- - Allow technician to select parts (no pricing visibility)
-- - Allow finance/admin to manage pricing + high-value flag
-- ============================================

-- 1) Enum: service category A-D
DO $$ BEGIN
  CREATE TYPE public.service_category AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.service_category IS 'Service Category: A=Maintenance, B=Minor Repair (electrical/support), C=Major Repair (main parts), D=Refrigeration System work.';

-- 2) Add planned/actual category columns to service_orders
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS service_category_planned public.service_category,
  ADD COLUMN IF NOT EXISTS service_category_actual public.service_category,
  ADD COLUMN IF NOT EXISTS service_category_tags public.service_category[];

COMMENT ON COLUMN public.service_orders.service_category_planned IS 'Planned category (set by admin during order creation).';
COMMENT ON COLUMN public.service_orders.service_category_actual IS 'Actual category based on field work (set by technician/report).';
COMMENT ON COLUMN public.service_orders.service_category_tags IS 'Optional additional categories (e.g., {C,D} when major repair includes refrigeration-system work).';

CREATE INDEX IF NOT EXISTS idx_service_orders_category_planned
  ON public.service_orders(tenant_id, service_category_planned);

CREATE INDEX IF NOT EXISTS idx_service_orders_category_actual
  ON public.service_orders(tenant_id, service_category_actual);

-- 3) Parts catalog (technicians can READ; admins can manage)
CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  part_code TEXT,
  name TEXT NOT NULL,
  default_unit TEXT NOT NULL DEFAULT 'pcs',

  -- Optional hint (mostly for B/C/D)
  category_hint public.service_category,

  availability_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability_status IN ('unknown', 'ready', 'limited', 'out_of_stock', 'discontinued')),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS parts_catalog_tenant_name_unique
  ON public.parts_catalog(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_parts_catalog_tenant_active
  ON public.parts_catalog(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_parts_catalog_tenant_availability
  ON public.parts_catalog(tenant_id, availability_status);

DROP TRIGGER IF EXISTS trigger_parts_catalog_updated_at ON public.parts_catalog;
CREATE TRIGGER trigger_parts_catalog_updated_at
  BEFORE UPDATE ON public.parts_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;

-- Readable by internal roles in active tenant
CREATE POLICY "Parts catalog readable by internal roles"
  ON public.parts_catalog FOR SELECT
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_catalog.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head', 'technician', 'helper')
    )
  );

-- Writable by admin/finance/tech_head (adjust later if needed)
CREATE POLICY "Parts catalog writable by admin roles"
  ON public.parts_catalog FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_catalog.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

CREATE POLICY "Parts catalog updatable by admin roles"
  ON public.parts_catalog FOR UPDATE
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_catalog.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  )
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_catalog.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

CREATE POLICY "Parts catalog deletable by admin roles"
  ON public.parts_catalog FOR DELETE
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_catalog.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance', 'admin_logistic', 'tech_head')
    )
  );

COMMENT ON TABLE public.parts_catalog IS 'Tenant-scoped parts master list. Technicians can select parts; pricing lives in parts_pricing (restricted).';

-- 4) Pricing table (restricted to owner + admin_finance)
CREATE TABLE IF NOT EXISTS public.parts_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts_catalog(id) ON DELETE CASCADE,

  currency TEXT NOT NULL DEFAULT 'IDR',
  price_min NUMERIC(15,2),
  price_max NUMERIC(15,2),

  is_high_value BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active pricing row per part (allows history)
CREATE UNIQUE INDEX IF NOT EXISTS parts_pricing_one_active_per_part
  ON public.parts_pricing(tenant_id, part_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_parts_pricing_tenant_high_value
  ON public.parts_pricing(tenant_id, is_high_value)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trigger_parts_pricing_updated_at ON public.parts_pricing;
CREATE TRIGGER trigger_parts_pricing_updated_at
  BEFORE UPDATE ON public.parts_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.parts_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parts pricing readable by finance roles"
  ON public.parts_pricing FOR SELECT
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_pricing.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

CREATE POLICY "Parts pricing writable by finance roles"
  ON public.parts_pricing FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_pricing.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

CREATE POLICY "Parts pricing updatable by finance roles"
  ON public.parts_pricing FOR UPDATE
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_pricing.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  )
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_pricing.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

CREATE POLICY "Parts pricing deletable by finance roles"
  ON public.parts_pricing FOR DELETE
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.parts_pricing.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

COMMENT ON TABLE public.parts_pricing IS 'Restricted pricing/high-value flags per part. Not readable by technicians.';
