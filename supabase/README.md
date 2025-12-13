# Supabase Migrations Guide

> **Project**: Djawara HVAC Platform  
> **Database**: PostgreSQL via Supabase  
> **Last Updated**: 2025-12-01

---

## 📋 QUICK START

### Prerequisites
- Supabase project created: `tukbuzdngodvcysncwke`
- PostgreSQL access (via Supabase Dashboard or psql)
- `.env.local` configured with Supabase credentials

---

## 🚀 DEPLOYMENT

### Option A: Supabase Dashboard (Recommended for first time)

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql
   - Or: Supabase Dashboard → SQL Editor → New query

2. **Run Migrations in Order** (copy-paste file content):

   **Step 1: Shared Functions & Types**
   ```
   - 00_shared/functions/handle_updated_at.sql
   - 00_shared/functions/text_helpers.sql
   - 00_shared/types/enum_types.sql
   ```

   **Step 2: Core Tables**
   ```
   - 01_core/20251201000001_create_tenants.sql
   - 01_core/20251201000002_create_profiles.sql
   - 01_core/20251201000003_create_user_tenant_roles.sql
   ```

   **Step 3: Auth Helpers**
   ```
   - 00_shared/functions/auth_helpers.sql
   ```

   **Step 4: RLS Policies**
   ```
   - 01_core/20251201000004_apply_core_rls_policies.sql
   ```

3. **Verify**
   ```sql
   -- Check tables
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   
   -- Check RLS enabled
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
   
   -- Check policies count
   SELECT tablename, COUNT(*) as policies_count 
   FROM pg_policies 
   GROUP BY tablename;
   ```

4. **Seed Data (Optional)**
   ```
   - seed/01_core_seed.sql
   ```

---

### Option B: Supabase CLI (For local development)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Link Project**
   ```bash
   cd "c:\Users\user\Downloads\Platform\djawara hvac"
   supabase link --project-ref tukbuzdngodvcysncwke
   ```

3. **Push Migrations**
   ```bash
   # Push all migrations
   supabase db push
   
   # Or run specific file
   supabase db execute -f supabase/migrations/01_core/20251201000001_create_tenants.sql
   ```

4. **Verify**
   ```bash
   supabase db diff
   ```

---

### Option C: psql (Direct connection)

1. **Get Connection String**
   - Dashboard → Project Settings → Database
   - Copy connection string (replace [YOUR-PASSWORD])

2. **Run Migrations**
   ```bash
   # Set env
   $PGPASSWORD="your-password"
   
   # Run migrations in order
   psql "postgresql://postgres:$PGPASSWORD@db.tukbuzdngodvcysncwke.supabase.co:5432/postgres" -f supabase/migrations/00_shared/functions/handle_updated_at.sql
   
   # ... repeat for each file
   ```

---

## 📂 MIGRATION FILE STRUCTURE

```
supabase/
├── migrations/
│   ├── 00_shared/                    # Reusable (run first)
│   │   ├── functions/
│   │   │   ├── handle_updated_at.sql
│   │   │   ├── text_helpers.sql
│   │   │   └── auth_helpers.sql      # Run AFTER tables created
│   │   └── types/
│   │       └── enum_types.sql
│   │
│   ├── 01_core/                      # Core domain
│   │   ├── 20251201000001_create_tenants.sql
│   │   ├── 20251201000002_create_profiles.sql
│   │   ├── 20251201000003_create_user_tenant_roles.sql
│   │   └── 20251201000004_apply_core_rls_policies.sql
│   │
│   ├── 02_crm/                       # (Future)
│   ├── 03_service_ops/               # (Future)
│   └── ...
│
├── seed/
│   └── 01_core_seed.sql              # Sample data
│
└── MIGRATION-MAP.md                  # Dependency graph
```

---

## ⚠️ CRITICAL RULES

### 1. **Execution Order Matters**
- Always follow MIGRATION-MAP.md
- Shared functions BEFORE domain tables
- Auth helpers AFTER tables, BEFORE RLS policies
- Domain sequence: 01_core → 02_crm → 03_service_ops → ...

### 2. **Never Edit Existing Migration Files**
- If need to change: create NEW migration with ALTER
- Example: `20251215000001_alter_tenants_add_column.sql`

### 3. **Test in Development First**
- Run migrations in local/staging before production
- Verify with validation queries at end of each file

### 4. **Backup Before Major Changes**
```bash
# Backup via Supabase Dashboard
# Settings → Database → Backups

# Or via pg_dump
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql
```

---

## 🔍 TROUBLESHOOTING

### Error: "relation does not exist"
**Cause**: Running migrations out of order  
**Fix**: Check MIGRATION-MAP.md for dependencies

### Error: "function auth.get_active_tenant_id() does not exist"
**Cause**: Auth helpers not run yet  
**Fix**: Run `00_shared/functions/auth_helpers.sql`

### Error: "type user_role does not exist"
**Cause**: Enum types not created  
**Fix**: Run `00_shared/types/enum_types.sql` first

### RLS Policy Not Working
**Check**:
```sql
-- Is RLS enabled?
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';

-- Policies exist?
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Helper functions exist?
SELECT proname FROM pg_proc WHERE proname LIKE 'get_%' OR proname LIKE 'has_%';
```

---

## 📊 VERIFICATION CHECKLIST

After running all migrations, verify:

```sql
-- ✓ Tables created (should be 3 for core)
SELECT COUNT(*) as tables_count FROM pg_tables WHERE schemaname = 'public';

-- ✓ RLS enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows

-- ✓ Policies count (should be 13+ for core)
SELECT COUNT(*) as policies_count FROM pg_policies;

-- ✓ Functions count (should be 10+)
SELECT COUNT(*) as functions_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- ✓ Enum types (should be 3)
SELECT COUNT(*) as enum_count FROM pg_type WHERE typname IN ('user_role', 'subscription_status', 'subscription_plan');

-- ✓ Triggers
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname NOT LIKE 'pg_%' AND tgname NOT LIKE 'RI_%';
```

Expected results:
- Tables: 3 (tenants, profiles, user_tenant_roles)
- Policies: 13+
- Functions: 10+ (shared + auth helpers)
- Enum types: 3
- Triggers: 4+ (updated_at, auto_create_profile, etc.)

---

## 🔄 ROLLBACK (Emergency)

If migration fails and need to rollback:

```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS public.user_tenant_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS auth.get_active_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS auth.has_role(text[]) CASCADE;
-- ... (drop all functions)

-- Drop types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
```

**Better**: Use Supabase backups for production rollback.

---

## 📝 NEXT STEPS

After core migrations successful:

1. **Create first tenant & user** via Supabase Dashboard
2. **Test RLS** by querying as different users
3. **Run seed data** (optional, for dev only)
4. **Create CRM migrations** (next domain)
5. **Update OVERVIEW-TEKNIS.md** with progress

---

## 🆘 SUPPORT

**Issues?**
- Check MIGRATION-MAP.md for dependencies
- Review PANDUAN-AWAL.md for architecture context
- Check Supabase logs: Dashboard → Database → Logs

**Questions?**
- Tag in GitHub Issues
- Update OVERVIEW-TEKNIS.md with blockers

---

**Last Updated**: 2025-12-01  
**Status**: Core migrations ready ✓  
**Next**: CRM domain migrations
