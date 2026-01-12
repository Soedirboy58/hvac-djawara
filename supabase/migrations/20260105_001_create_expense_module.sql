-- Migration: Create Expense/Income foundation (Phase: Finance)
-- Date: 2026-01-05
-- Purpose:
-- 1) Operational expenses table + categories
-- 2) Mapping reimburse_categories -> expense_categories
-- 3) Auto-sync paid reimburse into expenses (when mapping exists)
--
-- Apply in Supabase SQL editor.

BEGIN;

-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.cashflow_activity AS ENUM ('operational', 'financing', 'investing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- MASTER: expense_categories
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  activity public.cashflow_activity NOT NULL DEFAULT 'operational',
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expense_categories_unique_name UNIQUE (tenant_id, activity, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON public.expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_activity ON public.expense_categories(activity);

DROP TRIGGER IF EXISTS set_updated_at ON public.expense_categories;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DETAIL: expense_transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  activity public.cashflow_activity NOT NULL DEFAULT 'operational',
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,

  amount NUMERIC(14,2) NOT NULL,
  occurred_date DATE NOT NULL DEFAULT (NOW()::date),
  description TEXT,

  -- Optional: who/what was paid
  counterparty_name TEXT,
  related_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,

  -- Source linking (for sync)
  source_type TEXT,
  source_id UUID,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expense_transactions_source_unique UNIQUE (tenant_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_transactions_tenant ON public.expense_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_activity ON public.expense_transactions(activity);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_date ON public.expense_transactions(occurred_date);

DROP TRIGGER IF EXISTS set_updated_at ON public.expense_transactions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.expense_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MAPPING: reimburse_categories -> expense_categories
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reimburse_category_expense_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reimburse_category_id UUID NOT NULL REFERENCES public.reimburse_categories(id) ON DELETE CASCADE,
  expense_category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  CONSTRAINT reimburse_category_expense_map_unique UNIQUE (tenant_id, reimburse_category_id)
);

CREATE INDEX IF NOT EXISTS idx_reimburse_category_expense_map_tenant ON public.reimburse_category_expense_map(tenant_id);

ALTER TABLE public.reimburse_category_expense_map ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (Finance/Admin)
-- =====================================================
-- expense_categories
DROP POLICY IF EXISTS expense_categories_select_finance ON public.expense_categories;
CREATE POLICY expense_categories_select_finance
ON public.expense_categories
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS expense_categories_insert_finance ON public.expense_categories;
CREATE POLICY expense_categories_insert_finance
ON public.expense_categories
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS expense_categories_update_finance ON public.expense_categories;
CREATE POLICY expense_categories_update_finance
ON public.expense_categories
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

DROP POLICY IF EXISTS expense_categories_delete_finance ON public.expense_categories;
CREATE POLICY expense_categories_delete_finance
ON public.expense_categories
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- expense_transactions
DROP POLICY IF EXISTS expense_transactions_select_finance ON public.expense_transactions;
CREATE POLICY expense_transactions_select_finance
ON public.expense_transactions
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS expense_transactions_insert_finance ON public.expense_transactions;
CREATE POLICY expense_transactions_insert_finance
ON public.expense_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS expense_transactions_update_finance ON public.expense_transactions;
CREATE POLICY expense_transactions_update_finance
ON public.expense_transactions
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

DROP POLICY IF EXISTS expense_transactions_delete_finance ON public.expense_transactions;
CREATE POLICY expense_transactions_delete_finance
ON public.expense_transactions
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

-- reimburse_category_expense_map
DROP POLICY IF EXISTS reimburse_category_expense_map_select_finance ON public.reimburse_category_expense_map;
CREATE POLICY reimburse_category_expense_map_select_finance
ON public.reimburse_category_expense_map
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

DROP POLICY IF EXISTS reimburse_category_expense_map_upsert_finance ON public.reimburse_category_expense_map;
CREATE POLICY reimburse_category_expense_map_upsert_finance
ON public.reimburse_category_expense_map
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

-- =====================================================
-- TRIGGER: when reimburse_requests becomes paid, create expense transaction
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_reimburse_paid_to_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  mapped_expense_category UUID;
  occurred DATE;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT m.expense_category_id
      INTO mapped_expense_category
    FROM public.reimburse_category_expense_map m
    WHERE m.tenant_id = NEW.tenant_id
      AND m.reimburse_category_id = NEW.category_id
    LIMIT 1;

    IF mapped_expense_category IS NULL THEN
      RETURN NEW; -- mapping not set yet
    END IF;

    occurred := COALESCE((NEW.decided_at)::date, (NEW.submitted_at)::date, NOW()::date);

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
      mapped_expense_category,
      NEW.amount,
      occurred,
      COALESCE(NEW.description, 'Reimburse paid'),
      'Reimburse',
      'reimburse',
      NEW.id,
      NEW.decided_by
    )
    ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reimburse_paid_to_expense ON public.reimburse_requests;
CREATE TRIGGER trg_sync_reimburse_paid_to_expense
AFTER UPDATE OF status ON public.reimburse_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_reimburse_paid_to_expense();

COMMIT;
