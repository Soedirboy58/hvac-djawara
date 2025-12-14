-- =============================================
-- EXECUTE THIS - FINAL FIX FOR CONTRACT REQUESTS
-- =============================================

-- Drop table completely
DROP TABLE IF EXISTS public.contract_requests CASCADE;

-- Create fresh table
CREATE TABLE public.contract_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer info
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
  
  -- Workflow
  status VARCHAR(20) DEFAULT 'pending',
  assigned_to UUID,
  
  -- Quotation
  quotation_amount DECIMAL(15,2),
  quotation_notes TEXT,
  quotation_sent_at TIMESTAMPTZ,
  quotation_file_url TEXT,
  
  -- Approval
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  contract_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contract_requests_status ON public.contract_requests(status);
CREATE INDEX idx_contract_requests_created ON public.contract_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.contract_requests ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Policy for anonymous INSERT
CREATE POLICY "anon_insert_contract_requests"
  ON public.contract_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy for authenticated INSERT
CREATE POLICY "auth_insert_contract_requests"
  ON public.contract_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for authenticated SELECT
CREATE POLICY "auth_select_contract_requests"
  ON public.contract_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for authenticated UPDATE
CREATE POLICY "auth_update_contract_requests"
  ON public.contract_requests
  FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.contract_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- TEST INSERT as anonymous
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Simulate anonymous insert
  SET LOCAL ROLE anon;
  
  INSERT INTO public.contract_requests (
    company_name, 
    contact_person, 
    phone, 
    unit_count
  )
  VALUES (
    'Test Company',
    'Test Person',
    '081234567890',
    5
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE 'TEST SUCCESS! Inserted with ID: %', test_id;
  
  -- Clean up test data
  RESET ROLE;
  DELETE FROM public.contract_requests WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RESET ROLE;
  RAISE NOTICE 'TEST FAILED: %', SQLERRM;
END $$;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'contract_requests'
ORDER BY policyname;

-- Show success
SELECT '✅ Contract requests table ready for testing!' as status;
