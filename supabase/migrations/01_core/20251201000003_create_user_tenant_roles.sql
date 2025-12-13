-- ============================================
-- Migration: Create User Tenant Roles Table
-- Domain: Core
-- Purpose: Junction table for user ↔ tenant ↔ role
-- Dependencies: profiles, tenants
-- Author: System Architect
-- Date: 2025-12-01
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: TABLE CREATION
-- ================================================
CREATE TABLE IF NOT EXISTS public.user_tenant_roles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Role
  role user_role NOT NULL,
  
  -- Branch Scope (optional, for branch-level access)
  branch_id UUID, -- Will reference branches table (created later)
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Assignment Metadata
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_tenant_role UNIQUE (user_id, tenant_id, role),
  CONSTRAINT self_assignment_check CHECK (user_id != assigned_by OR assigned_by IS NULL)
);

-- ================================================
-- SECTION 2: INDEXES
-- ================================================
CREATE INDEX idx_user_tenant_roles_user ON public.user_tenant_roles(user_id);
CREATE INDEX idx_user_tenant_roles_tenant ON public.user_tenant_roles(tenant_id);
CREATE INDEX idx_user_tenant_roles_role ON public.user_tenant_roles(role);
CREATE INDEX idx_user_tenant_roles_active ON public.user_tenant_roles(user_id, tenant_id) 
  WHERE is_active = true;
CREATE INDEX idx_user_tenant_roles_branch ON public.user_tenant_roles(branch_id) 
  WHERE branch_id IS NOT NULL;

-- ================================================
-- SECTION 3: TRIGGERS
-- ================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_tenant_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Auto-set active_tenant_id on first role assignment
CREATE OR REPLACE FUNCTION public.set_first_active_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- If user has no active tenant, set this one as active
  UPDATE public.profiles
  SET active_tenant_id = NEW.tenant_id
  WHERE id = NEW.user_id
    AND active_tenant_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_set_first_active_tenant
  AFTER INSERT ON public.user_tenant_roles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.set_first_active_tenant();

COMMENT ON FUNCTION public.set_first_active_tenant() IS 
'Auto-set active_tenant_id in profiles when user gets first role assignment.
Only triggers if user has no active tenant set.
Helps with initial tenant selection for new users.';

-- ================================================
-- SECTION 4: RLS (Enable only, policies in separate file)
-- ================================================
ALTER TABLE public.user_tenant_roles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 5: COMMENTS (Documentation)
-- ================================================
COMMENT ON TABLE public.user_tenant_roles IS 
'Junction table for many-to-many relationship: user ↔ tenant ↔ role.
One user can have multiple roles in multiple tenants.
Example: User A is "owner" in Tenant X and "investor" in Tenant Y.
See: PANDUAN-AWAL.md → Multi-Tenant & Role Design';

COMMENT ON COLUMN public.user_tenant_roles.role IS 
'User role in this tenant. Values:
- owner: Full access, approvals
- investor: Read-only analytics
- admin_finance: Finance management
- admin_logistic: Inventory management
- tech_head: Team lead
- technician: Execute jobs
- helper: Assistant technician
- sales_partner: Manage own clients
- client: Customer portal';

COMMENT ON COLUMN public.user_tenant_roles.branch_id IS 
'Optional: Scope user access to specific branch.
NULL = user has access to all branches in tenant.
NOT NULL = user only sees data from this branch.
Useful for: technician assigned to one branch, admin per branch.';

COMMENT ON COLUMN public.user_tenant_roles.is_active IS 
'Active status of this role assignment.
false = role suspended (user still in system but role disabled).
Used instead of DELETE for audit trail.';

COMMENT ON COLUMN public.user_tenant_roles.assigned_by IS 
'Who assigned this role (audit trail).
NULL = system-assigned (e.g., owner during tenant creation).
References profiles.id of the assigner.';

COMMENT ON CONSTRAINT unique_user_tenant_role ON public.user_tenant_roles IS 
'Prevent duplicate role assignments.
One user cannot have same role twice in same tenant.
But can have different roles in same tenant (e.g., admin_finance + admin_logistic).';

-- ================================================
-- SECTION 6: VALIDATION
-- ================================================
DO $$
DECLARE
  table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  constraint_count INT;
  index_count INT;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_tenant_roles'
  ) INTO table_exists;
  
  ASSERT table_exists, 'Table user_tenant_roles not created';
  
  -- Check RLS enabled
  SELECT rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'user_tenant_roles'
  INTO rls_enabled;
  
  ASSERT rls_enabled, 'RLS not enabled on user_tenant_roles';
  
  -- Check constraints
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE table_name = 'user_tenant_roles' 
  AND constraint_type IN ('UNIQUE', 'CHECK')
  INTO constraint_count;
  
  ASSERT constraint_count >= 2, 
         'Expected at least 2 constraints (unique + check), found ' || constraint_count;
  
  -- Check indexes
  SELECT COUNT(*) 
  FROM pg_indexes 
  WHERE tablename = 'user_tenant_roles'
  INTO index_count;
  
  ASSERT index_count >= 5, 
         'Expected at least 5 indexes, found ' || index_count;
  
  RAISE NOTICE '✓ User Tenant Roles table created successfully';
  RAISE NOTICE '  - Table exists: %', table_exists;
  RAISE NOTICE '  - RLS enabled: %', rls_enabled;
  RAISE NOTICE '  - Constraints: %', constraint_count;
  RAISE NOTICE '  - Indexes: %', index_count;
END $$;
