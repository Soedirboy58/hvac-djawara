-- ============================================
-- CLIENT DOCUMENTS MANAGEMENT
-- Store SPK, penawaran, kontrak, BAST, dan dokumen administratif lainnya
-- ============================================

-- ================================================
-- TABLE: Client Documents
-- ================================================

CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Document Info
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'spk',              -- Surat Perintah Kerja
    'penawaran',        -- Quotation/Proposal
    'invoice',          -- Invoice/Tagihan
    'bast',             -- Berita Acara Serah Terima
    'kontrak',          -- Service Contract
    'po',               -- Purchase Order
    'kwitansi',         -- Receipt
    'warranty',         -- Warranty Certificate
    'foto_sebelum',     -- Before Photo
    'foto_sesudah',     -- After Photo
    'lainnya'           -- Other Documents
  )),
  
  -- File Storage
  file_path TEXT NOT NULL,        -- Path in Supabase Storage
  file_size BIGINT,                -- Size in bytes
  file_type TEXT,                  -- MIME type: application/pdf, image/jpeg, etc
  
  -- Metadata
  document_number TEXT,            -- SPK-001, INV-2024-001, etc
  document_date DATE,
  related_order_id UUID REFERENCES public.service_orders(id),
  related_contract_id UUID REFERENCES public.maintenance_contracts(id),
  
  -- Status & Tags
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  tags TEXT[],                     -- ['urgent', 'paid', 'approved']
  notes TEXT,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.client_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON public.client_documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_order ON public.client_documents(related_order_id) WHERE related_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.client_documents(status);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.client_documents IS 
'Document management untuk client: SPK, penawaran, invoice, BAST, kontrak, foto, dll.
Files disimpan di Supabase Storage, metadata di table ini.';

-- ================================================
-- STORAGE BUCKET: Client Documents
-- ================================================

-- Create storage bucket (run this in Supabase Dashboard > Storage)
-- Bucket name: client-documents
-- Public: false (private, only authenticated users)

-- Storage policies akan dibuat via Supabase Dashboard:
-- 1. Allow authenticated users to upload
-- 2. Allow tenant staff to view/download their tenant's documents
-- 3. Allow clients to view their own documents (if portal enabled)

-- ================================================
-- RLS POLICIES
-- ================================================

-- Staff can manage all documents in their tenant
CREATE POLICY "Staff can manage all client documents"
  ON public.client_documents
  FOR ALL
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

-- ================================================
-- FUNCTION: Update updated_at timestamp
-- ================================================

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ================================================
-- VIEW: Document Summary by Type
-- ================================================

CREATE OR REPLACE VIEW public.v_client_documents_summary AS
SELECT 
  client_id,
  document_type,
  COUNT(*) as document_count,
  SUM(file_size) as total_size_bytes,
  MAX(document_date) as latest_document_date,
  MAX(uploaded_at) as latest_upload
FROM public.client_documents
WHERE status = 'active'
GROUP BY client_id, document_type;

COMMENT ON VIEW public.v_client_documents_summary IS 
'Summary: jumlah dokumen per client per tipe.';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CLIENT DOCUMENTS MANAGEMENT READY!';
  RAISE NOTICE '';
  RAISE NOTICE '📄 Document Types Supported:';
  RAISE NOTICE '  • SPK (Surat Perintah Kerja)';
  RAISE NOTICE '  • Penawaran (Quotation)';
  RAISE NOTICE '  • Invoice';
  RAISE NOTICE '  • BAST (Berita Acara Serah Terima)';
  RAISE NOTICE '  • Kontrak';
  RAISE NOTICE '  • PO (Purchase Order)';
  RAISE NOTICE '  • Kwitansi';
  RAISE NOTICE '  • Warranty Certificate';
  RAISE NOTICE '  • Foto Before/After';
  RAISE NOTICE '  • Lainnya';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Next Steps:';
  RAISE NOTICE '  1. Create Storage Bucket: client-documents (private)';
  RAISE NOTICE '  2. Configure Storage policies in Supabase Dashboard';
  RAISE NOTICE '  3. Upload documents via UI';
END $$;
