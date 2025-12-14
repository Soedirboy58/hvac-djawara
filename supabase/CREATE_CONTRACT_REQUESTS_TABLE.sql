-- ============================================
-- CREATE CONTRACT REQUESTS TABLE
-- Sistem Permintaan Kontrak dari Pelanggan
-- ============================================

-- Step 1: Create contract_requests table
CREATE TABLE IF NOT EXISTS public.contract_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Customer info (from public form)
  company_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(200),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  
  -- Contract details
  unit_count INT NOT NULL, -- jumlah unit AC
  location_count INT DEFAULT 1, -- jumlah cabang/lokasi
  preferred_frequency VARCHAR(50), -- 'monthly', 'quarterly', 'semi_annual', 'custom'
  notes TEXT, -- catatan dari pelanggan
  
  -- Internal workflow
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'quoted', 'approved', 'rejected'
  assigned_to UUID, -- REFERENCES public.profiles(id) - sales/admin yang handle
  
  -- Quotation
  quotation_amount DECIMAL(15,2), -- nilai penawaran
  quotation_notes TEXT, -- detail penawaran
  quotation_sent_at TIMESTAMPTZ,
  quotation_file_url TEXT, -- link file PDF penawaran
  
  -- Approval
  approved_by UUID, -- REFERENCES public.profiles(id)
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Link to actual contract (after approved) - nullable, no constraint yet
  contract_id UUID, -- REFERENCES public.maintenance_contracts(id) - table doesn't exist yet
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_contract_requests_status ON public.contract_requests(status);
CREATE INDEX IF NOT EXISTS idx_contract_requests_assigned ON public.contract_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contract_requests_created ON public.contract_requests(created_at DESC);

-- Step 3: Enable RLS (public can INSERT, internal can view/update)
ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit request (public form)
DROP POLICY IF EXISTS "Anyone can submit contract request" ON public.contract_requests;
CREATE POLICY "Anyone can submit contract request"
  ON public.contract_requests FOR INSERT
  WITH CHECK (true);

-- Policy: Authenticated users can view all requests
DROP POLICY IF EXISTS "Users can view all contract requests" ON public.contract_requests;
CREATE POLICY "Users can view all contract requests"
  ON public.contract_requests FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can update requests
DROP POLICY IF EXISTS "Users can update contract requests" ON public.contract_requests;
CREATE POLICY "Users can update contract requests"
  ON public.contract_requests FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Step 4: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_contract_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contract_requests_updated_at
  BEFORE UPDATE ON public.contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_request_updated_at();

-- Step 5: Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CONTRACT REQUESTS TABLE CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Flow:';
  RAISE NOTICE '  1. Pelanggan isi form di landing page';
  RAISE NOTICE '  2. Data masuk ke contract_requests (status: pending)';
  RAISE NOTICE '  3. Owner review & buat penawaran (status: quoted)';
  RAISE NOTICE '  4. Kirim penawaran/MOU ke pelanggan';
  RAISE NOTICE '  5. Setelah approve, buat maintenance_contracts';
  RAISE NOTICE '';
END $$;
