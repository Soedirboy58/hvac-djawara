-- Migration: Invoice sent/paid flow
-- Date: 2026-01-05
-- Purpose:
-- - Add invoice flow: draft -> sent -> paid
-- - Add sent_at timestamp
-- - Expand status CHECK constraint to include 'sent'

BEGIN;

-- Add sent_at column (idempotent)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Index for dashboards (optional but useful)
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_sent_at
  ON public.invoices(tenant_id, sent_at DESC);

-- Expand status check constraint to include 'sent'
DO $$
DECLARE
  c RECORD;
  existing_def TEXT;
BEGIN
  -- If invoices_status_check already exists AND already allows 'sent', skip.
  SELECT pg_get_constraintdef(oid)
    INTO existing_def
  FROM pg_constraint
  WHERE conrelid = 'public.invoices'::regclass
    AND conname = 'invoices_status_check';

  IF existing_def IS NOT NULL AND existing_def ILIKE '%sent%' THEN
    RETURN;
  END IF;

  -- Drop any existing check constraints that reference status (best-effort)
  FOR c IN
    SELECT conname, oid
    FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass
      AND contype = 'c'
  LOOP
    IF pg_get_constraintdef(c.oid) ILIKE '%status%' THEN
      EXECUTE format('ALTER TABLE public.invoices DROP CONSTRAINT %I', c.conname);
    END IF;
  END LOOP;

  -- Recreate the constraint with the expanded allowed set.
  BEGIN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_status_check
      CHECK (status IN ('draft', 'sent', 'unpaid', 'paid', 'cancelled'));
  EXCEPTION
    WHEN duplicate_object THEN
      -- Someone created it concurrently; OK.
      NULL;
  END;
END;
$$;

COMMENT ON COLUMN public.invoices.status IS 'draft, sent, unpaid (legacy), paid, cancelled';

COMMIT;
