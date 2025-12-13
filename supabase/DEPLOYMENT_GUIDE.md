# 🚀 DEPLOYMENT GUIDE - Database Migration

> **Last Updated**: 2025-12-01  
> **Status**: Ready to Deploy  
> **Estimated Time**: 5-10 minutes

---

## 📋 URUTAN DEPLOYMENT (CRITICAL!)

### ✅ OPTION A: ONE-CLICK DEPLOYMENT (RECOMMENDED)

**File**: `DEPLOY_MASTER.sql` (sudah digabung semua, urutan sudah benar)

**Steps**:
1. Buka: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql/new
2. Copy **SELURUH ISI** file `DEPLOY_MASTER.sql`
3. Paste ke SQL Editor
4. Klik **RUN** (tombol hijau di kanan bawah)
5. Tunggu sampai selesai (~30 detik)
6. Cek output - harus ada message: **"🎉 DEPLOYMENT SUCCESSFUL!"**

**Keuntungan**:
- ✅ Urutan dijamin benar
- ✅ Satu kali eksekusi
- ✅ Auto-validasi di akhir
- ✅ Rollback otomatis jika error

---

### ⚙️ OPTION B: MANUAL STEP-BY-STEP (Advanced)

Jika ingin kontrol lebih detail, jalankan file terpisah dengan **URUTAN INI**:

#### **PHASE 1: Shared Functions & Types (Foundation)**
```sql
-- 1.1 Enum Types (WAJIB PERTAMA)
supabase/migrations/00_shared/types/enum_types.sql

-- 1.2 Updated At Function
supabase/migrations/00_shared/functions/handle_updated_at.sql

-- 1.3 Text Helpers
supabase/migrations/00_shared/functions/text_helpers.sql
```

#### **PHASE 2: Core Tables**
```sql
-- 2.1 Tenants (ROOT TABLE - tidak punya FK)
supabase/migrations/01_core/20251201000001_create_tenants.sql

-- 2.2 Profiles (depends on: tenants)
supabase/migrations/01_core/20251201000002_create_profiles.sql

-- 2.3 User Tenant Roles (depends on: profiles, tenants)
supabase/migrations/01_core/20251201000003_create_user_tenant_roles.sql
```

#### **PHASE 3: Auth Helpers** 
⚠️ **CRITICAL**: Harus SETELAH tabel dibuat, SEBELUM RLS policies!

```sql
-- 3.1 Auth Helpers (depends on: profiles, user_tenant_roles)
supabase/migrations/00_shared/functions/auth_helpers.sql
```

#### **PHASE 4: RLS Policies**
```sql
-- 4.1 Core RLS (depends on: ALL tables + auth_helpers)
supabase/migrations/01_core/20251201000004_apply_core_rls_policies.sql
```

---

## 🔍 VERIFIKASI SETELAH DEPLOYMENT

### 1. Cek Tables Created
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected Output** (minimal 3 tables):
- `profiles`
- `tenants`
- `user_tenant_roles`

---

### 2. Cek Functions Created
```sql
SELECT proname, pronargs 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
```

**Expected Output** (minimal 10 functions):
- `clean_phone` (1 arg)
- `create_profile_for_new_user` (0 args)
- `generate_code` (2 args)
- `generate_tenant_slug` (0 args)
- `get_active_tenant_id` (0 args)
- `get_user_branch_id` (0 args)
- `get_user_role` (0 args)
- `handle_updated_at` (0 args)
- `has_role` (1 arg)
- `is_admin` (0 args)
- `is_owner` (0 args)
- `set_first_active_tenant` (0 args)
- `slugify` (1 arg)

---

### 3. Cek RLS Policies Applied
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
ORDER BY tablename, policyname;
```

**Expected Output** (minimal 13 policies):

**tenants** (3 policies):
- `owners_update_own_tenant` (UPDATE)
- `system_insert_tenants` (INSERT)
- `users_view_accessible_tenants` (SELECT)

**profiles** (4 policies):
- `owners_view_tenant_profiles` (SELECT)
- `system_insert_profiles` (INSERT)
- `users_update_own_profile` (UPDATE)
- `users_view_own_profile` (SELECT)

**user_tenant_roles** (6 policies):
- `owners_delete_tenant_roles` (DELETE)
- `owners_insert_tenant_roles` (INSERT)
- `owners_update_tenant_roles` (UPDATE)
- `owners_view_tenant_roles` (SELECT)
- `system_insert_initial_owner` (INSERT)
- `users_view_own_roles` (SELECT)

---

### 4. Cek RLS Enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected**: Semua tabel `rowsecurity = true`

---

## 🎯 NEXT STEP SETELAH DEPLOYMENT

### 1. **Run Seed Data** (Create Test Tenants)
File: `supabase/seed/01_core_seed.sql`

Buka SQL Editor, paste isi file, klik RUN.

**Output**: 2 tenant dibuat:
- **AC Jaya** (owner: owner@acjaya.com)
- **HVAC Pro** (owner: owner@hvacpro.com)

---

### 2. **Test Authentication**

#### A. Register User Baru via Supabase Dashboard
1. Buka: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/auth/users
2. Klik **"Add user"** → **"Create new user"**
3. Isi email & password
4. Klik **"Create user"**

#### B. Verifikasi Auto-Create Profile
```sql
-- Cek apakah profile otomatis dibuat
SELECT id, full_name, active_tenant_id, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: User baru muncul di `profiles` dengan `full_name = email`

---

### 3. **Test RLS Policies**

#### A. Assign Role ke User
```sql
-- Insert role assignment (ganti user_id & tenant_id)
INSERT INTO user_tenant_roles (user_id, tenant_id, role, is_active)
VALUES (
  'USER_ID_DARI_PROFILES',
  'TENANT_ID_DARI_TENANTS', 
  'owner',
  true
);
```

#### B. Test Query as User
```sql
-- Set user context (simulasi login)
SET request.jwt.claims.sub = 'USER_ID_DISINI';

-- Coba query tenants (should only see tenants where user has role)
SELECT id, name, slug FROM tenants;
```

---

### 4. **Initialize Next.js Project**

Sekarang database sudah ready, lanjut ke frontend:

```bash
cd "c:\Users\user\Downloads\Platform\djawara hvac"

# Create Next.js project
npx create-next-app@latest . --typescript --tailwind --app --import-alias "@/*"

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @tanstack/react-query zustand
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react date-fns zod react-hook-form @hookform/resolvers
```

---

## 🚨 TROUBLESHOOTING

### Error: "relation does not exist"
**Cause**: Urutan eksekusi salah (misalnya RLS policies dijalankan sebelum tables dibuat)

**Fix**: 
1. Drop semua tables: `DROP TABLE IF EXISTS user_tenant_roles, profiles, tenants CASCADE;`
2. Jalankan ulang dari awal dengan urutan yang benar

---

### Error: "function auth.get_active_tenant_id() does not exist"
**Cause**: Auth helpers belum dibuat tapi RLS policies sudah dijalankan

**Fix**:
1. Jalankan `00_shared/functions/auth_helpers.sql`
2. Jalankan ulang RLS policies file

---

### Error: "type user_role does not exist"
**Cause**: Enum types belum dibuat

**Fix**:
1. Jalankan `00_shared/types/enum_types.sql` PERTAMA
2. Jalankan ulang migration yang error

---

### RLS Policy Blocks Everything
**Symptom**: Query return empty padahal data ada (saat login)

**Debug**:
```sql
-- Check active tenant
SELECT auth.get_active_tenant_id();

-- Check user roles
SELECT * FROM user_tenant_roles WHERE user_id = auth.uid();

-- Temporary disable RLS (DEVELOPMENT ONLY!)
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
```

**Fix**: Pastikan user punya role assignment yang aktif di tenant

---

## 📊 MONITORING

### Database Size
```sql
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as db_size;
```

### Table Sizes
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Active Connections
```sql
SELECT count(*) as active_connections
FROM pg_stat_activity 
WHERE datname = current_database();
```

---

## ✅ CHECKLIST DEPLOYMENT

- [ ] **Phase 1**: Enum types created (3 types)
- [ ] **Phase 2**: Shared functions created (4 functions)
- [ ] **Phase 3**: Core tables created (3 tables)
- [ ] **Phase 4**: Auth helpers created (6 functions)
- [ ] **Phase 5**: RLS policies applied (13+ policies)
- [ ] **Verification**: All tables have RLS enabled
- [ ] **Verification**: All foreign keys working
- [ ] **Verification**: Triggers working (updated_at, auto-create profile)
- [ ] **Test**: Seed data inserted successfully
- [ ] **Test**: User registration creates profile
- [ ] **Test**: RLS policies block unauthorized access
- [ ] **Next**: Next.js project initialized

---

**Status Saat Ini**: ✅ Migration files ready, waiting for deployment

**Next Action**: Deploy `DEPLOY_MASTER.sql` ke Supabase Dashboard
