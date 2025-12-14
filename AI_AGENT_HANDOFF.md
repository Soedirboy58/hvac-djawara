# 🤖 AI AGENT HANDOFF GUIDE
## HVAC Djawara Management Platform

**Date:** December 14, 2025  
**Status:** ✅ Landing Page & Public Form DEPLOYED & WORKING  
**Next:** Priority 1 - Order Management UI

---

## 📋 PROJECT OVERVIEW

**Platform:** HVAC/AC Service Management System  
**Tech Stack:**
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Deployment: Vercel (auto-deploy from GitHub)

**Company:** HVAC Djawara (hvac-djawara)  
**Live URL:** https://hvac-djawara.vercel.app

---

## ✅ WHAT'S WORKING NOW

### 1. Landing Page ✅
- **URL:** https://hvac-djawara.vercel.app
- **Features:**
  - Hero section with carousel
  - Service offerings
  - About company
  - Contact form (working!)
  - Responsive design

### 2. Public Customer Form ✅
- **Location:** Landing page (modal)
- **Functionality:** 
  - Customer fills: name, phone, email, address, service type, preferred date/time
  - Creates/updates client in `clients` table
  - Creates service order in `service_orders` table with status `pending`
  - Auto-generates order number: SO-202512-0001, SO-202512-0002, etc.
- **Status:** TESTED & WORKING with RLS enabled

### 3. Authentication System ✅
- **Login URL:** https://hvac-djawara.vercel.app/auth
- **Credentials:**
  - Admin: `admin@hvac-djawara.com` / `admin123`
  - Owner: `aris@hvac-djawara.com` / `aris123`
- **Features:**
  - Supabase Auth integration
  - Role-based access control
  - Active tenant switching

### 4. Dashboard Layout ✅
- **URL:** https://hvac-djawara.vercel.app/dashboard
- **Pages Available:**
  - `/dashboard` - Home
  - `/dashboard/orders` - Order list (basic implementation)
  - Other routes exist but UI incomplete

---

## 🗄️ DATABASE SCHEMA

### Core Tables (Working)

**tenants**
```sql
- id (UUID, PK)
- slug (hvac-djawara)
- name, contact_email, contact_phone
- subscription_status, subscription_plan
- is_active, created_at, updated_at
```

**profiles**
```sql
- id (UUID, FK to auth.users)
- full_name, avatar_url, phone
- active_tenant_id
- created_at, updated_at
```

**user_tenant_roles**
```sql
- id (UUID, PK)
- user_id (FK profiles)
- tenant_id (FK tenants)
- role (enum: owner, admin_finance, admin_logistic, tech_head, technician, helper, sales_partner, client)
- is_active
```

**clients**
```sql
- id (UUID, PK)
- tenant_id (FK tenants)
- name, phone, email, address
- is_active, created_at, updated_at
```

**service_orders** (from PHASE_1_WORKFLOW.sql)
```sql
- id (UUID, PK)
- tenant_id (FK tenants)
- client_id (FK clients)
- order_number (TEXT, UNIQUE, auto-generated)
- order_type (enum: installation, maintenance, repair, survey, troubleshooting, konsultasi, pengadaan)
- status (enum: pending, scheduled, in_progress, completed, cancelled)
- priority (enum: low, medium, high, urgent)
- service_title (TEXT)
- service_description (TEXT)
- location_address (TEXT)
- location_lat, location_lng
- requested_date, scheduled_date, scheduled_time
- estimated_duration
- assigned_to (FK profiles)
- notes, is_survey
- created_by (FK profiles)
- created_at, updated_at
```

### Important Functions

**get_active_tenant_id()** - Returns current user's active tenant  
**has_role(check_roles text[])** - Check if user has specific role  
**generate_order_number()** - Auto-generate SO-YYYYMM-XXXX

---

## 🔐 ENVIRONMENT VARIABLES

**Location:** Vercel Project Settings → Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://tukbuzdngodvcysncwke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key dari Supabase]
```

**Supabase Project ID:** tukbuzdngodvcysncwke  
**Supabase Dashboard:** https://supabase.com/dashboard/project/tukbuzdngodvcysncwke

---

## 🚀 DEPLOYMENT PROCESS

### GitHub Repos
- **Main:** https://github.com/Soedirboy58/hvac-djawara.git
- **Mirror:** https://github.com/putra22-debug/hvac-djawara.git (auto-deploy to Vercel)

### Deploy Flow
```bash
# Commit dan push ke kedua repo
git add .
git commit -m "message"
git push origin main
git push putra22 main:main  # This triggers Vercel deploy
```

### Vercel Auto-Deploy
- Connected to `putra22-debug/hvac-djawara` repo
- Auto-deploy on push to `main` branch
- Build command: `npm run build`
- Takes ~2 minutes

---

## 📊 RLS POLICIES (IMPORTANT!)

### Current State: ✅ ENABLED & WORKING

**service_orders policies:**
```sql
-- Anonymous can INSERT for tenant hvac-djawara (public form)
anon_insert_service_orders_hvac - TO anon, authenticated

-- Authenticated users can view their tenant's orders
users_view_tenant_orders - TO authenticated

-- Staff can INSERT orders
users_insert_orders - TO authenticated (with role check)

-- Staff can UPDATE orders
users_update_orders - TO authenticated
```

**clients policies:**
```sql
-- Anonymous can SELECT/INSERT/UPDATE for tenant hvac-djawara
anon_select_clients_hvac
anon_insert_clients_hvac
anon_update_clients_hvac
```

**tenants policy:**
```sql
-- Anonymous can SELECT tenant hvac-djawara
anon_select_hvac_tenant
```

### Key Files
- `supabase/FIX_PUBLIC_FORM_NOW.sql` - Complete RLS setup
- `supabase/ENABLE_RLS_BACK.sql` - Re-enable after testing
- `supabase/QUICK_FIX_DISABLE_RLS.sql` - Emergency disable (use only for testing)

---

## 🐛 KNOWN ISSUES & SOLUTIONS

### Issue 1: Form Error "violates row-level security policy"
**Cause:** RLS policies not set for anonymous users  
**Solution:** Run `FIX_PUBLIC_FORM_NOW.sql` in Supabase SQL Editor

### Issue 2: Form Error "invalid input value for enum order_type"
**Cause:** Form sending wrong enum values  
**Solution:** Map form values correctly:
- `instalasi` → `installation`
- `perbaikan` → `repair`
- `maintenance` → `maintenance`
- `konsultasi` → `konsultasi`

### Issue 3: Form Error "record has no field updated_by"
**Cause:** Trigger expecting field that doesn't exist  
**Solution:** Drop problematic triggers:
```sql
DROP TRIGGER IF EXISTS set_updated_at ON public.service_orders;
DROP TRIGGER IF EXISTS track_status_change_trigger ON public.service_orders;
```
Keep only: `auto_generate_order_number` trigger

### Issue 4: Dashboard shows no data
**Cause:** User not assigned to tenant or wrong active_tenant_id  
**Solution:** 
```sql
-- Check user roles
SELECT * FROM user_tenant_roles WHERE user_id = 'user-uuid';

-- Set active tenant
UPDATE profiles SET active_tenant_id = 'tenant-uuid' WHERE id = 'user-uuid';
```

---

## 📁 KEY FILE LOCATIONS

### Frontend
```
app/
├── page.tsx                    # Landing page
├── auth/page.tsx              # Login page
├── dashboard/
│   ├── layout.tsx             # Dashboard layout
│   ├── page.tsx               # Dashboard home
│   └── orders/page.tsx        # Orders list (basic)
├── api/
│   └── service-requests/      # Public form API
│       └── route.ts
components/
├── RequestServiceForm.tsx     # Public form component
├── RequestServiceModal.tsx    # Form modal wrapper
└── orders-list.tsx           # Orders list component
```

### Backend/Database
```
supabase/
├── DEPLOY_MASTER.sql          # Initial schema
├── PHASE_1_WORKFLOW.sql       # Service orders schema
├── FIX_PUBLIC_FORM_NOW.sql    # ⭐ RLS policies (IMPORTANT)
├── ENABLE_RLS_BACK.sql        # Re-enable RLS
├── CHECK_POLICIES.sql         # Debug policies
└── migrations/
    ├── 01_core/               # Core tables
    ├── 02_clients_table.sql   # Clients table
    └── 20251214_anon_public_intake.sql  # Anonymous intake
```

### Configuration
```
- next.config.js               # Next.js config
- tsconfig.json               # TypeScript config
- tailwind.config.ts          # Tailwind config
- middleware.ts               # Auth middleware
```

---

## 🎯 PRIORITY 1: ORDER MANAGEMENT UI

### What to Build Next

**1. Orders List Page Enhancement** (`/dashboard/orders`)
Current: Basic list with hardcoded data  
Needed:
- Fetch real orders from Supabase
- Display: order_number, client name, service type, status, date
- Filters: status, date range, technician
- Search by order number or client name
- Pagination

**2. Order Detail Page** (`/dashboard/orders/[id]`)
New page needed:
- Full order information
- Client details
- Service details
- Status timeline
- Assign technician dropdown
- Update status buttons
- Add notes
- View/edit scheduled date

**3. Create Order Form** (internal - staff use)
New page or modal:
- Select existing client or create new
- Service type dropdown
- Priority dropdown
- Location/address
- Schedule date & time
- Assign technician
- Notes

### Database Queries Needed

```typescript
// Fetch orders
const { data: orders } = await supabase
  .from('service_orders')
  .select(`
    *,
    client:clients(name, phone, email),
    assigned:profiles(full_name)
  `)
  .eq('tenant_id', activeTenantId)
  .order('created_at', { ascending: false });

// Fetch technicians for assignment
const { data: technicians } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('active_tenant_id', activeTenantId)
  .in('role', ['technician', 'tech_head', 'helper']);

// Update order status
const { error } = await supabase
  .from('service_orders')
  .update({ status: 'scheduled', assigned_to: technicianId })
  .eq('id', orderId);
```

### UI Components Needed

Use existing Shadcn components:
- `Table` - for orders list
- `Card` - for order details
- `Badge` - for status pills
- `Select` - for technician assignment
- `Calendar` - for date picker
- `Dialog` - for modals
- `Form` - for input validation

---

## 🔄 WORKFLOW FOR NEXT AGENT

### Step 1: Understand Current State
1. Read this document completely
2. Check live site: https://hvac-djawara.vercel.app
3. Login dashboard with admin credentials
4. Test public form submission
5. Check Supabase tables for data

### Step 2: Verify Environment
```bash
# Check git remotes
git remote -v

# Should see:
# origin: Soedirboy58/hvac-djawara
# putra22: putra22-debug/hvac-djawara

# Pull latest
git pull origin main
```

### Step 3: Start Development
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Open http://localhost:3000
```

### Step 4: Database Access
1. Open Supabase: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke
2. Go to SQL Editor
3. Can run queries, check data, modify schema

### Step 5: Deploy Changes
```bash
# After making changes
git add .
git commit -m "feat: implement order detail page"
git push origin main
git push putra22 main:main

# Wait ~2 minutes for Vercel deploy
# Check: https://hvac-djawara.vercel.app
```

---

## 📝 USEFUL SQL QUERIES

### Check New Orders
```sql
SELECT 
  so.order_number,
  so.service_title,
  so.status,
  c.name as client_name,
  c.phone,
  so.scheduled_date,
  so.created_at
FROM service_orders so
JOIN clients c ON c.id = so.client_id
WHERE so.tenant_id = (SELECT id FROM tenants WHERE slug = 'hvac-djawara')
  AND so.status = 'pending'
ORDER BY so.created_at DESC;
```

### Check Users & Roles
```sql
SELECT 
  p.full_name,
  au.email,
  utr.role,
  utr.is_active,
  t.name as tenant_name
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN user_tenant_roles utr ON utr.user_id = p.id
LEFT JOIN tenants t ON t.id = utr.tenant_id
WHERE t.slug = 'hvac-djawara';
```

### Check RLS Policies
```sql
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('service_orders', 'clients', 'tenants')
ORDER BY tablename, policyname;
```

### Check Triggers
```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid::regclass::text LIKE '%service_orders%'
  AND tgisinternal = false;
```

---

## 🚨 EMERGENCY PROCEDURES

### If Form Stops Working
1. Check Vercel deployment logs
2. Check browser console for errors
3. Check Supabase logs
4. Verify RLS policies still exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'service_orders';
   ```
5. If needed, temporarily disable RLS:
   ```sql
   ALTER TABLE service_orders DISABLE ROW LEVEL SECURITY;
   ```
6. Re-enable after fix with policies from `FIX_PUBLIC_FORM_NOW.sql`

### If Dashboard Won't Load
1. Check auth state - user logged in?
2. Check active_tenant_id set?
3. Check RLS policies for authenticated users
4. Check browser console for API errors

### If Deploy Fails
1. Check Vercel dashboard for build logs
2. Common issues:
   - TypeScript errors → fix type issues
   - Missing dependencies → `npm install`
   - Build timeout → simplify build, remove unused code
3. Test locally first: `npm run build`

---

## 📚 REFERENCE LINKS

**Documentation:**
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Shadcn UI: https://ui.shadcn.com
- Tailwind: https://tailwindcss.com/docs

**Project Resources:**
- Live Site: https://hvac-djawara.vercel.app
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke
- GitHub Main: https://github.com/Soedirboy58/hvac-djawara
- GitHub Deploy: https://github.com/putra22-debug/hvac-djawara

---

## ✨ SUCCESS CRITERIA FOR PRIORITY 1

**Orders List Page:**
- [ ] Fetch real data from Supabase
- [ ] Display all order fields correctly
- [ ] Status badges with colors
- [ ] Filter by status works
- [ ] Search functionality works
- [ ] Click row → goes to detail page

**Order Detail Page:**
- [ ] Shows complete order info
- [ ] Shows client info
- [ ] Can assign technician
- [ ] Can update status
- [ ] Can edit schedule
- [ ] Can add notes
- [ ] Changes save to database

**Create Order Form:**
- [ ] Select/create client
- [ ] Fill all required fields
- [ ] Assign technician (optional)
- [ ] Set schedule
- [ ] Submit creates order
- [ ] Shows in orders list

**Testing:**
- [ ] Test as admin user
- [ ] Test as owner (aris)
- [ ] Test RLS (can only see own tenant)
- [ ] Test on mobile viewport
- [ ] No console errors
- [ ] Deploy and test on production

---

## 🎓 LEARNING FROM THIS SESSION

### What Worked Well
1. **Iterative debugging** - Each error message gave clues
2. **SQL-first approach** - Fix database before frontend
3. **RLS testing** - Disable → Fix → Enable pattern
4. **Detailed logging** - Console.log helped identify issues

### What to Avoid
1. **Don't assume schema** - Always check actual table structure
2. **Don't skip RLS testing** - Test anonymous access separately
3. **Don't batch migrations** - Run one at a time, verify each
4. **Don't use wrong enum values** - Check database enums first

### Best Practices Moving Forward
1. **Always run migrations in Supabase SQL Editor** - Not via code
2. **Test public endpoints separately** - Use incognito/logged-out
3. **Check RLS policies after each migration**
4. **Keep triggers minimal** - Only essential ones
5. **Document every major change** - Future you will thank you

---

## 💬 HANDOFF MESSAGE

Dear Next AI Agent,

Saya sudah setup landing page, public form, authentication, dan basic dashboard. **Public form sudah bekerja sempurna** dengan RLS enabled untuk keamanan.

Database schema sudah solid menggunakan PHASE_1_WORKFLOW.sql. Semua core tables (tenants, profiles, user_tenant_roles, clients, service_orders) sudah ada dan bekerja.

**Your mission:** Implement order management UI (Priority 1) agar admin/staff bisa:
1. Lihat daftar orders yang masuk dari public form
2. Klik order untuk lihat detail
3. Assign teknisi ke order
4. Update status order (pending → scheduled → in_progress → completed)
5. Set/edit jadwal

Semua data sudah ada di database. Tinggal buat UI untuk CRUD operations.

**Important files to read first:**
- This document (you're reading it)
- `supabase/PHASE_1_WORKFLOW.sql` - untuk memahami schema
- `app/dashboard/orders/page.tsx` - starting point untuk order list
- `supabase/FIX_PUBLIC_FORM_NOW.sql` - reference untuk RLS policies

**Testing credentials:**
- Admin: admin@hvac-djawara.com / admin123
- Owner: aris@hvac-djawara.com / aris123

Good luck! The foundation is solid. Now let's build the management interface! 🚀

---

**Last Updated:** December 14, 2025  
**Agent Session ID:** Chat ending due to length  
**Next Agent:** Start fresh with this guide
