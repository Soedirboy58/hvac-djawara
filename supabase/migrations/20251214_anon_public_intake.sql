-- Allow anonymous web intake for tenant hvac-djawara
-- Safe scope: only tenant slug 'hvac-djawara'

-- Tenants: allow select slug hvac-djawara
DROP POLICY IF EXISTS anon_select_hvac_tenant ON public.tenants;
CREATE POLICY anon_select_hvac_tenant
ON public.tenants
FOR SELECT
USING (slug = 'hvac-djawara');

-- Clients: allow insert and update for hvac-djawara without auth
DROP POLICY IF EXISTS anon_insert_clients_hvac ON public.clients;
CREATE POLICY anon_insert_clients_hvac
ON public.clients
FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT id FROM public.tenants WHERE slug = 'hvac-djawara'
  )
);

DROP POLICY IF EXISTS anon_update_clients_hvac ON public.clients;
CREATE POLICY anon_update_clients_hvac
ON public.clients
FOR UPDATE
USING (
  tenant_id = (
    SELECT id FROM public.tenants WHERE slug = 'hvac-djawara'
  )
)
WITH CHECK (
  tenant_id = (
    SELECT id FROM public.tenants WHERE slug = 'hvac-djawara'
  )
);

-- Service orders: allow insert for hvac-djawara without auth
DROP POLICY IF EXISTS anon_insert_service_orders_hvac ON public.service_orders;
CREATE POLICY anon_insert_service_orders_hvac
ON public.service_orders
FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT id FROM public.tenants WHERE slug = 'hvac-djawara'
  )
);

-- Allow anonymous to select clients (needed for upsert logic)
DROP POLICY IF EXISTS anon_select_clients_hvac ON public.clients;
CREATE POLICY anon_select_clients_hvac
ON public.clients
FOR SELECT
USING (
  tenant_id = (
    SELECT id FROM public.tenants WHERE slug = 'hvac-djawara'
  )
);
