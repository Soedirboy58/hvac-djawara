-- ============================================
-- FIX CONTRACT REQUESTS TABLE
-- Drop dan recreate tanpa foreign key constraints
-- ============================================

-- Drop existing table if exists
DROP TABLE IF EXISTS public.contract_requests CASCADE;

-- Create contract_requests table (NO foreign key constraints)
CREATE TABLE public.contract_requests (
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
  unit_count INT NOT NULL,
  location_count INT DEFAULT 1,
  preferred_frequency VARCHAR(50),
  notes TEXT,
  
  -- Internal workflow
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to UUID, -- No FK constraint
  
  -- Quotation
  quotation_amount DECIMAL(15,2),
  quotation_notes TEXT,
  quotation_sent_at TIMESTAMPTZ,
  quotation_file_url TEXT,
  
  -- Approval
  approved_by UUID, -- No FK constraint
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Link to contract (future)
  contract_id UUID, -- No FK constraint
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_contract_requests_status ON public.contract_requests(status);
CREATE INDEX idx_contract_requests_created ON public.contract_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can INSERT (public form)
CREATE POLICY "Public can insert contract requests"
  ON public.contract_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Authenticated can SELECT all
CREATE POLICY "Authenticated can view contract requests"
  ON public.contract_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Authenticated can UPDATE all
CREATE POLICY "Authenticated can update contract requests"
  ON public.contract_requests
  FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_contract_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_contract_request_updated_at
  BEFORE UPDATE ON public.contract_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_request_timestamp();

-- Verify
SELECT 'Contract requests table created successfully!' AS status;
SELECT COUNT(*) AS row_count FROM public.contract_requests;
