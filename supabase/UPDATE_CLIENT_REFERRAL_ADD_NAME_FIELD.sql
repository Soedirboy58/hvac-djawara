-- ============================================
-- Update Client Referral Tracking
-- Add referred_by_name field for passive partners
-- Allow manual entry without requiring activation
-- ============================================

-- Step 1: Add referred_by_name column for passive/manual referrals
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

-- Step 2: Add comment
COMMENT ON COLUMN clients.referred_by_name IS 'Name of sales/marketing person (for passive partners or manual entry)';

-- Step 3: Make referred_by_id nullable (already is, but ensuring)
-- This allows either referred_by_id OR referred_by_name to be used

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_referred_by_name 
ON clients(referred_by_name) WHERE referred_by_name IS NOT NULL;

-- Step 5: Verify columns
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name = 'referred_by_name'
  ) THEN
    RAISE NOTICE '✅ Column referred_by_name added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add referred_by_name column';
  END IF;
END $$;

-- Step 6: Update sales_client_acquisition view to include both types
CREATE OR REPLACE VIEW sales_client_acquisition AS
WITH active_referrals AS (
  -- Active partners with user accounts
  SELECT 
    p.id as sales_person_id,
    p.full_name as sales_person_name,
    utr.role::text as sales_role,
    'active' as partner_type,
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
),
passive_referrals AS (
  -- Passive partners (by name only)
  SELECT 
    NULL::uuid as sales_person_id,
    c.referred_by_name as sales_person_name,
    NULL::text as sales_role,
    'passive' as partner_type,
    COUNT(c.id) as total_clients_referred,
    COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as clients_last_30_days,
    COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as clients_last_7_days,
    MIN(c.created_at) as first_referral_date,
    MAX(c.created_at) as last_referral_date
  FROM clients c
  WHERE c.referred_by_name IS NOT NULL
    AND c.referred_by_id IS NULL
  GROUP BY c.referred_by_name
)
SELECT * FROM active_referrals
UNION ALL
SELECT * FROM passive_referrals
ORDER BY total_clients_referred DESC;

-- Grant access
GRANT SELECT ON sales_client_acquisition TO authenticated;

-- ============================================
-- Usage Examples
-- ============================================

-- View all client referrals (both active and passive)
-- SELECT 
--   c.name as client_name,
--   c.email,
--   c.created_at,
--   COALESCE(p.full_name, c.referred_by_name, 'No Referral') as referred_by,
--   CASE 
--     WHEN c.referred_by_id IS NOT NULL THEN 'Active Partner'
--     WHEN c.referred_by_name IS NOT NULL THEN 'Passive Partner'
--     ELSE 'No Referral'
--   END as referral_type
-- FROM clients c
-- LEFT JOIN profiles p ON c.referred_by_id = p.id
-- ORDER BY c.created_at DESC;

-- View sales performance (all partners)
-- SELECT * FROM sales_client_acquisition;

-- Final verification
DO $$ 
BEGIN
  RAISE NOTICE '✅ Client referral tracking updated - now supports both active and passive partners';
END $$;
