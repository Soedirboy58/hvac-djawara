-- ============================================
-- FORCE CLEANUP - DELETE ALL AUTH + TECHNICIAN DATA
-- For email: delta.sc58@gmail.com
-- ============================================

DO $$
DECLARE
  v_email TEXT := 'delta.sc58@gmail.com';
  v_user_ids UUID[];
  v_user_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧹 FORCE CLEANUP STARTED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE '';

  -- Find ALL auth users with this email
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM auth.users
  WHERE email = v_email;

  -- Delete all auth users with this email
  IF v_user_ids IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      -- Delete identities
      DELETE FROM auth.identities WHERE user_id = v_user_id;
      RAISE NOTICE '✓ Deleted identity for user: %', v_user_id;
      
      -- Delete user
      DELETE FROM auth.users WHERE id = v_user_id;
      RAISE NOTICE '✓ Deleted auth user: %', v_user_id;
    END LOOP;
  ELSE
    RAISE NOTICE '- No auth users found';
  END IF;

  -- Reset technician record (don't delete, just reset)
  UPDATE technicians
  SET 
    user_id = NULL,
    is_verified = false,
    verification_token = encode(gen_random_bytes(16), 'hex'),
    token_expires_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
  WHERE email = v_email;

  IF FOUND THEN
    RAISE NOTICE '✓ Reset technician record';
  ELSE
    RAISE NOTICE '⚠ No technician record found';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Check token below';
  RAISE NOTICE '2. Go to /technician/verify';
  RAISE NOTICE '3. Enter email + token';
  RAISE NOTICE '4. Create password';
  RAISE NOTICE '5. Login';
  RAISE NOTICE '';
END $$;

-- Display new token
SELECT 
  employee_id,
  email,
  verification_token AS "NEW_TOKEN",
  token_expires_at,
  user_id,
  is_verified
FROM technicians
WHERE email = 'delta.sc58@gmail.com';
