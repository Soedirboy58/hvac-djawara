-- ============================================
-- PUBLIC INTAKE FOR TENANT HVAC-DJAWARA
-- Purpose: Allow anonymous users to submit service requests via website form
-- Safe: Scoped only to tenant slug 'hvac-djawara'
-- ============================================

-- Tenants: allow anonymous SELECT for hvac-djawara
DROP POLICY IF EXISTS anon_select_hvac_tenant ON public.tenants;
CREATE POLICY anon_select_hvac_tenant
ON public.tenants
FOR SELECT
TO anon, authenticated
USING (slug = 'hvac-djawara');

-- Clients: allow anonymous SELECT/INSERT/UPDATE for hvac-djawara
DROP POLICY IF EXISTS anon_select_clients_hvac ON public.clients;
CREATE POLICY anon_select_clients_hvac
ON public.clients
FOR SELECT
TO anon, authenticated
USING (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

DROP POLICY IF EXISTS anon_insert_clients_hvac ON public.clients;
CREATE POLICY anon_insert_clients_hvac
ON public.clients
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

DROP POLICY IF EXISTS anon_update_clients_hvac ON public.clients;
CREATE POLICY anon_update_clients_hvac
ON public.clients
FOR UPDATE
TO anon, authenticated
USING (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
)
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
);

-- Service orders: allow anonymous INSERT for hvac-djawara
DROP POLICY IF EXISTS anon_insert_service_orders_hvac ON public.service_orders;
CREATE POLICY anon_insert_service_orders_hvac
ON public.service_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'hvac-djawara')
  AND status = 'pending'
);
