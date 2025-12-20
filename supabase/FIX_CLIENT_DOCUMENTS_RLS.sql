-- Fix client_documents RLS policies for admin/staff access

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Staff can manage all client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can view all client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can insert client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can update client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Staff can delete client documents" ON public.client_documents;
DROP POLICY IF EXISTS "Clients can view own documents" ON public.client_documents;

-- Staff/Admin can view and manage all documents in their tenant
CREATE POLICY "Staff can view all client documents"
  ON public.client_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.active_tenant_id = client_documents.tenant_id
    )
  );

CREATE POLICY "Staff can insert client documents"
  ON public.client_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.active_tenant_id = client_documents.tenant_id
    )
  );

CREATE POLICY "Staff can update client documents"
  ON public.client_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.active_tenant_id = client_documents.tenant_id
    )
  );

CREATE POLICY "Staff can delete client documents"
  ON public.client_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.active_tenant_id = client_documents.tenant_id
    )
  );

-- Clients can view own documents
CREATE POLICY "Clients can view own documents"
  ON public.client_documents
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE portal_email = auth.email()
      AND portal_enabled = true
    )
  );
