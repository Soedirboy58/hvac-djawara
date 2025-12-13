-- ============================================
-- PHASE 1: CORE WORKFLOW TABLES
-- ============================================
-- Purpose: Orders → Schedule → Kanban → SPK → BAST
-- Date: 2025-12-01
-- 
-- INSTRUCTIONS:
-- Run this after DEPLOY_COMPLETE.sql and SEED_DATA.sql
-- ============================================

-- ================================================
-- ENUM TYPES FOR WORKFLOW
-- ================================================

-- Order types
DO $$ BEGIN
  CREATE TYPE order_type AS ENUM (
    'maintenance',      -- Pemeliharaan rutin
    'repair',          -- Perbaikan
    'installation',    -- Pemasangan baru
    'survey',          -- Survey lokasi
    'troubleshooting'  -- Analisa kerusakan
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Order status
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',         -- Belum dijadwalkan
    'scheduled',       -- Sudah dijadwalkan
    'in_progress',     -- Sedang dikerjakan
    'completed',       -- Selesai dikerjakan
    'approved',        -- Client approve BAST
    'complaint',       -- Ada komplain
    'invoiced',        -- Sudah ditagih
    'paid',           -- Sudah dibayar
    'cancelled'        -- Dibatalkan
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Job priority
DO $$ BEGIN
  CREATE TYPE job_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ================================================
-- SERVICE_ORDERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  order_type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  priority job_priority NOT NULL DEFAULT 'medium',
  
  -- Service details
  service_title TEXT NOT NULL,
  service_description TEXT,
  location_address TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  
  -- Scheduling
  requested_date DATE,
  scheduled_date DATE,
  scheduled_time TIME,
  estimated_duration INTEGER, -- minutes
  
  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Lead technician
  
  -- Metadata
  notes TEXT,
  is_survey BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_tenant ON public.service_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_client ON public.service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_assigned ON public.service_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled_date ON public.service_orders(scheduled_date);

DROP TRIGGER IF EXISTS set_updated_at ON public.service_orders;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- ================================================
-- JOB_ASSIGNMENTS TABLE (Team untuk job)
-- ================================================
CREATE TABLE IF NOT EXISTS public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'technician', 'helper'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  CONSTRAINT unique_job_user UNIQUE (service_order_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_order ON public.job_assignments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user ON public.job_assignments(user_id);

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SPK_REPORTS TABLE (Surat Perintah Kerja)
-- ================================================
CREATE TABLE IF NOT EXISTS public.spk_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  
  -- Work details
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  work_description TEXT,
  findings TEXT, -- Temuan di lapangan
  actions_taken TEXT, -- Tindakan yang dilakukan
  materials_used JSONB, -- [{ name, qty, unit }]
  
  -- Results
  condition_before TEXT,
  condition_after TEXT,
  recommendations TEXT,
  
  -- Completion
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spk_reports_order ON public.spk_reports(service_order_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.spk_reports;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.spk_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.spk_reports ENABLE ROW LEVEL SECURITY;

-- ================================================
-- DOCUMENTATION TABLE (Photos/Files)
-- ================================================
CREATE TABLE IF NOT EXISTS public.documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  spk_report_id UUID REFERENCES public.spk_reports(id) ON DELETE CASCADE,
  
  file_type TEXT NOT NULL, -- 'photo', 'video', 'document'
  file_url TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  category TEXT, -- 'before', 'during', 'after', 'equipment', 'problem'
  
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentation_order ON public.documentation(service_order_id);
CREATE INDEX IF NOT EXISTS idx_documentation_spk ON public.documentation(spk_report_id);

ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;

-- ================================================
-- BAST TABLE (Berita Acara Serah Terima)
-- ================================================
CREATE TABLE IF NOT EXISTS public.bast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  spk_report_id UUID REFERENCES public.spk_reports(id) ON DELETE CASCADE,
  
  bast_number TEXT NOT NULL UNIQUE,
  
  -- Client approval
  client_name TEXT NOT NULL,
  client_signature_url TEXT,
  client_approved_at TIMESTAMPTZ,
  
  -- Technician signature
  technician_name TEXT NOT NULL,
  technician_signature_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bast_order ON public.bast(service_order_id);
CREATE INDEX IF NOT EXISTS idx_bast_status ON public.bast(status);

DROP TRIGGER IF EXISTS set_updated_at ON public.bast;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.bast
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bast ENABLE ROW LEVEL SECURITY;

-- ================================================
-- COMPLAINTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  bast_id UUID REFERENCES public.bast(id) ON DELETE CASCADE,
  
  complaint_text TEXT NOT NULL,
  complaint_category TEXT, -- 'incomplete', 'quality', 'damage', 'other'
  
  -- Resolution
  resolution_text TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_order ON public.complaints(service_order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_bast ON public.complaints(bast_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.complaints;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Service Orders
DROP POLICY IF EXISTS "users_view_tenant_orders" ON public.service_orders;
CREATE POLICY "users_view_tenant_orders"
ON public.service_orders FOR SELECT
USING (tenant_id = public.get_active_tenant_id());

DROP POLICY IF EXISTS "users_insert_orders" ON public.service_orders;
CREATE POLICY "users_insert_orders"
ON public.service_orders FOR INSERT
WITH CHECK (
  tenant_id = public.get_active_tenant_id()
  AND public.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic', 'sales_partner'])
);

DROP POLICY IF EXISTS "users_update_orders" ON public.service_orders;
CREATE POLICY "users_update_orders"
ON public.service_orders FOR UPDATE
USING (tenant_id = public.get_active_tenant_id());

-- Job Assignments
DROP POLICY IF EXISTS "users_view_assignments" ON public.job_assignments;
CREATE POLICY "users_view_assignments"
ON public.job_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE id = job_assignments.service_order_id
    AND tenant_id = public.get_active_tenant_id()
  )
);

-- SPK Reports
DROP POLICY IF EXISTS "technicians_manage_spk" ON public.spk_reports;
CREATE POLICY "technicians_manage_spk"
ON public.spk_reports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE id = spk_reports.service_order_id
    AND tenant_id = public.get_active_tenant_id()
  )
);

-- Documentation
DROP POLICY IF EXISTS "users_manage_documentation" ON public.documentation;
CREATE POLICY "users_manage_documentation"
ON public.documentation FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE id = documentation.service_order_id
    AND tenant_id = public.get_active_tenant_id()
  )
);

-- BAST
DROP POLICY IF EXISTS "users_view_bast" ON public.bast;
CREATE POLICY "users_view_bast"
ON public.bast FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE id = bast.service_order_id
    AND tenant_id = public.get_active_tenant_id()
  )
);

-- Complaints
DROP POLICY IF EXISTS "users_manage_complaints" ON public.complaints;
CREATE POLICY "users_manage_complaints"
ON public.complaints FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE id = complaints.service_order_id
    AND tenant_id = public.get_active_tenant_id()
  )
);

-- ================================================
-- AUTO-GENERATE ORDER NUMBER
-- ================================================
CREATE SEQUENCE IF NOT EXISTS service_orders_seq;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SO-' || 
                        TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                        LPAD(nextval('service_orders_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_order_number ON public.service_orders;
CREATE TRIGGER auto_generate_order_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- ================================================
-- AUTO-GENERATE BAST NUMBER
-- ================================================
CREATE SEQUENCE IF NOT EXISTS bast_seq;

CREATE OR REPLACE FUNCTION public.generate_bast_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bast_number IS NULL OR NEW.bast_number = '' THEN
    NEW.bast_number := 'BAST-' || 
                       TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                       LPAD(nextval('bast_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_bast_number ON public.bast;
CREATE TRIGGER auto_generate_bast_number
  BEFORE INSERT ON public.bast
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_bast_number();

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ PHASE 1 WORKFLOW TABLES DEPLOYED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '   • 3 enum types (order_type, order_status, job_priority)';
  RAISE NOTICE '   • 6 tables (orders, assignments, spk, docs, bast, complaints)';
  RAISE NOTICE '   • Auto-generate order & BAST numbers';
  RAISE NOTICE '   • RLS policies for all tables';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for Phase 1 UI development!';
  RAISE NOTICE '';
END $$;
