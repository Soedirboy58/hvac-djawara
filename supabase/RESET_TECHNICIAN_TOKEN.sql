-- ============================================
-- RESET TECHNICIAN TOKEN
-- Generate new token for technician who failed verification
-- ============================================

-- Reset technician with email delta.sc58@gmail.com
-- This will:
-- 1. Clear user_id (if exists)
-- 2. Generate new verification token
-- 3. Set new expiry (7 days from now)

DO $$
DECLARE
  v_email TEXT := 'delta.sc58@gmail.com';
  v_new_token TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user_id if exists
  SELECT user_id INTO v_user_id
  FROM technicians
  WHERE email = v_email;

  -- Delete auth user if exists (cleanup failed attempt)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE 'Deleted existing auth user: %', v_user_id;
  END IF;

  -- Generate new token
  v_new_token := encode(gen_random_bytes(16), 'hex');

  -- Update technician with new token
  UPDATE technicians
  SET 
    user_id = NULL,
    is_verified = false,
    verification_token = v_new_token,
    token_expires_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
  WHERE email = v_email;

  -- Display new token
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TOKEN BARU UNTUK TEKNISI';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Token: %', v_new_token;
  RAISE NOTICE 'Expired: %', (NOW() + INTERVAL '7 days')::timestamp;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Gunakan token ini untuk verifikasi ulang';
  RAISE NOTICE '';
END $$;

-- Check result
SELECT 
  employee_id,
  email,
  verification_token,
  token_expires_at,
  user_id,
  is_verified
FROM technicians
WHERE email = 'delta.sc58@gmail.com';
