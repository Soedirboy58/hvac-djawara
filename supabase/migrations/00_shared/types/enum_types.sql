-- ============================================
-- Shared Types: Enums
-- Purpose: Define reusable enum types
-- Author: System Architect
-- Date: 2025-12-01
-- ============================================

-- ================================================
-- ENUM: user_role
-- Purpose: User roles in the system
-- ================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'owner',
    'investor',
    'admin_finance',
    'admin_logistic',
    'tech_head',
    'technician',
    'helper',
    'sales_partner',
    'client'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE user_role IS 
'User roles in the platform:
- owner: Full access, approvals
- investor: Read-only analytics
- admin_finance: Finance management
- admin_logistic: Inventory management
- tech_head: Team lead, assignments
- technician: Execute jobs
- helper: Assistant technician
- sales_partner: Manage own clients
- client: Customer portal access';

-- ================================================
-- ENUM: subscription_status
-- Purpose: Tenant subscription status
-- ================================================
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trial',
    'active',
    'suspended',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE subscription_status IS 
'Tenant subscription status:
- trial: 14 days free trial
- active: Paid and active
- suspended: Non-payment, temporary block
- cancelled: Permanently closed';

-- ================================================
-- ENUM: subscription_plan
-- Purpose: Subscription plan tiers
-- ================================================
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM (
    'basic',
    'pro',
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE subscription_plan IS 
'Subscription plan tiers:
- basic: Up to 10 users, basic features
- pro: Up to 50 users, advanced features
- enterprise: Unlimited users, all features + custom';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  type_count INT;
BEGIN
  SELECT COUNT(*) INTO type_count
  FROM pg_type 
  WHERE typname IN ('user_role', 'subscription_status', 'subscription_plan');
  
  ASSERT type_count = 3, 
         'Expected 3 enum types, found ' || type_count;
         
  RAISE NOTICE '✓ All enum types created successfully';
END $$;
