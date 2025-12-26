-- ============================================
-- CREATE INVOICES TABLE (Finance / Billing)
-- Minimal invoicing model to support:
-- - KPI paid/unpaid
-- - Invoice queue from completed service orders
-- - Manual invoices from quotations or special requests
-- ============================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  invoice_number TEXT NOT NULL,

  -- Source links (optional)
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,

  -- Client snapshot (optional link to clients)
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,

  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  amount_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'unpaid', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,

  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uniqueness & indexes
CREATE UNIQUE INDEX IF NOT EXISTS invoices_tenant_number_unique
  ON public.invoices(tenant_id, invoice_number);

-- Prevent multiple invoices for the same service order (if linked)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_unique_service_order
  ON public.invoices(tenant_id, service_order_id)
  WHERE service_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
  ON public.invoices(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_paid_at
  ON public.invoices(tenant_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_service_order
  ON public.invoices(service_order_id);

CREATE INDEX IF NOT EXISTS idx_invoices_quotation
  ON public.invoices(quotation_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON public.invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoices_updated_at();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Read invoices within active tenant (admins/finance)
CREATE POLICY "Invoices readable by finance roles"
  ON public.invoices FOR SELECT
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoices.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

CREATE POLICY "Invoices writable by finance roles"
  ON public.invoices FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoices.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

CREATE POLICY "Invoices updatable by finance roles"
  ON public.invoices FOR UPDATE
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoices.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  )
  WITH CHECK (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoices.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

CREATE POLICY "Invoices deletable by finance roles"
  ON public.invoices FOR DELETE
  USING (
    tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.invoices.tenant_id
        AND ur.is_active = true
        AND ur.role IN ('owner', 'admin_finance')
    )
  );

COMMENT ON TABLE public.invoices IS 'Billing invoices linked to service orders or quotations; supports paid/unpaid KPI and invoice queue.';
COMMENT ON COLUMN public.invoices.status IS 'draft, unpaid, paid, cancelled';
