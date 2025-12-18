-- ============================================
-- CLIENT AUTHENTICATION FLOW GUIDE
-- Panduan Lengkap: Public Link vs Premium Login
-- ============================================

/**
 * ALUR AKSES CLIENT - 2 METODE
 * 
 * 1. PUBLIC LINK (Tanpa Login) - BASIC ACCESS
 *    - Client dapat link: https://hvac-djawara.vercel.app/c/[public_token]
 *    - Akses LANGSUNG tanpa perlu login/registrasi
 *    - Fitur: Lihat service history, upcoming maintenance, track progress
 *    - Keterbatasan: Tidak bisa rate technician, tidak ada loyalty points
 * 
 * 2. PREMIUM ACCOUNT (Dengan Login) - FULL ACCESS
 *    - Client registrasi via invitation link
 *    - Login dengan email/password
 *    - Fitur FULL: Rate technician, loyalty points, detailed reports, priority support
 */

-- ============================================
-- STEP 1: Cek Token yang Sudah Ter-Generate
-- ============================================

-- Lihat semua client dengan public token mereka
SELECT 
  id,
  name,
  email,
  phone,
  public_token,
  user_id,
  'https://hvac-djawara.vercel.app/c/' || public_token as public_link
FROM clients
ORDER BY created_at DESC;

-- Ambil 1 token untuk testing
SELECT 
  'Test public link: https://hvac-djawara.vercel.app/c/' || public_token as test_link
FROM clients
LIMIT 1;

-- ============================================
-- STEP 2: Test RPC Function
-- ============================================

-- Test dengan token actual (ganti xxx dengan token dari query di atas)
-- SELECT * FROM get_client_by_public_token('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

-- ============================================
-- ALUR PUBLIC LINK (Tanpa Login)
-- ============================================

/**
 * Flow:
 * 1. Admin generate link untuk client (auto-generated saat client dibuat)
 * 2. Admin kirim link via WhatsApp/Email: https://hvac-djawara.vercel.app/c/[token]
 * 3. Client klik link
 * 4. System load data via RPC: get_client_by_public_token()
 * 5. Client lihat:
 *    - Service order history
 *    - Upcoming maintenance
 *    - AC unit statistics
 *    - Basic technician info
 * 6. Client lihat CTA untuk upgrade ke premium (optional)
 * 
 * Catatan: TIDAK PERLU LOGIN untuk akses ini!
 */

-- ============================================
-- ALUR PREMIUM REGISTRATION
-- ============================================

/**
 * Flow untuk upgrade ke premium account:
 * 
 * 1. CLIENT REQUEST PREMIUM
 *    - Client hubungi admin via WhatsApp/Phone
 *    - Minta upgrade ke premium account
 * 
 * 2. ADMIN SEND INVITATION
 *    - Admin buka staff dashboard
 *    - Generate registration invite untuk client
 *    - Send link: https://hvac-djawara.vercel.app/client/register?token=[public_token]
 * 
 * 3. CLIENT REGISTER
 *    - Client buka invitation link
 *    - Lihat premium benefits
 *    - Create password (min 8 karakter)
 *    - Submit registration
 * 
 * 4. EMAIL VERIFICATION
 *    - Client dapat email dari Supabase
 *    - Klik link verification di email
 *    - Email confirmed
 * 
 * 5. CLIENT LOGIN
 *    - Buka: https://hvac-djawara.vercel.app/client/login
 *    - Input email + password
 *    - Access premium dashboard
 * 
 * 6. PREMIUM FEATURES UNLOCKED
 *    - Rate technician services (bintang 1-5)
 *    - View detailed work reports
 *    - Loyalty points accumulation
 *    - Priority customer support
 *    - Full service history
 */

-- ============================================
-- STEP 3: Admin Generate Registration Link
-- ============================================

-- Cara 1: Manual - Copy public token
SELECT 
  id,
  name,
  email,
  public_token,
  'https://hvac-djawara.vercel.app/client/register?token=' || public_token as registration_link
FROM clients
WHERE email = 'client@example.com'; -- Ganti dengan email client

-- Cara 2: Via RPC Function (coming soon)
-- SELECT send_client_registration_invite('client-uuid-here');

-- ============================================
-- STEP 4: Verify Client Registration
-- ============================================

-- Cek apakah client sudah punya auth account
SELECT 
  c.id,
  c.name,
  c.email,
  c.user_id,
  CASE 
    WHEN c.user_id IS NOT NULL THEN 'Premium (Has Auth Account)'
    ELSE 'Basic (Public Link Only)'
  END as account_type
FROM clients c
ORDER BY c.created_at DESC;

-- Cek detail auth account
SELECT 
  c.name as client_name,
  c.email as client_email,
  c.user_id,
  u.email as auth_email,
  u.email_confirmed_at,
  u.created_at as auth_created_at
FROM clients c
LEFT JOIN auth.users u ON u.id = c.user_id
WHERE c.email = 'client@example.com'; -- Ganti dengan email client

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Problem 1: Public link tidak aktif
-- Solution:
-- 1. Pastikan ADD_PUBLIC_TOKEN_COLUMN.sql sudah dijalankan
-- 2. Pastikan CREATE_GET_CLIENT_BY_TOKEN.sql sudah dijalankan
-- 3. Verify tokens ter-generate:
SELECT COUNT(*) as total_clients, 
       COUNT(public_token) as clients_with_token,
       COUNT(user_id) as premium_clients
FROM clients;

-- Problem 2: Link shows "Link Tidak Valid"
-- Solution:
-- 1. Test RPC function dengan token actual
-- 2. Cek apakah token di URL match dengan database:
SELECT * FROM clients WHERE public_token = 'paste-token-dari-url-disini';

-- Problem 3: Cannot register
-- Solution:
-- 1. Cek apakah client sudah punya user_id (sudah registered)
-- 2. Pastikan email belum ada di auth.users
-- 3. Verify registration link format benar

-- Problem 4: Email verification tidak datang
-- Solution:
-- 1. Cek spam folder
-- 2. Verify Supabase email settings
-- 3. Check email quota (free tier terbatas)

-- ============================================
-- QUICK START COMMANDS
-- ============================================

-- 1. Get public link untuk client
SELECT 
  'Send this link to client: https://hvac-djawara.vercel.app/c/' || public_token
FROM clients 
WHERE email = 'client@example.com';

-- 2. Get registration link untuk premium upgrade
SELECT 
  'Send this link for premium registration: https://hvac-djawara.vercel.app/client/register?token=' || public_token
FROM clients 
WHERE email = 'client@example.com';

-- 3. Check client status
SELECT 
  name,
  email,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ Premium Member'
    ELSE '⭐ Basic Access Only'
  END as status,
  'https://hvac-djawara.vercel.app/c/' || public_token as public_link
FROM clients
ORDER BY created_at DESC;

-- ============================================
-- SUMMARY
-- ============================================

/**
 * UNTUK CLIENT BARU:
 * 1. System auto-generate public_token saat client dibuat
 * 2. Admin kirim public link ke client
 * 3. Client akses LANGSUNG tanpa login (basic features)
 * 4. Jika client mau premium, admin kirim registration link
 * 5. Client register → verify email → login
 * 
 * UNTUK CLIENT EXISTING (SUDAH PAKAI SYSTEM):
 * 1. Jalankan ADD_PUBLIC_TOKEN_COLUMN.sql (tokens auto-generated)
 * 2. Admin ambil public link dari database
 * 3. Kirim ke client via WhatsApp/Email
 * 4. Client langsung bisa akses
 * 
 * TIDAK PERLU LOGIN UNTUK BASIC ACCESS!
 * Login hanya untuk premium features (rating, loyalty points, etc)
 */
