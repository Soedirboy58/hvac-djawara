-- ============================================
-- Enable Client Login (Optional)
-- Create auth account for existing client
-- ============================================

-- This creates a login account for client
-- Run ONLY if you want client to login with email/password

DO $$
DECLARE
  v_client_id UUID;
  v_client_email TEXT;
  v_temp_password TEXT := 'TempPass123!'; -- Client should change this
BEGIN
  -- Get client details
  SELECT id, email INTO v_client_id, v_client_email
  FROM clients
  WHERE email = 'yennita.anggraeniputri@gmail.com';

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  RAISE NOTICE 'Creating auth account for client: %', v_client_email;
  RAISE NOTICE 'Temporary password: %', v_temp_password;
  RAISE NOTICE 'Client should change password after first login';
  
  -- Note: You need to create user via Supabase Dashboard or API
  -- Cannot create auth.users directly via SQL for security reasons
  
  RAISE NOTICE '⚠️  ACTION REQUIRED:';
  RAISE NOTICE '1. Go to Supabase Dashboard → Authentication → Users';
  RAISE NOTICE '2. Click "Invite User" or "Add User"';
  RAISE NOTICE '3. Email: %', v_client_email;
  RAISE NOTICE '4. Generate password or set: %', v_temp_password;
  RAISE NOTICE '5. After user created, link it to client record';
END $$;

-- After creating auth user, link it to client:
-- UPDATE clients 
-- SET user_id = 'AUTH_USER_ID_HERE'
-- WHERE email = 'yennita.anggraeniputri@gmail.com';
