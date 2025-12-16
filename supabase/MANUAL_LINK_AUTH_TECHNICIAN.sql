-- ============================================
-- MANUAL FIX - Link Auth User to Technician
-- For email: delta.sc58@gmail.com
-- ============================================

DO $$
DECLARE
  v_email TEXT := 'delta.sc58@gmail.com';
  v_user_id UUID;
  v_tech_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔗 MANUAL LINK STARTED';
  RAISE NOTICE '========================================';
  
  -- Find auth user with this email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ No auth user found with email: %', v_email;
    RAISE NOTICE 'User needs to complete verification first!';
    RETURN;
  END IF;

  RAISE NOTICE '✓ Found auth user: %', v_user_id;

  -- Find technician with this email
  SELECT id INTO v_tech_id
  FROM technicians
  WHERE email = v_email;

  IF v_tech_id IS NULL THEN
    RAISE NOTICE '❌ No technician found with email: %', v_email;
    RETURN;
  END IF;

  RAISE NOTICE '✓ Found technician: %', v_tech_id;

  -- Update technician with user_id
  UPDATE technicians
  SET 
    user_id = v_user_id,
    is_verified = true,
    verification_token = NULL,
    token_expires_at = NULL,
    updated_at = NOW()
  WHERE id = v_tech_id;

  RAISE NOTICE '✓ Linked user to technician';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LINK COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login with:';
  RAISE NOTICE '  Email: %', v_email;
  RAISE NOTICE '  Password: (the one you created)';
  RAISE NOTICE '';
END $$;

-- Verify the link
SELECT 
  t.employee_id,
  t.email,
  t.user_id,
  t.is_verified,
  u.email as auth_email,
  u.email_confirmed_at IS NOT NULL as email_confirmed
FROM technicians t
LEFT JOIN auth.users u ON t.user_id = u.id
WHERE t.email = 'delta.sc58@gmail.com';
