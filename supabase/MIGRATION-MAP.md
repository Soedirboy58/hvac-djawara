# Migration Dependency Map

> **Purpose**: Visual dependency graph untuk semua migrations  
> **Updated**: 2025-12-01  
> **Status**: Core Domain Complete

---

## 📊 DEPENDENCY GRAPH

```
LEGEND:
  [✓] = Completed
  [ ] = Pending
  → = Depends on
  ═══ = Domain boundary
```

---

## 00. SHARED (Foundation) ✓

```
[✓] 00_shared/functions/handle_updated_at.sql
    └─ No dependencies (base function)

[✓] 00_shared/functions/text_helpers.sql
    ├─ slugify()
    ├─ generate_code()
    └─ clean_phone()
    └─ No dependencies (pure functions)

[✓] 00_shared/types/enum_types.sql
    ├─ user_role
    ├─ subscription_status
    └─ subscription_plan
    └─ No dependencies (type definitions)

[✓] 00_shared/functions/auth_helpers.sql
    ├─ get_active_tenant_id() → depends on profiles table
    ├─ has_role() → depends on user_tenant_roles table
    ├─ is_owner() → depends on has_role()
    ├─ is_admin() → depends on has_role()
    ├─ get_user_branch_id() → depends on user_tenant_roles table
    └─ get_user_role() → depends on user_tenant_roles table
```

**Execution Order**: 
1. handle_updated_at.sql (used by all tables)
2. text_helpers.sql (used by tenants)
3. enum_types.sql (used by tenants, user_tenant_roles)
4. auth_helpers.sql (MUST run AFTER tables created, run separately)

---

## 01. CORE DOMAIN ✓

```
═══════════════════════════════════════════════════════════

[✓] 01_core/20251201000001_create_tenants.sql
    ├─ Depends on:
    │  ├─ enum_types (subscription_status, subscription_plan)
    │  ├─ handle_updated_at()
    │  └─ slugify()
    └─ Root table (no FK dependencies)

[✓] 01_core/20251201000002_create_profiles.sql
    ├─ Depends on:
    │  ├─ auth.users (Supabase native)
    │  ├─ tenants (FK: active_tenant_id)
    │  └─ handle_updated_at()
    └─ Creates trigger on auth.users

[✓] 01_core/20251201000003_create_user_tenant_roles.sql
    ├─ Depends on:
    │  ├─ profiles (FK: user_id)
    │  ├─ tenants (FK: tenant_id)
    │  ├─ enum_types (user_role)
    │  └─ handle_updated_at()
    └─ Creates trigger to update profiles.active_tenant_id

[✓] 01_core/20251201000004_apply_core_rls_policies.sql
    ├─ Depends on:
    │  ├─ tenants (table must exist)
    │  ├─ profiles (table must exist)
    │  ├─ user_tenant_roles (table must exist)
    │  └─ auth_helpers (functions must exist)
    └─ Applies security layer

═══════════════════════════════════════════════════════════
```

**Execution Order**: Sequential (001 → 002 → 003 → 004)

**Critical**: Run `auth_helpers.sql` AFTER 003 but BEFORE 004

---

## 02. CRM DOMAIN (Pending)

```
═══════════════════════════════════════════════════════════

[ ] 02_crm/20251202000001_create_clients.sql
    └─ Depends on: tenants, profiles (sales_partner_id)

[ ] 02_crm/20251202000002_create_client_assets.sql
    └─ Depends on: clients, tenants

[ ] 02_crm/20251202000003_create_maintenance_history.sql
    └─ Depends on: client_assets

[ ] 02_crm/20251202000004_apply_crm_rls_policies.sql
    └─ Depends on: All CRM tables + auth_helpers

═══════════════════════════════════════════════════════════
```

---

## 03. SERVICE OPERATIONS DOMAIN (Pending)

```
═══════════════════════════════════════════════════════════

[ ] 03_service_ops/20251203000001_create_service_orders.sql
    └─ Depends on: clients, client_assets, profiles

[ ] 03_service_ops/20251203000002_create_quotation_items.sql
    └─ Depends on: service_orders, products

[ ] 03_service_ops/20251203000003_create_service_jobs.sql
    └─ Depends on: service_orders

[ ] 03_service_ops/20251203000004_create_job_assignments.sql
    └─ Depends on: service_jobs, profiles

[ ] 03_service_ops/20251203000005_create_job_checklists.sql
    └─ Depends on: service_jobs

[ ] 03_service_ops/20251203000006_create_job_materials_used.sql
    └─ Depends on: service_jobs, products, warehouses

[ ] 03_service_ops/20251203000007_create_job_notes.sql
    └─ Depends on: service_jobs

[ ] 03_service_ops/20251203000008_apply_service_ops_rls_policies.sql
    └─ Depends on: All Service Ops tables + auth_helpers

═══════════════════════════════════════════════════════════
```

---

## COMPLETE EXECUTION SEQUENCE

### Phase 1: Foundation (Must run in order)
```bash
# Step 1: Shared functions & types
psql < 00_shared/functions/handle_updated_at.sql
psql < 00_shared/functions/text_helpers.sql
psql < 00_shared/types/enum_types.sql

# Step 2: Core tables
psql < 01_core/20251201000001_create_tenants.sql
psql < 01_core/20251201000002_create_profiles.sql
psql < 01_core/20251201000003_create_user_tenant_roles.sql

# Step 3: Auth helpers (AFTER tables exist)
psql < 00_shared/functions/auth_helpers.sql

# Step 4: RLS policies (AFTER auth helpers)
psql < 01_core/20251201000004_apply_core_rls_policies.sql
```

### Phase 2: CRM Domain (Sequential)
```bash
psql < 02_crm/20251202000001_create_clients.sql
psql < 02_crm/20251202000002_create_client_assets.sql
psql < 02_crm/20251202000003_create_maintenance_history.sql
psql < 02_crm/20251202000004_apply_crm_rls_policies.sql
```

### Phase 3: Service Operations (Sequential)
```bash
psql < 03_service_ops/202512030000*.sql
# (8 files in sequence)
```

---

## 🚨 CRITICAL RULES

### Rule 1: Shared Functions First
**Always** run shared functions before domain migrations:
- `handle_updated_at` → used by ALL tables
- `text_helpers` → used by tables with code generation
- `enum_types` → used by tables with enum columns

### Rule 2: Auth Helpers Timing
**MUST** run `auth_helpers.sql` **AFTER** these tables exist:
- profiles (for get_active_tenant_id)
- user_tenant_roles (for has_role)

But **BEFORE** any RLS policies file (policies use these functions)

### Rule 3: RLS Policies Last
Each domain's RLS policies file MUST be last in that domain:
- Depends on ALL tables in domain
- Depends on auth_helpers

### Rule 4: Cross-Domain Dependencies
If Table A in Domain X depends on Table B in Domain Y:
- Domain Y MUST be migrated first
- Document dependency clearly in migration header

Example:
```sql
-- Dependencies: clients (from CRM domain)
-- Ensure 02_crm is migrated before this file
```

---

## 🔍 VERIFICATION QUERIES

### Check Migration Status
```sql
-- List all tables
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all functions
SELECT proname, pronargs 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- List all policies
SELECT schemaname, tablename, policyname
FROM pg_policies
ORDER BY tablename, policyname;
```

### Check Dependencies
```sql
-- Foreign key dependencies
SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

---

## 📝 NOTES FOR AI AGENTS

### When Creating New Migration:
1. **Identify dependencies** (which tables/functions does it need?)
2. **Update this map** with new entry
3. **Document in migration header**
4. **Verify execution order** (won't break existing sequence)

### When Modifying Existing Table:
1. **Create NEW migration file** (don't edit existing)
2. **Use `ALTER TABLE`** instead of `CREATE TABLE`
3. **Update this map** if dependencies change

### When Encountering Error:
1. **Check this map** for correct execution order
2. **Verify dependencies** are already migrated
3. **Check for circular dependencies** (shouldn't exist)

---

**Last Updated**: 2025-12-01 by System Architect  
**Next Update**: After CRM domain migrations created
