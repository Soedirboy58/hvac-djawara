-- Migration: Allow sales partners to view assigned team for referred orders
-- Date: 2026-01-12
-- Purpose:
-- - Fix mismatch where sales_partner can see service order detail, but Assigned Team shows Unassigned
--   because RLS blocks reads on work_order_assignments/technicians.
-- - Allow SELECT on assignments + technician names ONLY when the service order belongs to a client
--   referred by the current sales partner (auth.uid()).

BEGIN;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE IF EXISTS public.work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technicians ENABLE ROW LEVEL SECURITY;

-- Sales partners can read assignments for orders of clients they referred
DROP POLICY IF EXISTS "Assignments readable by sales partner (referred orders)" ON public.work_order_assignments;
CREATE POLICY "Assignments readable by sales partner (referred orders)"
  ON public.work_order_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_orders so
      JOIN public.clients c ON c.id = so.client_id
      JOIN public.user_tenant_roles utr
        ON utr.tenant_id = so.tenant_id
       AND utr.user_id = auth.uid()
       AND utr.is_active = true
      WHERE so.id = work_order_assignments.service_order_id
        AND c.referred_by_id = auth.uid()
        AND utr.role = 'sales_partner'
    )
  );

-- Sales partners can read technician rows ONLY when that technician is assigned
-- to an order of a client they referred.
DROP POLICY IF EXISTS "Technicians readable by sales partner (referred orders)" ON public.technicians;
CREATE POLICY "Technicians readable by sales partner (referred orders)"
  ON public.technicians
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_order_assignments woa
      JOIN public.service_orders so ON so.id = woa.service_order_id
      JOIN public.clients c ON c.id = so.client_id
      JOIN public.user_tenant_roles utr
        ON utr.tenant_id = so.tenant_id
       AND utr.user_id = auth.uid()
       AND utr.is_active = true
      WHERE woa.technician_id = technicians.id
        AND c.referred_by_id = auth.uid()
        AND utr.role = 'sales_partner'
    )
  );

COMMIT;
