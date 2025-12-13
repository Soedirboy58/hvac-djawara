-- ============================================
-- Seed Data: Core Domain Sample Data
-- Purpose: Sample data untuk development & testing
-- Dependencies: All core tables & auth_helpers
-- Author: System Architect
-- Date: 2025-12-01
-- ============================================
-- 
-- USAGE:
-- psql -h db.xxx.supabase.co -U postgres -d postgres < seed/01_core_seed.sql
-- 
-- WARNING: Jangan run di production!
-- Data ini hanya untuk development & testing
--
-- ============================================

-- ================================================
-- SAMPLE TENANTS
-- ================================================

INSERT INTO public.tenants (
  id,
  slug,
  name,
  contact_email,
  contact_phone,
  address,
  city,
  province,
  subscription_status,
  subscription_plan,
  subscription_expires_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'ac-jaya',
    'AC Jaya Service',
    'info@acjaya.com',
    '+628123456789',
    'Jl. Gatot Subroto No. 123',
    'Jakarta Selatan',
    'DKI Jakarta',
    'active',
    'pro',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'hvac-pro',
    'HVAC Pro Indonesia',
    'contact@hvacpro.id',
    '+628987654321',
    'Jl. Sudirman No. 456',
    'Bandung',
    'Jawa Barat',
    'trial',
    'basic',
    NOW() + INTERVAL '14 days'
  )
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE '✓ Sample tenants created';

-- ================================================
-- SAMPLE USERS (via auth.users)
-- ================================================
-- Note: User harus dibuat via Supabase Auth API atau Dashboard
-- Di sini kita asumsikan sudah ada atau akan dibuat manual
-- Profiles akan auto-create via trigger

-- Placeholder IDs untuk user (akan dibuat manual):
-- Owner AC Jaya: 10000000-0000-0000-0000-000000000001
-- Admin AC Jaya: 10000000-0000-0000-0000-000000000002
-- Teknisi AC Jaya: 10000000-0000-0000-0000-000000000003

-- ================================================
-- SAMPLE USER TENANT ROLES
-- ================================================
-- Akan di-insert setelah user dibuat manual

-- Example untuk owner AC Jaya:
-- INSERT INTO public.user_tenant_roles (user_id, tenant_id, role, assigned_by)
-- VALUES (
--   '10000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000001',
--   'owner',
--   NULL -- Self-assigned during tenant creation
-- );

RAISE NOTICE '✓ Core seed data complete';
RAISE NOTICE '  ';
RAISE NOTICE 'NEXT STEPS:';
RAISE NOTICE '1. Create users via Supabase Dashboard > Authentication > Users';
RAISE NOTICE '2. Note their user IDs';
RAISE NOTICE '3. Insert user_tenant_roles manually or via app';
RAISE NOTICE '  ';
RAISE NOTICE 'Sample tenant credentials:';
RAISE NOTICE '- Tenant 1: ac-jaya (Active Pro plan)';
RAISE NOTICE '- Tenant 2: hvac-pro (Trial Basic plan)';
