-- ============================================
-- Get Client by Public Token (for registration)
-- Used in registration page to verify token
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_client_by_public_token(TEXT);

CREATE OR REPLACE FUNCTION get_client_by_public_token(p_token TEXT)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_email TEXT,
  has_account BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    (c.user_id IS NOT NULL) as has_account
  FROM clients c
  WHERE c.public_token = p_token;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_client_by_public_token(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION get_client_by_public_token IS 'Get client data by public token for registration flow';
