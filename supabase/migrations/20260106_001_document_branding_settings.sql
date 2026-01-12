-- Migration: Document branding (kop) settings
-- Date: 2026-01-06
-- Purpose:
-- - Store per-tenant document branding settings (logo/header, stamp, signature)
-- - Can be reused for invoice, quotation, PO, etc.

BEGIN;

CREATE TABLE IF NOT EXISTS public.document_branding_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  company_name TEXT,
  address_lines TEXT[] DEFAULT '{}'::text[],
  phone TEXT,
  email TEXT,

  -- Assets can be stored as public URLs or data URLs (concept-first)
  logo_url TEXT,
  stamp_url TEXT,
  signature_image_url TEXT,

  signature_name TEXT,
  signature_title TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.update_document_branding_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_branding_settings_updated_at ON public.document_branding_settings;
CREATE TRIGGER trigger_document_branding_settings_updated_at
  BEFORE UPDATE ON public.document_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_branding_settings_updated_at();

-- RLS
ALTER TABLE public.document_branding_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_branding_settings'
      AND policyname = 'Document branding readable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Document branding readable by finance roles"
        ON public.document_branding_settings FOR SELECT
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.document_branding_settings.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_branding_settings'
      AND policyname = 'Document branding writable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Document branding writable by finance roles"
        ON public.document_branding_settings FOR INSERT
        WITH CHECK (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.document_branding_settings.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'document_branding_settings'
      AND policyname = 'Document branding updatable by finance roles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Document branding updatable by finance roles"
        ON public.document_branding_settings FOR UPDATE
        USING (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.document_branding_settings.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        )
        WITH CHECK (
          tenant_id = (SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.document_branding_settings.tenant_id
              AND ur.is_active = true
              AND ur.role IN ('owner', 'admin_finance')
          )
        );
    $policy$;
  END IF;
END;
$$;

COMMIT;
