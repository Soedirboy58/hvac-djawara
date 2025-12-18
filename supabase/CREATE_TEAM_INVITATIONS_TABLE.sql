-- ============================================
-- Create Team Invitations Table
-- For inviting sales partners, marketing, and other team members
-- ============================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for their tenant
CREATE POLICY "Users can view team invitations for their tenant"
  ON team_invitations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_tenant_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON team_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_tenant_roles 
      WHERE user_id = auth.uid() 
        AND tenant_id = team_invitations.tenant_id
        AND role IN ('owner', 'admin_finance', 'admin_logistic')
    )
  );

-- Policy: Only owners and admins can update invitations
CREATE POLICY "Owners and admins can update invitations"
  ON team_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM user_tenant_roles 
      WHERE user_id = auth.uid() 
        AND tenant_id = team_invitations.tenant_id
        AND role IN ('owner', 'admin_finance', 'admin_logistic')
    )
  );

-- Policy: Invited users can accept their invitation (public access via token)
CREATE POLICY "Anyone can view invitation by token"
  ON team_invitations
  FOR SELECT
  USING (true);

COMMENT ON TABLE team_invitations IS 'Stores invitations for new team members (sales, marketing, technicians, etc.)';
