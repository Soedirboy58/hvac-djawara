-- Migration: Add signature scale to document branding settings
-- Date: 2026-01-06
-- Purpose:
-- - Allow configuring signature image scale for better layout precision in PDFs

BEGIN;

ALTER TABLE IF EXISTS public.document_branding_settings
  ADD COLUMN IF NOT EXISTS signature_scale NUMERIC;

-- Default to 1 for existing rows when null
UPDATE public.document_branding_settings
SET signature_scale = 1
WHERE signature_scale IS NULL;

COMMIT;
