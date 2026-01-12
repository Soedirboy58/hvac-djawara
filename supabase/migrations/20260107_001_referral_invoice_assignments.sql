-- Migration: Referral invoice assignments for sales partners
-- Date: 2026-01-07
-- Purpose:
-- - Track client referral (sales_partner) on clients
-- - When invoice is sent, assign it to the sales partner for their own collection workflow

BEGIN;

-- Ensure client referral columns exist (idempotent)
ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_referred_by_id
  ON public.clients(referred_by_id)
  WHERE referred_by_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_referred_by_name
  ON public.clients(referred_by_name)
  WHERE referred_by_name IS NOT NULL;

-- Main assignment table
CREATE TABLE IF NOT EXISTS public.referral_invoice_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sales_partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Snapshot fields to avoid cross-table RLS complexity for the sales partner
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  issue_date DATE,
  due_date DATE,
  amount_total NUMERIC(15,2) NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_collection', 'collected', 'cancelled')),
  partner_notes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One assignment per invoice (enforces idempotency from app)
CREATE UNIQUE INDEX IF NOT EXISTS referral_invoice_assignments_unique_invoice
  ON public.referral_invoice_assignments(tenant_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_referral_invoice_assignments_partner
  ON public.referral_invoice_assignments(tenant_id, sales_partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_invoice_assignments_status
  ON public.referral_invoice_assignments(tenant_id, status);

-- updated_at trigger (self-contained)
CREATE OR REPLACE FUNCTION public.update_referral_invoice_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_invoice_assignments_updated_at ON public.referral_invoice_assignments;
CREATE TRIGGER trigger_referral_invoice_assignments_updated_at
  BEFORE UPDATE ON public.referral_invoice_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_invoice_assignments_updated_at();

-- Prevent changing immutable fields even if UPDATE is allowed by policy
CREATE OR REPLACE FUNCTION public.enforce_referral_invoice_assignments_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'tenant_id is immutable';
  END IF;
  IF NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
    RAISE EXCEPTION 'invoice_id is immutable';
  END IF;
  IF NEW.sales_partner_id IS DISTINCT FROM OLD.sales_partner_id THEN
    RAISE EXCEPTION 'sales_partner_id is immutable';
  END IF;
  IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'invoice_number is immutable';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id is immutable';
  END IF;
  IF NEW.client_name IS DISTINCT FROM OLD.client_name THEN
    RAISE EXCEPTION 'client_name is immutable';
  END IF;
  IF NEW.client_phone IS DISTINCT FROM OLD.client_phone THEN
    RAISE EXCEPTION 'client_phone is immutable';
  END IF;
  IF NEW.client_address IS DISTINCT FROM OLD.client_address THEN
    RAISE EXCEPTION 'client_address is immutable';
  END IF;
  IF NEW.issue_date IS DISTINCT FROM OLD.issue_date THEN
    RAISE EXCEPTION 'issue_date is immutable';
  END IF;
  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    RAISE EXCEPTION 'due_date is immutable';
  END IF;
  IF NEW.amount_total IS DISTINCT FROM OLD.amount_total THEN
    RAISE EXCEPTION 'amount_total is immutable';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_invoice_assignments_immutable ON public.referral_invoice_assignments;
CREATE TRIGGER trigger_referral_invoice_assignments_immutable
  BEFORE UPDATE ON public.referral_invoice_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_referral_invoice_assignments_immutable();

-- RLS
ALTER TABLE public.referral_invoice_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT (finance)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referral_invoice_assignments'
      AND policyname = 'Referral invoice assignments readable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Referral invoice assignments readable by finance roles"
        ON public.referral_invoice_assignments FOR SELECT
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;

  -- SELECT (sales_partner)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referral_invoice_assignments'
      AND policyname = 'Referral invoice assignments readable by sales partner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Referral invoice assignments readable by sales partner"
        ON public.referral_invoice_assignments FOR SELECT
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND sales_partner_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('sales_partner')
          )
        );
    $policy$;
  END IF;

  -- INSERT (finance)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referral_invoice_assignments'
      AND policyname = 'Referral invoice assignments writable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Referral invoice assignments writable by finance roles"
        ON public.referral_invoice_assignments FOR INSERT
        WITH CHECK (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;

  -- UPDATE (finance)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referral_invoice_assignments'
      AND policyname = 'Referral invoice assignments updatable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Referral invoice assignments updatable by finance roles"
        ON public.referral_invoice_assignments FOR UPDATE
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        )
        WITH CHECK (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;

  -- UPDATE (sales_partner) - status/notes only enforced by immutable trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referral_invoice_assignments'
      AND policyname = 'Referral invoice assignments updatable by sales partner'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Referral invoice assignments updatable by sales partner"
        ON public.referral_invoice_assignments FOR UPDATE
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND sales_partner_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('sales_partner')
          )
        )
        WITH CHECK (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND sales_partner_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('sales_partner')
          )
        );
    $policy$;
  END IF;

  -- DELETE (finance)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referral_invoice_assignments'
      AND policyname = 'Referral invoice assignments deletable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Referral invoice assignments deletable by finance roles"
        ON public.referral_invoice_assignments FOR DELETE
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.referral_invoice_assignments.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;
END;
$$;

COMMIT;
