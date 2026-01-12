-- Migration: Fix technicians RLS recursion caused by sales_partner policy
-- Date: 2026-01-12
-- Purpose:
-- - Prevent 500 errors on /rest/v1/technicians due to circular RLS evaluation.
-- - Keep the intended behavior: sales_partner can read technician rows only when
--   the technician is assigned to an order for a client referred by that sales_partner.
--
-- Background:
-- - Existing work_order_assignments SELECT policy references technicians.
-- - A technicians SELECT policy that references work_order_assignments can create
--   recursion (technicians -> work_order_assignments -> technicians).
-- - Use a SECURITY DEFINER function with row_security disabled to avoid recursion.

BEGIN;

ALTER TABLE IF EXISTS public.technicians ENABLE ROW LEVEL SECURITY;

-- Replace the recursive policy if it exists
DROP POLICY IF EXISTS "Technicians readable by sales partner (referred orders)" ON public.technicians;

-- Helper function: safe membership check without RLS recursion
CREATE OR REPLACE FUNCTION public.sales_partner_can_view_technician(p_technician_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Avoid RLS recursion inside this function.
  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.work_order_assignments woa
    JOIN public.service_orders so ON so.id = woa.service_order_id
    JOIN public.clients c ON c.id = so.client_id
    JOIN public.user_tenant_roles utr
      ON utr.tenant_id = so.tenant_id
     AND utr.user_id = auth.uid()
     AND utr.is_active = true
    WHERE woa.technician_id = p_technician_id
      AND c.referred_by_id = auth.uid()
      AND utr.role = 'sales_partner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sales_partner_can_view_technician(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sales_partner_can_view_technician(uuid) TO authenticated;

-- New non-recursive policy
CREATE POLICY "Technicians readable by sales partner (referred orders)"
  ON public.technicians
  FOR SELECT
  USING (
    public.sales_partner_can_view_technician(id)
  );

COMMIT;
