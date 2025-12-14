-- ============================================
-- COMPLETE FIX FOR ALL CLIENT MANAGEMENT ISSUES
-- Run this entire file in Supabase SQL Editor
-- ============================================
-- Issues Fixed:
-- 1. Client type constraint (enables 8 new types)
-- 2. Client documents table (creates table for Documents tab)
-- 3. Audit log trigger (ensures change tracking works)
-- ============================================

BEGIN;

-- ================================================
-- PART 1: FIX CLIENT TYPE CONSTRAINT
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Part 1: Fixing client type constraint...';
END $$;

-- Drop ALL existing client_type constraints (could be multiple)
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.clients'::regclass 
    AND conname LIKE '%client_type%'
  LOOP
    EXECUTE 'ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS ' || constraint_rec.conname;
    RAISE NOTICE 'Dropped constraint: %', constraint_rec.conname;
  END LOOP;
END $$;

-- IMPORTANT: Update data to valid values
UPDATE public.clients 
SET client_type = CASE 
  WHEN client_type = 'residential' THEN 'rumah_tangga'
  WHEN client_type = 'commercial' THEN 'perkantoran'
  WHEN client_type = 'rumah_tangga' THEN 'rumah_tangga'
  WHEN client_type = 'perkantoran' THEN 'perkantoran'
  WHEN client_type = 'komersial' THEN 'komersial'
  WHEN client_type = 'perhotelan' THEN 'perhotelan'
  WHEN client_type = 'sekolah_universitas' THEN 'sekolah_universitas'
  WHEN client_type = 'gedung_pertemuan' THEN 'gedung_pertemuan'
  WHEN client_type = 'kantor_pemerintah' THEN 'kantor_pemerintah'
  WHEN client_type = 'pabrik_industri' THEN 'pabrik_industri'
  ELSE 'rumah_tangga'  -- Default untuk data yang tidak valid
END;

-- Add new constraint with 8 types
ALTER TABLE public.clients ADD CONSTRAINT clients_client_type_check 
  CHECK (client_type IN (
    'rumah_tangga', 
    'perkantoran', 
    'komersial', 
    'perhotelan', 
    'sekolah_universitas', 
    'gedung_pertemuan', 
    'kantor_pemerintah', 
    'pabrik_industri'
  ));

DO $$
BEGIN
  RAISE NOTICE '✅ Client type constraint updated! Now accepts 8 types.';
END $$;

-- ================================================
-- PART 2: CREATE CLIENT DOCUMENTS TABLE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Part 2: Creating client documents table...';
END $$;

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
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  
  -- Metadata
  document_number TEXT,
  document_date DATE,
  related_order_id UUID REFERENCES public.service_orders(id),
  related_contract_id UUID,
  
  -- Status & Tags
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  tags TEXT[],
  notes TEXT,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT fk_uploader FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_tenant ON public.client_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON public.client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON public.client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_date ON public.client_documents(uploaded_at DESC);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Staff can access all documents in their tenant
DROP POLICY IF EXISTS "Staff can view client documents" ON public.client_documents;
CREATE POLICY "Staff can view client documents" ON public.client_documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can insert client documents" ON public.client_documents;
CREATE POLICY "Staff can insert client documents" ON public.client_documents
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can update client documents" ON public.client_documents;
CREATE POLICY "Staff can update client documents" ON public.client_documents
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Staff can delete client documents" ON public.client_documents;
CREATE POLICY "Staff can delete client documents" ON public.client_documents
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'staff')
    )
  );

-- View for document summary
CREATE OR REPLACE VIEW public.v_client_documents_summary AS
SELECT 
  cd.id,
  cd.client_id,
  c.name AS client_name,
  cd.document_name,
  cd.document_type,
  cd.document_number,
  cd.document_date,
  cd.file_size,
  cd.file_type,
  cd.status,
  cd.uploaded_at,
  p.name AS uploaded_by_name,
  cd.tenant_id
FROM public.client_documents cd
JOIN public.clients c ON cd.client_id = c.id
JOIN public.profiles p ON cd.uploaded_by = p.id
WHERE cd.status != 'deleted'
ORDER BY cd.uploaded_at DESC;

DO $$
BEGIN
  RAISE NOTICE '✅ Client documents table created with RLS policies!';
END $$;

-- ================================================
-- PART 3: ENSURE AUDIT LOG TRIGGER EXISTS
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Part 3: Creating/updating audit log trigger...';
END $$;

-- Create audit log table if not exists (should already exist)
CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  change_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_client ON public.client_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.client_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.client_audit_log(changed_by);

ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for audit log
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.client_audit_log;
CREATE POLICY "Staff can view audit logs" ON public.client_audit_log
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients 
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- Trigger function to track client changes
CREATE OR REPLACE FUNCTION public.track_client_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_summary TEXT;
BEGIN
  -- Build change summary
  IF TG_OP = 'UPDATE' THEN
    change_summary := 'Updated: ';
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      change_summary := change_summary || 'name, ';
    END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      change_summary := change_summary || 'email, ';
    END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      change_summary := change_summary || 'phone, ';
    END IF;
    IF OLD.address IS DISTINCT FROM NEW.address THEN
      change_summary := change_summary || 'address, ';
    END IF;
    IF OLD.client_type IS DISTINCT FROM NEW.client_type THEN
      change_summary := change_summary || 'client_type, ';
    END IF;
    change_summary := rtrim(change_summary, ', ');
  ELSIF TG_OP = 'INSERT' THEN
    change_summary := 'Client created';
  ELSIF TG_OP = 'DELETE' THEN
    change_summary := 'Client deleted';
  END IF;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.client_audit_log (
      client_id, changed_by, change_type, table_name, record_id,
      old_values, changes_summary, created_at
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      change_summary,
      NOW()
    );
    RETURN OLD;
  ELSE
    INSERT INTO public.client_audit_log (
      client_id, changed_by, change_type, table_name, record_id,
      old_values, new_values, changes_summary, created_at
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      auth.uid(),
      LOWER(TG_OP),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      change_summary,
      NOW()
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_track_client_changes ON public.clients;
CREATE TRIGGER trigger_track_client_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_client_changes();

DO $$
BEGIN
  RAISE NOTICE '✅ Audit log trigger created!';
END $$;

-- ================================================
-- PART 4: VERIFY PROPERTY CATEGORIES
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Part 4: Verifying property categories...';
END $$;

-- Ensure client_properties has property_category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_properties' 
    AND column_name = 'property_category'
  ) THEN
    ALTER TABLE public.client_properties 
    ADD COLUMN property_category TEXT;
    
    ALTER TABLE public.client_properties 
    ADD CONSTRAINT client_properties_category_check 
    CHECK (property_category IN ('rumah_tangga', 'layanan_publik', 'industri'));
    
    RAISE NOTICE '✅ Added property_category column';
  ELSE
    RAISE NOTICE '✓ property_category column already exists';
  END IF;
END $$;

-- ================================================
-- FINAL: VERIFICATION & SUMMARY
-- ================================================

DO $$
DECLARE
  client_count INT;
  doc_count INT;
  audit_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL FIXES COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  
  -- Count existing records
  SELECT COUNT(*) INTO client_count FROM public.clients;
  SELECT COUNT(*) INTO doc_count FROM public.client_documents;
  SELECT COUNT(*) INTO audit_count FROM public.client_audit_log;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Status:';
  RAISE NOTICE '  - Clients: % records', client_count;
  RAISE NOTICE '  - Documents: % records', doc_count;
  RAISE NOTICE '  - Audit Logs: % records', audit_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed Issues:';
  RAISE NOTICE '  1. Client type constraint (8 types)';
  RAISE NOTICE '  2. Client documents table created';
  RAISE NOTICE '  3. Audit log trigger installed';
  RAISE NOTICE '  4. Property categories verified';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Next Steps:';
  RAISE NOTICE '  1. Create storage bucket: client-documents';
  RAISE NOTICE '  2. Configure storage policies';
  RAISE NOTICE '  3. Test client edit (should work now)';
  RAISE NOTICE '  4. Test change history (should load)';
  RAISE NOTICE '  5. Test document upload (needs bucket)';
  RAISE NOTICE '';
END $$;

COMMIT;
