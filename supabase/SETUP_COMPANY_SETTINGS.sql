-- ============================================
-- SETUP COMPANY SETTINGS FOR QUOTATION
-- PT. Djawara Tiga Gunung
-- ============================================

-- Step 1: Add company columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_legal_name VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_trade_name VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_phone VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_email VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_website VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Quotation settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_prefix VARCHAR(20) DEFAULT 'DTG-QT';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_validity_days INT DEFAULT 30;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_counter INT DEFAULT 0;

-- Payment info
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(200);

-- Tax
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS npwp VARCHAR(30);

COMMENT ON COLUMN tenants.company_legal_name IS 'Nama resmi perusahaan (PT, CV, dll)';
COMMENT ON COLUMN tenants.company_trade_name IS 'Nama usaha/brand';
COMMENT ON COLUMN tenants.quotation_prefix IS 'Format: DTG-QT';
COMMENT ON COLUMN tenants.quotation_counter IS 'Auto-increment untuk nomor quotation';

-- Step 2: Update existing tenant with company data
UPDATE tenants SET
  company_legal_name = 'PT. Djawara Tiga Gunung',
  company_trade_name = 'HVAC Djawara',
  company_address = 'Jakarta, Indonesia',
  company_phone = '082242638999',
  company_email = 'pt.djawara3g@gmail.com',
  company_website = NULL, -- Will be this platform URL
  company_logo_url = 'https://tukbuzdngodvcysncwke.supabase.co/storage/v1/object/public/client-avatars/Logo%201.png',
  
  quotation_prefix = 'DTG-QT',
  quotation_validity_days = 30,
  quotation_counter = 0,
  
  bank_name = 'BNI',
  bank_account_number = '1540615648',
  bank_account_holder = 'PT. Djawara Tiga Gunung',
  
  npwp = '61.355.563.0-529.000',
  
  updated_at = NOW()
WHERE name = 'HVAC Djawara'
RETURNING id, name, company_legal_name, company_email;

-- Step 3: Create function to generate quotation number
-- Format: DTG-QT/[Roman Month]/NNN
-- Example: DTG-QT/I/001 (Januari), DTG-QT/XII/025 (Desember)
CREATE OR REPLACE FUNCTION generate_quotation_number(tenant_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  month_roman TEXT;
  counter INT;
  formatted_number TEXT;
  current_month INT;
  roman_months TEXT[] := ARRAY['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
BEGIN
  -- Get tenant settings
  SELECT quotation_prefix, quotation_counter + 1
  INTO prefix, counter
  FROM tenants
  WHERE id = tenant_uuid;
  
  -- Get current month in Roman
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  month_roman := roman_months[current_month];
  
  -- Format: DTG-QT/I/001
  formatted_number := prefix || '/' || month_roman || '/' || LPAD(counter::TEXT, 3, '0');
  
  -- Update counter
  UPDATE tenants
  SET quotation_counter = counter,
      updated_at = NOW()
  WHERE id = tenant_uuid;
  
  RETURN formatted_number;
END;
$$;

COMMENT ON FUNCTION generate_quotation_number IS 'Generate quotation number dengan format DTG-QT/[Bulan Romawi]/NNN';

-- Step 4: Create function to get company settings
CREATE OR REPLACE FUNCTION get_company_settings(tenant_uuid UUID)
RETURNS TABLE (
  company_legal_name TEXT,
  company_trade_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  quotation_prefix TEXT,
  quotation_validity_days INT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  npwp TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.company_legal_name::TEXT,
    t.company_trade_name::TEXT,
    t.company_address::TEXT,
    t.company_phone::TEXT,
    t.company_email::TEXT,
    t.company_website::TEXT,
    t.company_logo_url::TEXT,
    t.quotation_prefix::TEXT,
    t.quotation_validity_days,
    t.bank_name::TEXT,
    t.bank_account_number::TEXT,
    t.bank_account_holder::TEXT,
    t.npwp::TEXT
  FROM tenants t
  WHERE t.id = tenant_uuid;
END;
$$;

-- Step 5: Test functions
-- Test generate quotation number
DO $$
DECLARE
  test_tenant_id UUID;
  test_quotation_number TEXT;
BEGIN
  -- Get first tenant
  SELECT id INTO test_tenant_id FROM tenants LIMIT 1;
  
  -- Generate 3 sample quotation numbers
  FOR i IN 1..3 LOOP
    test_quotation_number := generate_quotation_number(test_tenant_id);
    RAISE NOTICE 'Generated: %', test_quotation_number;
  END LOOP;
  
  -- Reset counter for testing
  UPDATE tenants SET quotation_counter = 0 WHERE id = test_tenant_id;
END $$;

-- Step 6: Verify company settings
SELECT 
  id,
  name as tenant_name,
  company_legal_name,
  company_trade_name,
  company_email,
  company_phone,
  quotation_prefix,
  quotation_validity_days,
  bank_name,
  bank_account_number,
  npwp
FROM tenants
WHERE company_legal_name IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Company settings configured successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Company Info:';
  RAISE NOTICE '   Legal Name: PT. Djawara Tiga Gunung';
  RAISE NOTICE '   Trade Name: HVAC Djawara';
  RAISE NOTICE '   Phone: 082242638999';
  RAISE NOTICE '   Email: pt.djawara3g@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE '💼 Quotation Settings:';
  RAISE NOTICE '   Format: DTG-QT/[Bulan Romawi]/NNN';
  RAISE NOTICE '   Example: DTG-QT/XII/001 (Desember 2025)';
  RAISE NOTICE '   Validity: 30 days';
  RAISE NOTICE '';
  RAISE NOTICE '🏦 Bank Info:';
  RAISE NOTICE '   BNI - 1540615648';
  RAISE NOTICE '   a/n PT. Djawara Tiga Gunung';
  RAISE NOTICE '';
  RAISE NOTICE '📝 NPWP: 61.355.563.0-529.000';
  RAISE NOTICE '';
END $$;
