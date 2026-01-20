-- Migration: Robust invoice queue view (completed orders without invoices)
-- Date: 2026-01-20
-- Purpose:
-- - Provide a reliable, paginatable source for the Finance "Invoice Queue"
-- - Avoid PostgREST embed/left-join edge cases when filtering "no invoices"

BEGIN;

DROP VIEW IF EXISTS public.v_invoice_queue_service_orders CASCADE;

CREATE OR REPLACE VIEW public.v_invoice_queue_service_orders AS
SELECT
  so.id,
  so.tenant_id,
  so.order_number,
  so.service_title,
  so.status,
  so.updated_at,
  so.client_id,
  c.name AS client_name
FROM public.service_orders so
LEFT JOIN public.clients c ON c.id = so.client_id
WHERE so.status = 'completed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.tenant_id = so.tenant_id
      AND i.service_order_id = so.id
  );

COMMIT;
