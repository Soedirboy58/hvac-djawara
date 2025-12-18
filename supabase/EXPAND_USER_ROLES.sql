-- ============================================
-- Expand User Roles for People Management
-- Add new positions: direktur, admin, supervisi, manager, marketing, 
-- senior_teknisi, teknisi, helper, magang
-- ============================================

-- Step 1: View current enum values
DO $$ 
BEGIN
  RAISE NOTICE 'Current user_role enum values:';
  RAISE NOTICE '%', (
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype
  );
END $$;

-- Step 2: Add new roles to enum (one at a time)
-- Note: Cannot add multiple enum values in one statement

-- Management positions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'direktur' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'direktur';
    RAISE NOTICE '✅ Added: direktur';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'manager';
    RAISE NOTICE '✅ Added: manager';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supervisor' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'supervisor';
    RAISE NOTICE '✅ Added: supervisor';
  END IF;
END $$;

-- Administrative
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
    RAISE NOTICE '✅ Added: admin';
  END IF;
END $$;

-- Sales & Marketing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'marketing' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'marketing';
    RAISE NOTICE '✅ Added: marketing';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'business_dev' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'business_dev';
    RAISE NOTICE '✅ Added: business_dev';
  END IF;
END $$;

-- Technical positions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'senior_teknisi' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'senior_teknisi';
    RAISE NOTICE '✅ Added: senior_teknisi';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'teknisi' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'teknisi';
    RAISE NOTICE '✅ Added: teknisi';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'helper' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'helper';
    RAISE NOTICE '✅ Added: helper';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'magang' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'magang';
    RAISE NOTICE '✅ Added: magang';
  END IF;
END $$;

-- Step 3: Verify all roles added
DO $$ 
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Updated user_role enum values:';
  RAISE NOTICE '%', (
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype
  );
  RAISE NOTICE '====================================';
END $$;

-- Step 4: Create role hierarchy view
CREATE OR REPLACE VIEW role_hierarchy AS
SELECT 
    enumlabel as role_name,
    enumsortorder as sort_order,
    CASE 
        WHEN enumlabel IN ('owner', 'direktur') THEN 'Executive'
        WHEN enumlabel IN ('manager', 'supervisor', 'admin_finance', 'admin_logistic') THEN 'Management'
        WHEN enumlabel IN ('admin') THEN 'Administrative'
        WHEN enumlabel IN ('sales_partner', 'marketing', 'business_dev') THEN 'Sales & Marketing'
        WHEN enumlabel IN ('tech_head', 'senior_teknisi') THEN 'Senior Technical'
        WHEN enumlabel IN ('teknisi', 'technician') THEN 'Technical'
        WHEN enumlabel IN ('helper', 'magang') THEN 'Support'
        WHEN enumlabel = 'client' THEN 'External'
        ELSE 'Other'
    END as category,
    CASE 
        WHEN enumlabel = 'owner' THEN 'Pemilik Perusahaan'
        WHEN enumlabel = 'direktur' THEN 'Direktur'
        WHEN enumlabel = 'manager' THEN 'Manager'
        WHEN enumlabel = 'supervisor' THEN 'Supervisor'
        WHEN enumlabel = 'admin_finance' THEN 'Admin Finance'
        WHEN enumlabel = 'admin_logistic' THEN 'Admin Logistik'
        WHEN enumlabel = 'admin' THEN 'Admin'
        WHEN enumlabel = 'tech_head' THEN 'Kepala Teknisi'
        WHEN enumlabel = 'senior_teknisi' THEN 'Teknisi Senior'
        WHEN enumlabel = 'teknisi' THEN 'Teknisi'
        WHEN enumlabel = 'technician' THEN 'Teknisi'
        WHEN enumlabel = 'helper' THEN 'Helper'
        WHEN enumlabel = 'magang' THEN 'Magang/Trainee'
        WHEN enumlabel = 'sales_partner' THEN 'Sales Partner'
        WHEN enumlabel = 'marketing' THEN 'Marketing'
        WHEN enumlabel = 'business_dev' THEN 'Business Development'
        WHEN enumlabel = 'client' THEN 'Client'
        ELSE enumlabel
    END as display_name
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY 
    CASE 
        WHEN enumlabel IN ('owner', 'direktur') THEN 1
        WHEN enumlabel IN ('manager', 'supervisor') THEN 2
        WHEN enumlabel IN ('admin_finance', 'admin_logistic', 'admin') THEN 3
        WHEN enumlabel IN ('sales_partner', 'marketing', 'business_dev') THEN 4
        WHEN enumlabel IN ('tech_head', 'senior_teknisi') THEN 5
        WHEN enumlabel IN ('teknisi', 'technician') THEN 6
        WHEN enumlabel IN ('helper', 'magang') THEN 7
        WHEN enumlabel = 'client' THEN 8
        ELSE 9
    END,
    enumsortorder;

-- Grant access to view
GRANT SELECT ON role_hierarchy TO authenticated;

-- ============================================
-- Usage Examples
-- ============================================

-- View role hierarchy
-- SELECT * FROM role_hierarchy;

-- View role hierarchy by category
-- SELECT 
--   category,
--   string_agg(display_name, ', ' ORDER BY sort_order) as roles
-- FROM role_hierarchy
-- GROUP BY category
-- ORDER BY MIN(sort_order);

-- Count users by role
-- SELECT 
--   rh.display_name,
--   rh.category,
--   COUNT(utr.id) as user_count
-- FROM role_hierarchy rh
-- LEFT JOIN user_tenant_roles utr ON utr.role::text = rh.role_name
-- WHERE utr.is_active = TRUE OR utr.is_active IS NULL
-- GROUP BY rh.role_name, rh.display_name, rh.category, rh.sort_order
-- ORDER BY rh.sort_order;

-- ============================================
-- NOTES
-- ============================================
-- 1. Enum values cannot be removed once added
-- 2. Enum values cannot be renamed
-- 3. To modify, need to:
--    a. Create new enum type
--    b. Migrate data
--    c. Drop old enum
--    d. Rename new enum
-- 4. For this reason, we keep both 'technician' and 'teknisi'
--    for backward compatibility
