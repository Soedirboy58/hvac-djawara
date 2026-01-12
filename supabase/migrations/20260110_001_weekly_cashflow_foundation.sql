-- Migration: Weekly cashflow foundation (service order completion + value)
-- Date: 2026-01-10
-- Purpose:
-- - Support weekly recap (Mon–Sat, cutoff 16:00) based on completed orders
-- - Allow admin to fill final value per completed order (potensi income)

BEGIN;

-- Add completion timestamp and final value fields (idempotent)
ALTER TABLE IF EXISTS public.service_orders
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.service_orders
  ADD COLUMN IF NOT EXISTS final_amount NUMERIC(14,2);

-- Backfill completed_at from actual_end_time if available (best-effort)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_orders'
      AND column_name = 'actual_end_time'
  ) THEN
    UPDATE public.service_orders
    SET completed_at = actual_end_time
    WHERE completed_at IS NULL
      AND status = 'completed'
      AND actual_end_time IS NOT NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_service_orders_completed_at
  ON public.service_orders(tenant_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_final_amount
  ON public.service_orders(tenant_id, final_amount)
  WHERE final_amount IS NOT NULL;

COMMIT;
