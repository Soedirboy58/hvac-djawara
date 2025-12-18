-- ============================================
-- Add Sales Referral Tracking to Clients
-- Track which sales/marketing person referred each client
-- ============================================

-- Step 1: Add referred_by_id column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES profiles(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_referred_by 
ON clients(referred_by_id);

-- Step 3: Add comment
COMMENT ON COLUMN clients.referred_by_id IS 'Sales/Marketing person who referred this client';

-- Step 4: Verify column added
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name = 'referred_by_id'
  ) THEN
    RAISE NOTICE '✅ Column referred_by_id added successfully to clients table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add referred_by_id column';
  END IF;
END $$;

-- Step 5: Create view for sales performance (client acquisition)
CREATE OR REPLACE VIEW sales_client_acquisition AS
SELECT 
    p.id as sales_person_id,
    p.full_name as sales_person_name,
    utr.role as sales_role,
    COUNT(c.id) as total_clients_referred,
    COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as clients_last_30_days,
    COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as clients_last_7_days,
    MIN(c.created_at) as first_referral_date,
    MAX(c.created_at) as last_referral_date
FROM profiles p
INNER JOIN user_tenant_roles utr ON p.id = utr.user_id
LEFT JOIN clients c ON p.id = c.referred_by_id
WHERE utr.role IN ('sales_partner', 'marketing', 'business_dev')
  AND utr.is_active = TRUE
GROUP BY p.id, p.full_name, utr.role
ORDER BY total_clients_referred DESC;

-- Step 6: Grant access to view
GRANT SELECT ON sales_client_acquisition TO authenticated;

-- ============================================
-- Usage Examples
-- ============================================

-- View all clients with their referring sales person
-- SELECT 
--   c.name as client_name,
--   c.email,
--   c.created_at,
--   p.full_name as referred_by,
--   utr.role as sales_role
-- FROM clients c
-- LEFT JOIN profiles p ON c.referred_by_id = p.id
-- LEFT JOIN user_tenant_roles utr ON p.id = utr.user_id
-- WHERE c.referred_by_id IS NOT NULL
-- ORDER BY c.created_at DESC;

-- View sales performance (client acquisition)
-- SELECT * FROM sales_client_acquisition;

-- Get specific sales person's referred clients
-- SELECT 
--   c.name,
--   c.email,
--   c.phone,
--   c.client_type,
--   c.created_at
-- FROM clients c
-- WHERE c.referred_by_id = 'sales-person-uuid'
-- ORDER BY c.created_at DESC;
