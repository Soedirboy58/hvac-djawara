-- ============================================
-- Create RPC function to get team members with email
-- ============================================

CREATE OR REPLACE FUNCTION get_team_members(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role user_role,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  profiles JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    utr.id,
    utr.user_id,
    utr.role,
    utr.is_active,
    utr.created_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', au.email,
      'phone', p.phone,
      'avatar_url', p.avatar_url
    ) as profiles
  FROM user_tenant_roles utr
  INNER JOIN profiles p ON utr.user_id = p.id
  INNER JOIN auth.users au ON p.id = au.id
  WHERE utr.tenant_id = p_tenant_id
  ORDER BY utr.is_active DESC, utr.role;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_team_members(UUID) TO authenticated;
