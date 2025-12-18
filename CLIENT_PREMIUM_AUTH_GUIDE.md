# Client Premium Authentication System

## Overview
Sistem autentikasi 2-level untuk client:
1. **Public Link (Basic)** - Tanpa login, akses terbatas
2. **Premium Account (Authenticated)** - Dengan login, akses penuh

## Fitur per Level

### Basic Access (Public Link)
✅ Lihat status service order
✅ Lihat upcoming maintenance
✅ Track real-time progress
✅ Lihat basic info technician

❌ Tidak bisa rate technician
❌ Tidak bisa lihat detailed report
❌ Tidak ada loyalty points
❌ Tidak ada priority support

### Premium Access (Authenticated)
✅ Semua fitur basic
✅ **Rate technician** (bintang 1-5 + feedback)
✅ **Loyalty points program**
✅ **View detailed work reports**
✅ **Priority customer support**
✅ **Full service history**
✅ **Personalized dashboard**

## SQL Migrations Required

### 1. Execute Service Reports Table
```bash
# File: supabase/CREATE_SERVICE_REPORTS_TABLE.sql
```

Isi:
- Creates `service_reports` table
- RLS policies untuk service_role dan staff
- RPC: `get_service_report_by_order()`
- RPC: `submit_service_rating()`

### 2. Execute Client Registration System
```bash
# File: supabase/CREATE_CLIENT_REGISTRATION.sql
```

Isi:
- Adds `user_id` column to `clients` table
- RPC: `register_client_account()` - Link auth.users dengan client
- RPC: `send_client_registration_invite()` - Generate registration URL
- RLS policy untuk authenticated clients

### 3. Execute Get Client by Token Function
```bash
# File: supabase/CREATE_GET_CLIENT_BY_TOKEN.sql
```

Isi:
- RPC: `get_client_by_public_token()` - Untuk registration page

## Frontend Pages Created

### 1. /client/register
**File:** `app/client/register/page.tsx`

**Flow:**
1. User dapat link registrasi dengan token: `/client/register?token=xxx`
2. System verify token via `get_client_by_public_token()`
3. User buat password (min 8 karakter)
4. System create auth.users via `supabase.auth.signUp()`
5. System link user_id ke clients table
6. User dapat email verification
7. Redirect ke `/client/verify-email`

**Features:**
- Premium benefits showcase
- Client info display (name, email)
- Password confirmation
- Auto-link to existing client record

### 2. /client/verify-email
**File:** `app/client/verify-email/page.tsx`

**Flow:**
1. Shows after registration
2. Instruksi untuk cek email
3. Link ke login page

**Features:**
- Email verification instructions
- Link to login
- Spam folder reminder

### 3. /client/login
**File:** `app/client/login/page.tsx` (Updated)

**Flow:**
1. User input email + password
2. `supabase.auth.signInWithPassword()`
3. Verify user adalah client via clients table
4. Check `is_premium_member` status
5. Redirect ke `/client/dashboard`

**Features:**
- Premium branding (Crown icon)
- Info alert: public link vs login
- Premium upgrade CTA
- Email/password authentication

## Registration Flow (End-to-End)

### Admin Side (Staff Dashboard)
```typescript
// In staff dashboard, generate registration invite
const { data } = await supabase.rpc('send_client_registration_invite', {
  p_client_id: 'client-uuid-here'
})

// Returns: { registration_url: 'https://app.com/client/register?token=xxx' }
// Send URL via email/WhatsApp ke client
```

### Client Side
1. **Receive invite link**
   - Via email atau WhatsApp
   - Link format: `/client/register?token=public-token-here`

2. **Open registration page**
   - System load client data dari token
   - Show premium benefits
   - Form: password + confirm password

3. **Create account**
   - Submit registration form
   - System create auth.users account
   - Link user_id to clients table
   - Set `is_premium_member = true`
   - Send verification email

4. **Verify email**
   - Client klik link di email
   - Email confirmed

5. **Login**
   - Go to `/client/login`
   - Input email + password
   - Access premium dashboard

## Database Schema Changes

### clients table
```sql
-- Add user_id column
ALTER TABLE clients 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add premium status
ALTER TABLE clients
ADD COLUMN is_premium_member BOOLEAN DEFAULT FALSE;

-- Add activation timestamp
ALTER TABLE clients
ADD COLUMN portal_activated_at TIMESTAMPTZ;

-- Index for faster lookups
CREATE INDEX idx_clients_user_id ON clients(user_id);
```

### service_reports table (New)
```sql
CREATE TABLE service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id),
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,
  work_description TEXT,
  findings TEXT,
  recommendations TEXT,
  parts_used JSONB DEFAULT '[]',
  photos TEXT[],
  technician_signature TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_feedback TEXT,
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## RPC Functions

### register_client_account()
```sql
-- Link auth.users dengan clients table
register_client_account(
  p_client_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
)
```

### send_client_registration_invite()
```sql
-- Generate registration URL
send_client_registration_invite(
  p_client_id UUID
) RETURNS JSONB
```

### get_client_by_public_token()
```sql
-- Get client data untuk registration
get_client_by_public_token(
  p_token TEXT
) RETURNS TABLE(...)
```

### get_service_report_by_order()
```sql
-- Get service report dengan RLS bypass
get_service_report_by_order(
  p_order_id UUID,
  p_token TEXT -- Optional untuk public access
) RETURNS JSONB
```

### submit_service_rating()
```sql
-- Submit rating untuk premium clients
submit_service_rating(
  p_order_id UUID,
  p_rating INTEGER,
  p_feedback TEXT,
  p_token TEXT -- Optional
) RETURNS JSONB
```

## Component Updates Needed

### ServiceOrderDetailModal
**File:** `components/client-portal/ServiceOrderDetailModal.tsx`

**Changes needed:**
- Accept `isAuthenticated` prop (tidak hanya `isPremium`)
- Untuk authenticated users, gunakan `supabase.auth.getUser()` bukan token
- RPC calls tanpa token parameter kalau authenticated

### ClientServiceHistory
**File:** `components/client-portal/ClientServiceHistory.tsx`

**Current:** Already implemented, works with both public and authenticated

## Implementation Steps

### Step 1: Execute SQL Migrations
```bash
# Di Supabase Dashboard → SQL Editor

1. Paste & Run: CREATE_SERVICE_REPORTS_TABLE.sql
2. Paste & Run: CREATE_CLIENT_REGISTRATION.sql
3. Paste & Run: CREATE_GET_CLIENT_BY_TOKEN.sql
```

### Step 2: Test Registration Flow
```bash
# 1. Get existing client token
SELECT public_token FROM clients WHERE email = 'test@example.com';

# 2. Open browser
https://your-app.com/client/register?token=<token-from-step-1>

# 3. Create password
# 4. Check email untuk verification
# 5. Click verification link
# 6. Login di /client/login
```

### Step 3: Update Components
- Update `ServiceOrderDetailModal` untuk authenticated users
- Update RPC calls untuk skip token kalau authenticated
- Add premium feature guards

### Step 4: Test Premium Features
```bash
# Login sebagai premium client
# Try:
- ✅ Rate technician service
- ✅ View detailed work reports
- ✅ Check loyalty points
- ✅ View full service history
```

## Email Configuration

### Supabase Auth Emails
```bash
# Di Supabase Dashboard → Authentication → Email Templates

1. Confirm Signup
Subject: Verify your email - HVAC Djawara
Template: Custom dengan branding

2. Reset Password
Subject: Reset your password
Template: Custom dengan instruksi
```

### SMTP Settings (Optional)
```bash
# Untuk custom email sender
# Settings → Project Settings → Auth

SMTP Host: smtp.gmail.com (or Resend/SendGrid)
SMTP Port: 587
SMTP User: noreply@hvacdjawara.com
SMTP Password: ********
```

## Access Control Implementation

### Frontend Guards
```typescript
// In components, check authentication
const { data: { user } } = await supabase.auth.getUser()
const canRate = user && clientData.is_premium_member

// Conditional rendering
{canRate && (
  <RatingInterface />
)}

{!canRate && (
  <Button onClick={upgradePrompt}>
    <Crown /> Upgrade to Premium to Rate
  </Button>
)}
```

### RLS Policies
```sql
-- Clients can only view own data
CREATE POLICY "Clients view own data"
ON clients FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Clients can submit ratings for their orders
CREATE POLICY "Clients rate own orders"
ON service_reports FOR UPDATE
TO authenticated
USING (
  service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
);
```

## Testing Checklist

### Basic Access (Public Link)
- [ ] Can access `/c/[token]` without login
- [ ] Can view service order status
- [ ] Can view upcoming maintenance
- [ ] Cannot rate technician (button disabled/hidden)
- [ ] Cannot view detailed reports

### Premium Access (Authenticated)
- [ ] Can register via invitation link
- [ ] Receives verification email
- [ ] Can login with email/password
- [ ] Can view premium dashboard
- [ ] Can rate technician services
- [ ] Can view detailed work reports
- [ ] Loyalty points display correctly
- [ ] Can logout

### Security
- [ ] Public token works only for basic access
- [ ] Authentication required for premium features
- [ ] RLS policies enforce access control
- [ ] Email verification required
- [ ] Password meets minimum requirements

## Troubleshooting

### Issue: Email not received
**Solution:**
1. Check spam folder
2. Verify email settings in Supabase Dashboard
3. Check email quota (free tier limited)
4. Use Resend/SendGrid for production

### Issue: Registration fails
**Solution:**
1. Check if client already has user_id
2. Verify token is valid and not expired
3. Check browser console for errors
4. Verify SQL functions executed correctly

### Issue: Cannot login after registration
**Solution:**
1. Check email verification status
2. Verify user created in auth.users table
3. Check if user_id linked to clients table
4. Confirm is_premium_member = true

### Issue: Rating not submitting
**Solution:**
1. Check authentication status
2. Verify is_premium_member = true
3. Check service_reports table permissions
4. Verify order belongs to logged-in client

## Production Deployment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-only)
```

### Vercel Deployment
```bash
# Auto-deploy via Git push
git add .
git commit -m "Add client premium authentication"
git push origin main
```

### Post-Deployment Tasks
1. ✅ Verify all SQL migrations executed
2. ✅ Test registration flow end-to-end
3. ✅ Configure email templates
4. ✅ Test email delivery
5. ✅ Verify RLS policies working
6. ✅ Test premium features
7. ✅ Monitor error logs

## Future Enhancements

### Phase 2 Features
- [ ] Social login (Google, Facebook)
- [ ] Two-factor authentication
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] In-app chat support

### Phase 3 Features
- [ ] Referral program
- [ ] Subscription management
- [ ] Invoice auto-pay
- [ ] Reward redemption system

## Support

### For Admins
- Generate registration links via staff dashboard
- Send invites via WhatsApp/Email
- Monitor premium adoption rate
- Track feature usage

### For Clients
- Contact support for password reset
- Use public link for basic tracking
- Upgrade to premium for full features
- Email: support@hvacdjawara.com
