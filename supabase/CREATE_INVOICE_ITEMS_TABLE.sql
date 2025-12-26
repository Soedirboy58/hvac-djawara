-- ============================================
-- CREATE INVOICE ITEMS TABLE
-- Line items for invoices (services + spareparts)
-- ============================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  -- Snapshot / free text
  description TEXT NOT NULL,
  quantity NUMERIC(15,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Unit',

  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,

  line_total NUMERIC(15,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
  ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant
  ON public.invoice_items(tenant_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trigger_invoice_items_updated_at ON public.invoice_items;
CREATE TRIGGER trigger_invoice_items_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Finance roles can manage invoice items within active tenant
CREATE POLICY "Invoice items manageable by finance roles"
  ON public.invoice_items
  FOR ALL
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoice_items.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  )
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoice_items.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

COMMENT ON TABLE public.invoice_items IS 'Line items for invoices (services/spareparts). Totals are calculated client-side and stored for reporting.';
