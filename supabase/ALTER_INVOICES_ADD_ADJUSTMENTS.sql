-- ============================================
-- ALTER INVOICES: ADD TAX/DOWNPAYMENT ADJUSTMENTS
-- Adds invoice-level toggles for PPN/PPh/DP so PDF + UI can persist them.
-- Safe to run multiple times.
-- ============================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS ppn_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppn_percent NUMERIC(5,2) NOT NULL DEFAULT 11,

  ADD COLUMN IF NOT EXISTS pph_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pph_percent NUMERIC(5,2) NOT NULL DEFAULT 0,

  ADD COLUMN IF NOT EXISTS dp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dp_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.invoices.ppn_enabled IS 'If true, apply PPN percentage to DPP total.';
COMMENT ON COLUMN public.invoices.ppn_percent IS 'PPN percent (e.g. 11). Used when ppn_enabled = true.';
COMMENT ON COLUMN public.invoices.pph_enabled IS 'If true, apply PPh withholding percent to DPP (reduces payable).';
COMMENT ON COLUMN public.invoices.pph_percent IS 'PPh percent (e.g. 2). Used when pph_enabled = true.';
COMMENT ON COLUMN public.invoices.dp_enabled IS 'If true, DP amount is recorded and reduces sisa tagihan.';
COMMENT ON COLUMN public.invoices.dp_amount IS 'Down payment amount (IDR). Used when dp_enabled = true.';
