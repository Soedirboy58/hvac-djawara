-- Migration: Supplier module (AP + price comparison)
-- Date: 2026-01-05
-- Purpose:
-- - Manage suppliers
-- - Track supplier bills (utang) and payments
-- - Optional: post supplier payments to expense_transactions for cashflow
-- - Track supplier product price list for comparison
--
-- Apply in Supabase SQL editor AFTER expense module migration.

BEGIN;

-- ================================================
-- ENUMS
-- ================================================
DO $$ BEGIN
  CREATE TYPE public.supplier_bill_status AS ENUM ('unpaid', 'partial', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- TABLE: suppliers
-- ================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT suppliers_unique_name UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.suppliers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: supplier_products (price list)
-- ================================================
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL,
  sku TEXT,
  unit TEXT,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT supplier_products_unique UNIQUE (tenant_id, supplier_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_tenant ON public.supplier_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.supplier_products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: supplier_bills (AP / utang)
-- ================================================
CREATE TABLE IF NOT EXISTS public.supplier_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,

  bill_number TEXT,
  bill_date DATE NOT NULL DEFAULT (NOW()::date),
  due_date DATE,

  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.supplier_bill_status NOT NULL DEFAULT 'unpaid',
  notes TEXT,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_bills_tenant ON public.supplier_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_supplier ON public.supplier_bills(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_status ON public.supplier_bills(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.supplier_bills;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.supplier_bills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TABLE: supplier_payments
-- ================================================
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_bill_id UUID NOT NULL REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,

  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_date DATE NOT NULL DEFAULT (NOW()::date),

  -- Optional classification for cashflow
  expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,

  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT supplier_payments_amount_positive CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_tenant ON public.supplier_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_bill ON public.supplier_payments(supplier_bill_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_paid_date ON public.supplier_payments(paid_date);

DROP TRIGGER IF EXISTS set_updated_at ON public.supplier_payments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES (Finance/Admin)
-- ================================================
-- suppliers
DROP POLICY IF EXISTS suppliers_select_finance ON public.suppliers;
CREATE POLICY suppliers_select_finance
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS suppliers_write_finance ON public.suppliers;
CREATE POLICY suppliers_write_finance
ON public.suppliers
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- supplier_products
DROP POLICY IF EXISTS supplier_products_select_finance ON public.supplier_products;
CREATE POLICY supplier_products_select_finance
ON public.supplier_products
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS supplier_products_write_finance ON public.supplier_products;
CREATE POLICY supplier_products_write_finance
ON public.supplier_products
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- supplier_bills
DROP POLICY IF EXISTS supplier_bills_select_finance ON public.supplier_bills;
CREATE POLICY supplier_bills_select_finance
ON public.supplier_bills
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS supplier_bills_write_finance ON public.supplier_bills;
CREATE POLICY supplier_bills_write_finance
ON public.supplier_bills
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- supplier_payments
DROP POLICY IF EXISTS supplier_payments_select_finance ON public.supplier_payments;
CREATE POLICY supplier_payments_select_finance
ON public.supplier_payments
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS supplier_payments_write_finance ON public.supplier_payments;
CREATE POLICY supplier_payments_write_finance
ON public.supplier_payments
FOR ALL
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
)
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- ================================================
-- Helpers: keep payment.supplier_id consistent with bill
-- ================================================
CREATE OR REPLACE FUNCTION public.enforce_supplier_payment_supplier_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  bill_supplier UUID;
BEGIN
  SELECT supplier_id INTO bill_supplier
  FROM public.supplier_bills
  WHERE id = NEW.supplier_bill_id;

  IF bill_supplier IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier_bill_id';
  END IF;

  NEW.supplier_id := bill_supplier;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_supplier_payment_supplier_id ON public.supplier_payments;
CREATE TRIGGER trg_enforce_supplier_payment_supplier_id
BEFORE INSERT OR UPDATE OF supplier_bill_id ON public.supplier_payments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_supplier_payment_supplier_id();

-- ================================================
-- Helper: update bill status based on total paid
-- ================================================
CREATE OR REPLACE FUNCTION public.recalc_supplier_bill_status(p_bill_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  total NUMERIC(14,2);
  paid  NUMERIC(14,2);
  new_status public.supplier_bill_status;
BEGIN
  SELECT COALESCE(total_amount, 0) INTO total
  FROM public.supplier_bills
  WHERE id = p_bill_id;

  SELECT COALESCE(SUM(amount), 0) INTO paid
  FROM public.supplier_payments
  WHERE supplier_bill_id = p_bill_id;

  IF total = 0 THEN
    new_status := 'unpaid';
  ELSIF paid <= 0 THEN
    new_status := 'unpaid';
  ELSIF paid < total THEN
    new_status := 'partial';
  ELSE
    new_status := 'paid';
  END IF;

  UPDATE public.supplier_bills
  SET status = new_status
  WHERE id = p_bill_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_supplier_payments_recalc_bill()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_supplier_bill_status(OLD.supplier_bill_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_supplier_bill_status(NEW.supplier_bill_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_supplier_payments_recalc_bill ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payments_recalc_bill
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_supplier_payments_recalc_bill();

-- ================================================
-- Optional: post supplier payments into expense_transactions
-- ================================================
CREATE OR REPLACE FUNCTION public.sync_supplier_payment_to_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  supplier_name TEXT;
BEGIN
  IF NEW.expense_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO supplier_name
  FROM public.suppliers
  WHERE id = NEW.supplier_id;

  INSERT INTO public.expense_transactions (
    tenant_id,
    activity,
    category_id,
    amount,
    occurred_date,
    description,
    counterparty_name,
    source_type,
    source_id,
    created_by
  ) VALUES (
    NEW.tenant_id,
    'operational',
    NEW.expense_category_id,
    NEW.amount,
    NEW.paid_date,
    COALESCE(NEW.notes, 'Supplier payment'),
    supplier_name,
    'supplier_payment',
    NEW.id,
    NEW.created_by
  )
  ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_supplier_payment_to_expense ON public.supplier_payments;
CREATE TRIGGER trg_sync_supplier_payment_to_expense
AFTER INSERT ON public.supplier_payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_supplier_payment_to_expense();

COMMIT;
