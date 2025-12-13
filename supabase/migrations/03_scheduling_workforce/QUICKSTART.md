# Quick Start Guide - 5 Minutes to Deploy

## 🚀 For the Impatient

This is the fastest way to deploy the scheduling & workforce management system. If you want details, see [README.md](README.md).

## ⚡ Prerequisites (30 seconds)

- [ ] Access to Supabase Dashboard
- [ ] Database backup completed
- [ ] Text editor open with migration files

## 📋 Deployment Steps (4 minutes)

### Step 1: Open Supabase SQL Editor (10 seconds)

1. Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new`
2. Or: Dashboard → SQL Editor → New Query

### Step 2: Run Migrations (3 minutes)

Copy and paste each file content into SQL editor and click RUN:

```
✅ 20251213_001_extend_order_types.sql       (15 sec)
✅ 20251213_002_extend_service_orders.sql    (20 sec)
✅ 20251213_003_create_attendance_tables.sql (30 sec)
✅ 20251213_004_create_overtime_table.sql    (20 sec)
✅ 20251213_005_create_functions_triggers.sql(25 sec)
✅ 20251213_006_create_rls_policies.sql      (30 sec)
✅ 20251213_007_create_views.sql             (20 sec)
✅ 20251213_008_seed_tenant_data.sql         (20 sec)
```

**Total time:** ~3 minutes

### Step 3: Verify Success (30 seconds)

Look for these success messages:

```
✅ MIGRATION 001: ORDER TYPES EXTENDED!
✅ MIGRATION 002: SERVICE ORDERS EXTENDED!
✅ MIGRATION 003: ATTENDANCE TABLES CREATED!
✅ MIGRATION 004: OVERTIME TABLE CREATED!
✅ MIGRATION 005: FUNCTIONS & TRIGGERS CREATED!
✅ MIGRATION 006: RLS POLICIES CREATED!
✅ MIGRATION 007: VIEWS CREATED!
✅ MIGRATION 008: TENANT DATA SEEDED!
```

### Step 4: Quick Validation (1 minute)

Run this query to verify everything:

```sql
-- Should return 5 tables
SELECT COUNT(*) as new_tables_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'daily_attendance',
  'technician_availability',
  'order_status_history',
  'working_hours_config',
  'overtime_requests'
);
-- Expected: 5

-- Should return HVAC Djawara tenant
SELECT slug, name FROM tenants WHERE slug = 'hvac-djawara';
-- Expected: 1 row

-- Should return 4 functions
SELECT COUNT(*) as new_functions_count
FROM pg_proc
WHERE proname LIKE '%calculate%' OR proname LIKE '%track%' OR proname LIKE '%auto_clock%';
-- Expected: 4

-- Should return 3 views
SELECT COUNT(*) as new_views_count
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE 'v_%';
-- Expected: 3
```

If all counts match expected values: **✅ DEPLOYMENT SUCCESSFUL!**

## 🎉 You're Done!

Your scheduling & workforce management system is now live with:

- ✅ Daily attendance tracking
- ✅ Overtime request workflow
- ✅ Technician availability management
- ✅ Order status history
- ✅ Automated calculations
- ✅ Complete security (RLS)
- ✅ Reporting views

## 🔥 What You Can Do Now

### For Technicians
```sql
-- Clock in for the day
INSERT INTO daily_attendance (tenant_id, user_id, attendance_date, clock_in_time)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  auth.uid(),
  CURRENT_DATE,
  NOW()
);

-- Request overtime
INSERT INTO overtime_requests (
  tenant_id, user_id, reason,
  estimated_start_time, estimated_end_time
)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  auth.uid(),
  'Equipment installation overtime',
  NOW() + INTERVAL '8 hours',
  NOW() + INTERVAL '10 hours'
);
```

### For Admins
```sql
-- View today's attendance
SELECT * FROM v_daily_attendance_summary
WHERE attendance_date = CURRENT_DATE
ORDER BY technician_name;

-- View pending overtime requests
SELECT * FROM overtime_requests
WHERE status = 'pending'
ORDER BY request_date DESC;

-- Approve overtime request
UPDATE overtime_requests
SET status = 'approved', approved_by = auth.uid(), approved_at = NOW()
WHERE id = 'request-id-here';
```

### For Reports
```sql
-- Monthly overtime summary
SELECT * FROM v_overtime_summary
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY total_cost DESC;

-- Technician daily summary
SELECT * FROM v_technician_daily_summary
WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY work_date DESC, technician_name;
```

## 🆘 Something Went Wrong?

### Quick Fixes

**"Type already exists" error:**
- ✅ Safe to ignore - migrations handle this

**"Permission denied" error:**
- ❌ Not running as database owner
- Fix: Use superuser account

**"Foreign key violation" error:**
- ❌ Dependencies missing
- Fix: Run migrations in exact order (001-008)

**Migration stuck/hanging:**
- ❌ Large transaction
- Fix: Wait 30 seconds, should complete

### Need Help?

1. Check full error message in SQL editor output
2. Review [README.md](README.md) for detailed instructions
3. Review [TESTING_GUIDE.md](TESTING_GUIDE.md) for specific tests
4. Run rollback if needed: [ROLLBACK.sql](ROLLBACK.sql)

## 🔄 Rollback (If Needed)

If something goes wrong and you need to undo everything:

1. Open `ROLLBACK.sql`
2. Copy entire content
3. Paste into SQL editor
4. Click RUN
5. Wait for completion (30 seconds)

This will safely remove all new schema changes while preserving existing data.

## 📚 Learn More

- **Complete documentation:** [README.md](README.md)
- **Testing procedures:** [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Deployment summary:** [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)

## 💡 Pro Tips

1. **Run during off-peak hours** - Migrations are fast but lock tables briefly
2. **Test in development first** - Always validate in dev environment
3. **Keep backup handy** - Just in case (though migrations are safe)
4. **Read success messages** - They tell you exactly what happened
5. **Bookmark views** - Reporting views save you time

## 🎯 Key Configuration

Default settings you should know:

| Setting | Value | Can Change |
|---------|-------|------------|
| Work hours | 09:00 - 17:00 | ✅ Yes (per tenant) |
| Overtime rate | Rp 5,000/hour | ✅ Yes (per tenant) |
| Max jobs/day | 4 per technician | ✅ Yes (per tech) |
| Max overtime/day | 4 hours | ✅ Yes (per tenant) |

To change settings, update `working_hours_config` table.

## ✅ Success Checklist

After deployment, you should have:

- [x] 5 new tables visible in database
- [x] 3 new columns in service_orders table
- [x] 4 new functions working
- [x] 3 new views accessible
- [x] HVAC Djawara tenant created
- [x] All validations passing
- [x] No error messages

If all checked: **🎉 CONGRATULATIONS! You're ready to use the system!**

---

**Deployment Time:** ~5 minutes  
**Difficulty:** Easy  
**Risk:** Low (backward compatible, includes rollback)

**Version:** 1.0.0  
**Date:** 2025-12-13
