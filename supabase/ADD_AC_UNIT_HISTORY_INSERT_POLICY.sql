-- Allow authenticated users to insert AC unit history rows in their tenant
-- Required for delete/update triggers on ac_units

ALTER TABLE public.ac_unit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert AC history in their tenant" ON public.ac_unit_history;
CREATE POLICY "Users can insert AC history in their tenant"
ON public.ac_unit_history
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);
