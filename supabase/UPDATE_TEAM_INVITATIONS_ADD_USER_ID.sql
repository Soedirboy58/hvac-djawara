-- ============================================
-- Update Team Invitations Table
-- Add user_id column to track activation status
-- ============================================

-- Add user_id column to track which user activated the invitation
ALTER TABLE team_invitations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_invitations_user_id ON team_invitations(user_id);

-- Update comment
COMMENT ON COLUMN team_invitations.user_id IS 'User ID after activation. NULL = passive partner (not activated yet)';

-- Create view for easy querying of partners
CREATE OR REPLACE VIEW partnership_network AS
SELECT 
  ti.id,
  ti.tenant_id,
  ti.email,
  ti.full_name,
  ti.phone,
  ti.role,
  ti.token,
  ti.expires_at,
  ti.status,
  ti.user_id,
  ti.created_at,
  ti.accepted_at,
  CASE 
    WHEN ti.user_id IS NOT NULL THEN 'active'
    WHEN ti.status = 'pending' THEN 'passive'
    ELSE 'inactive'
  END as partnership_status,
  t.name as tenant_name,
  p.full_name as activated_user_name
FROM team_invitations ti
LEFT JOIN tenants t ON ti.tenant_id = t.id
LEFT JOIN profiles p ON ti.user_id = p.id
WHERE ti.status != 'cancelled'
ORDER BY ti.created_at DESC;

-- Grant access
GRANT SELECT ON partnership_network TO authenticated;

COMMENT ON VIEW partnership_network IS 'Unified view of all partners: active (has dashboard) and passive (referral only)';
