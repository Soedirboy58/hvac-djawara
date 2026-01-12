-- Allow admin_finance / owner to delete reimburse requests (bulk cleanup)
-- Apply this in Supabase SQL editor.

BEGIN;

DROP POLICY IF EXISTS reimburse_requests_delete_finance ON public.reimburse_requests;
CREATE POLICY reimburse_requests_delete_finance
ON public.reimburse_requests
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner','admin_finance'])
);

COMMIT;
