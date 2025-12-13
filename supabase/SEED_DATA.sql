-- ============================================
-- SEED DATA & TRIGGERS
-- ============================================
-- Purpose: Add auto-create triggers for new users
-- Run this after DEPLOY_COMPLETE.sql
-- ============================================

-- ================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();

-- ================================================
-- SEED: DEMO TENANT
-- ================================================
-- Create demo tenant for first user
INSERT INTO public.tenants (
  id,
  slug,
  name,
  contact_email,
  contact_phone,
  subscription_status,
  subscription_plan,
  subscription_expires_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo-company',
  'Demo Company',
  'owner@demo.com',
  '+6281234567890',
  'trial',
  'basic',
  NOW() + INTERVAL '14 days'
) ON CONFLICT (id) DO NOTHING;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ TRIGGERS & SEED DATA COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Ready:';
  RAISE NOTICE '   • Auto-create profile trigger enabled';
  RAISE NOTICE '   • Demo tenant created';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 You can now register your first user!';
  RAISE NOTICE '';
END $$;
