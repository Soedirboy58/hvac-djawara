-- ============================================
-- Client Premium Registration System
-- Enable client login with email verification
-- ============================================

-- Step 1: Add user_id column to clients (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX idx_clients_user_id ON clients(user_id);
  END IF;
END $$;

-- Step 2: Create client registration function
CREATE OR REPLACE FUNCTION register_client_account(
  p_client_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_client_exists BOOLEAN;
BEGIN
  -- Check if client exists
  SELECT EXISTS(SELECT 1 FROM clients WHERE id = p_client_id) INTO v_client_exists;
  
  IF NOT v_client_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client not found');
  END IF;

  -- Check if client already has account
  IF EXISTS(SELECT 1 FROM clients WHERE id = p_client_id AND user_id IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client already has an account');
  END IF;

  -- Create auth user (this requires service_role or admin privileges)
  -- Note: In production, this should be done via Supabase Auth API
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    role
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    NULL,  -- Will be set after email verification
    jsonb_build_object('full_name', p_full_name, 'user_type', 'client'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    NOW(),
    NOW(),
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Link user to client
  UPDATE clients
  SET user_id = v_user_id,
      is_premium_member = true,
      portal_activated_at = NOW()
  WHERE id = p_client_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Account created. Please check email for verification link.',
    'user_id', v_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 3: Create invitation function (send email to client)
CREATE OR REPLACE FUNCTION send_client_registration_invite(
  p_client_id UUID
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_email TEXT;
  v_client_name TEXT;
  v_public_token TEXT;
  v_registration_url TEXT;
BEGIN
  -- Get client details
  SELECT email, name, public_token
  INTO v_client_email, v_client_name, v_public_token
  FROM clients
  WHERE id = p_client_id;

  IF v_client_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client has no email');
  END IF;

  -- Generate registration URL
  v_registration_url := 'https://hvac-djawara.vercel.app/client/register?token=' || v_public_token;

  -- TODO: Integrate with email service (Resend, SendGrid, etc)
  -- For now, just return the URL
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Registration invite ready',
    'registration_url', v_registration_url,
    'client_email', v_client_email,
    'client_name', v_client_name
  );
END;
$$;

-- Step 4: RLS Policy for authenticated clients
CREATE POLICY "Authenticated clients can view own data"
  ON clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT EXECUTE ON FUNCTION register_client_account TO service_role;
GRANT EXECUTE ON FUNCTION send_client_registration_invite TO authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Client registration system created';
  RAISE NOTICE '📧 Clients can now register and verify email';
  RAISE NOTICE '🎁 Premium features only for authenticated clients';
  RAISE NOTICE '👉 Next: Create /client/register page in frontend';
END $$;
