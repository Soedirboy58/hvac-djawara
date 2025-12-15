-- ============================================
-- CREATE QUOTATIONS TABLE
-- Sistem penawaran terpisah dari contract_requests
-- ============================================

-- Step 1: Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_request_id UUID REFERENCES contract_requests(id) ON DELETE SET NULL,
  
  -- Quotation info
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  
  -- Client info (snapshot from contract_request)
  client_company_name VARCHAR(200) NOT NULL,
  client_contact_person VARCHAR(100),
  client_phone VARCHAR(20),
  client_email VARCHAR(100),
  client_address TEXT,
  
  -- Items (JSON array)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{"name": "Cuci AC 1 PK", "quantity": 10, "unit": "unit", "price": 150000, "total": 1500000}]
  
  -- Pricing
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 11, -- PPN 11%
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  
  -- Terms
  payment_terms TEXT,
  notes TEXT,
  terms_and_conditions TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- draft, sent, accepted, rejected, expired
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX idx_quotations_contract_request ON quotations(contract_request_id);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_date ON quotations(quotation_date DESC);

-- RLS Policies
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Admin can see all quotations for their tenant
CREATE POLICY "Admins can view quotations"
  ON quotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = quotations.tenant_id
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Admin can create quotations
CREATE POLICY "Admins can create quotations"
  ON quotations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = quotations.tenant_id
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Admin can update their quotations
CREATE POLICY "Admins can update quotations"
  ON quotations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = quotations.tenant_id
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Admin can delete quotations
CREATE POLICY "Admins can delete quotations"
  ON quotations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = quotations.tenant_id
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Step 2: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_quotations_updated_at();

-- Step 3: Function to calculate quotation totals
CREATE OR REPLACE FUNCTION calculate_quotation_totals(
  p_subtotal DECIMAL,
  p_discount_percent DECIMAL DEFAULT 0,
  p_tax_percent DECIMAL DEFAULT 11
)
RETURNS TABLE (
  discount_amount DECIMAL,
  tax_amount DECIMAL,
  total DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_discount DECIMAL;
  v_after_discount DECIMAL;
  v_tax DECIMAL;
  v_total DECIMAL;
BEGIN
  -- Calculate discount
  v_discount := p_subtotal * (p_discount_percent / 100);
  v_after_discount := p_subtotal - v_discount;
  
  -- Calculate tax (after discount)
  v_tax := v_after_discount * (p_tax_percent / 100);
  
  -- Calculate total
  v_total := v_after_discount + v_tax;
  
  RETURN QUERY SELECT v_discount, v_tax, v_total;
END;
$$;

-- Step 4: Function to create quotation from contract request
CREATE OR REPLACE FUNCTION create_quotation_from_request(
  p_tenant_id UUID,
  p_contract_request_id UUID,
  p_items JSONB,
  p_subtotal DECIMAL,
  p_discount_percent DECIMAL DEFAULT 0,
  p_payment_terms TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quotation_id UUID;
  v_quotation_number TEXT;
  v_valid_until DATE;
  v_discount_amount DECIMAL;
  v_tax_amount DECIMAL;
  v_total DECIMAL;
  v_request RECORD;
  v_validity_days INT;
BEGIN
  -- Get tenant validity days
  SELECT quotation_validity_days INTO v_validity_days
  FROM tenants WHERE id = p_tenant_id;
  
  -- Generate quotation number
  v_quotation_number := generate_quotation_number(p_tenant_id);
  v_valid_until := CURRENT_DATE + (COALESCE(v_validity_days, 30) || ' days')::INTERVAL;
  
  -- Calculate totals
  SELECT * INTO v_discount_amount, v_tax_amount, v_total
  FROM calculate_quotation_totals(p_subtotal, p_discount_percent);
  
  -- Get contract request details
  SELECT * INTO v_request
  FROM contract_requests
  WHERE id = p_contract_request_id;
  
  -- Create quotation
  INSERT INTO quotations (
    tenant_id,
    contract_request_id,
    quotation_number,
    quotation_date,
    valid_until,
    client_company_name,
    client_contact_person,
    client_phone,
    client_email,
    client_address,
    items,
    subtotal,
    discount_percent,
    discount_amount,
    tax_amount,
    total,
    payment_terms,
    notes,
    status,
    created_by
  ) VALUES (
    p_tenant_id,
    p_contract_request_id,
    v_quotation_number,
    CURRENT_DATE,
    v_valid_until,
    v_request.company_name,
    v_request.contact_person,
    v_request.phone,
    v_request.email,
    v_request.city, -- Using city as address for now
    p_items,
    p_subtotal,
    p_discount_percent,
    v_discount_amount,
    v_tax_amount,
    v_total,
    p_payment_terms,
    p_notes,
    'draft',
    auth.uid()
  ) RETURNING id INTO v_quotation_id;
  
  RETURN v_quotation_id;
END;
$$;

-- Comments
COMMENT ON TABLE quotations IS 'Tabel penawaran/quotation yang dikirim ke client';
COMMENT ON COLUMN quotations.items IS 'Array JSON berisi item: [{name, quantity, unit, price, total}]';
COMMENT ON COLUMN quotations.status IS 'draft, sent, accepted, rejected, expired';
COMMENT ON FUNCTION calculate_quotation_totals IS 'Hitung diskon, pajak, dan total quotation';
COMMENT ON FUNCTION create_quotation_from_request IS 'Buat quotation baru dari contract request';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Quotations table created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table Structure:';
  RAISE NOTICE '   - quotations: Main table';
  RAISE NOTICE '   - items: JSON array untuk breakdown';
  RAISE NOTICE '   - Auto-calculate: discount, tax, total';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 RLS Policies: Admin can CRUD';
  RAISE NOTICE '🔧 Functions:';
  RAISE NOTICE '   - calculate_quotation_totals()';
  RAISE NOTICE '   - create_quotation_from_request()';
  RAISE NOTICE '';
END $$;
