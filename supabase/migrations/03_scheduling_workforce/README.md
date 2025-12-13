# Scheduling & Workforce Management System - Database Migrations

## 📋 Overview

This directory contains database migrations for implementing a comprehensive scheduling and workforce management system for the HVAC Djawara platform.

## 🎯 Features Implemented

### Core Features
- **Multi-tenant architecture** - All features are tenant-scoped with RLS policies
- **Extended order types** - Added consultation (`konsultasi`) and procurement (`pengadaan`)
- **Sales tracking** - Track sales/marketing referrals on service orders
- **Daily attendance system** - Smart clock in/out with automatic calculations
- **Approval-based overtime** - Complete workflow from request to payment
- **Technician availability** - Prevent overbooking (max 4 jobs/day)
- **Order status history** - Audit trail for all status changes
- **Working hours config** - Per-tenant configuration with overtime rates

### Key Capabilities
- ✅ Automatic work hour calculation (09:00-17:00 standard)
- ✅ Late detection and early leave tracking
- ✅ Auto clock-out for forgot technicians (via cron)
- ✅ Overtime request approval workflow
- ✅ Automatic overtime cost calculation (Rp 5,000/hour)
- ✅ Billable hours calculation with review flagging
- ✅ Comprehensive reporting views

## 📁 Migration Files

Execute in this exact order:

### 1. `20251213_001_extend_order_types.sql`
**Purpose:** Add new order types to existing enum
- Adds `konsultasi` (consultation)
- Adds `pengadaan` (procurement)
- Updates enum documentation

### 2. `20251213_002_extend_service_orders.sql`
**Purpose:** Extend service_orders table for tracking
- Adds `sales_id` column (FK to profiles)
- Adds `actual_start_time` column (job start tracking)
- Adds `actual_end_time` column (job end tracking)
- Creates 4 new indexes
- Removes old overtime columns (if exist)

### 3. `20251213_003_create_attendance_tables.sql`
**Purpose:** Create core attendance and support tables
- `daily_attendance` - Daily attendance with smart clock rules
- `technician_availability` - Track availability and job limits
- `order_status_history` - Audit trail for status changes
- `working_hours_config` - Per-tenant working hours and rates

### 4. `20251213_004_create_overtime_table.sql`
**Purpose:** Create overtime request system
- `overtime_requests` table with full workflow
- `overtime_status` enum (pending → approved → completed)
- Smart billable hours calculation
- Automatic review flagging

### 5. `20251213_005_create_functions_triggers.sql`
**Purpose:** Create automation functions and triggers
- `calculate_work_hours()` - Auto-calculate attendance hours
- `calculate_overtime_hours()` - Auto-calculate overtime costs
- `track_status_change()` - Auto-track order status changes
- `auto_clock_out_forgot_technicians()` - Cron job function

### 6. `20251213_006_create_rls_policies.sql`
**Purpose:** Apply Row Level Security policies
- 19+ RLS policies across all tables
- Technicians can manage own records
- Admins can view/manage all
- Order history is read-only (trigger only)

### 7. `20251213_007_create_views.sql`
**Purpose:** Create reporting views
- `v_daily_attendance_summary` - Daily attendance with status
- `v_overtime_summary` - Monthly overtime per technician
- `v_technician_daily_summary` - Combined daily view

### 8. `20251213_008_seed_tenant_data.sql`
**Purpose:** Seed initial tenant and config
- Creates HVAC Djawara tenant
- Creates default working hours config
- Displays setup information

## 🚀 How to Execute Migrations

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
   - Or navigate: Dashboard → SQL Editor → New Query

2. **Execute migrations in order:**
   ```
   For each migration file (001 through 008):
   1. Open the file in your text editor
   2. Copy the entire contents
   3. Paste into Supabase SQL Editor
   4. Click "RUN" button
   5. Check output for success messages (✓)
   6. Verify no errors before proceeding to next file
   ```

3. **Monitor execution:**
   - Look for success messages with ✅ checkmarks
   - Check validation messages at end of each migration
   - Note any warnings or errors

### Option B: Supabase CLI

```bash
# If using Supabase CLI
cd supabase/migrations/03_scheduling_workforce

# Apply migrations in order
supabase db push --file 20251213_001_extend_order_types.sql
supabase db push --file 20251213_002_extend_service_orders.sql
supabase db push --file 20251213_003_create_attendance_tables.sql
supabase db push --file 20251213_004_create_overtime_table.sql
supabase db push --file 20251213_005_create_functions_triggers.sql
supabase db push --file 20251213_006_create_rls_policies.sql
supabase db push --file 20251213_007_create_views.sql
supabase db push --file 20251213_008_seed_tenant_data.sql
```

### Option C: Combined Script

If you prefer to run all at once, concatenate the files:

```bash
cat 20251213_001_extend_order_types.sql \
    20251213_002_extend_service_orders.sql \
    20251213_003_create_attendance_tables.sql \
    20251213_004_create_overtime_table.sql \
    20251213_005_create_functions_triggers.sql \
    20251213_006_create_rls_policies.sql \
    20251213_007_create_views.sql \
    20251213_008_seed_tenant_data.sql \
    > combined_migration.sql
```

Then run the combined file in Supabase SQL Editor.

## ✅ Verification Checklist

After running all migrations, verify:

### Tables Created
```sql
-- Should return 5 new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'daily_attendance',
  'technician_availability',
  'order_status_history',
  'working_hours_config',
  'overtime_requests'
);
```

### Service Orders Extended
```sql
-- Should show new columns: sales_id, actual_start_time, actual_end_time
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
AND column_name IN ('sales_id', 'actual_start_time', 'actual_end_time');
```

### Enums Updated
```sql
-- Should show 7 values including konsultasi and pengadaan
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
ORDER BY enumsortorder;
```

### Functions Created
```sql
-- Should return 4 functions
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'calculate_work_hours',
  'calculate_overtime_hours',
  'track_status_change',
  'auto_clock_out_forgot_technicians'
);
```

### Views Created
```sql
-- Should return 3 views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'v_%';
```

### RLS Enabled
```sql
-- Should return 5 tables with RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'daily_attendance',
  'technician_availability',
  'order_status_history',
  'working_hours_config',
  'overtime_requests'
);
```

### Tenant Seeded
```sql
-- Should return HVAC Djawara tenant
SELECT slug, name, contact_email, subscription_status, subscription_plan
FROM tenants
WHERE slug = 'hvac-djawara';
```

### Working Hours Config
```sql
-- Should return config for HVAC Djawara
SELECT t.slug, wc.work_start_time, wc.work_end_time, 
       wc.overtime_rate_per_hour, wc.max_overtime_hours_per_day
FROM working_hours_config wc
JOIN tenants t ON wc.tenant_id = t.id
WHERE t.slug = 'hvac-djawara' AND wc.is_active = true;
```

## 🔄 Rollback Instructions

If you need to rollback the migrations:

1. **Backup your database first!**
2. Open `ROLLBACK.sql` in this directory
3. Review the script carefully
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click "RUN"
7. Verify rollback completed successfully

**Warning:** Rollback will DELETE all data in the new tables!

## 📊 Database Schema Summary

### New Tables (5)
1. **daily_attendance** - Clock in/out with smart calculations
2. **technician_availability** - Job limits and availability tracking
3. **order_status_history** - Audit trail (trigger-only)
4. **working_hours_config** - Per-tenant configuration
5. **overtime_requests** - Overtime workflow with approvals

### Extended Tables (1)
1. **service_orders** - Added sales_id, actual_start_time, actual_end_time

### New Enums (1)
1. **overtime_status** - Workflow status for overtime

### Extended Enums (1)
1. **order_type** - Added konsultasi, pengadaan

### New Functions (4)
1. **calculate_work_hours()** - Attendance calculation
2. **calculate_overtime_hours()** - Overtime calculation
3. **track_status_change()** - Status change tracking
4. **auto_clock_out_forgot_technicians()** - Auto clock-out cron

### New Triggers (3)
1. **calculate_work_hours_trigger** - On daily_attendance
2. **calculate_overtime_hours_trigger** - On overtime_requests
3. **track_status_change_trigger** - On service_orders

### New Views (3)
1. **v_daily_attendance_summary** - Attendance reporting
2. **v_overtime_summary** - Overtime reporting
3. **v_technician_daily_summary** - Combined daily view

### RLS Policies (19+)
- Complete RLS coverage for all new tables
- Role-based access control
- Tenant isolation

## 🔧 Configuration

### Working Hours
- **Standard Start:** 09:00
- **Standard End:** 17:00
- **Overtime Rate:** Rp 5,000/hour
- **Max Overtime:** 4 hours/day
- **Max Jobs per Tech:** 4 jobs/day

### Business Rules

**Attendance:**
- Clock in ≤ 09:00 → Work starts at 09:00
- Clock in > 09:00 → Work starts at actual (late)
- No clock out by EOD → Auto set to 17:00
- Clock out < 17:00 → Early leave flag

**Overtime:**
- Must request and get approval before working
- Actual ≤ Estimated → Bill actual hours
- Actual > Estimated → Bill estimated, flag for review
- Overtime rate frozen at request time

**Availability:**
- Max 4 jobs per technician per day
- Can mark unavailable with reason
- Admins can override limits

## 🧪 Testing Recommendations

### Test Attendance System
```sql
-- Create test attendance record
INSERT INTO daily_attendance (tenant_id, user_id, attendance_date, clock_in_time)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  (SELECT id FROM profiles LIMIT 1),
  CURRENT_DATE,
  NOW()
);

-- Check calculated fields
SELECT * FROM v_daily_attendance_summary WHERE attendance_date = CURRENT_DATE;
```

### Test Overtime System
```sql
-- Create test overtime request
INSERT INTO overtime_requests (
  tenant_id, user_id, reason,
  estimated_start_time, estimated_end_time
)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  (SELECT id FROM profiles LIMIT 1),
  'Emergency repair completion',
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours'
);

-- Check calculated fields
SELECT * FROM overtime_requests ORDER BY created_at DESC LIMIT 1;
```

### Test Status Tracking
```sql
-- Update order status
UPDATE service_orders 
SET status = 'in_progress'
WHERE id = 'some-order-id';

-- Check history was created
SELECT * FROM order_status_history 
WHERE service_order_id = 'some-order-id'
ORDER BY changed_at DESC;
```

## 🆘 Troubleshooting

### Issue: Migration fails with "type already exists"
**Solution:** The migration uses `IF NOT EXISTS` checks. If you see this, it's likely safe to ignore or the migration was partially run before. Check the specific error.

### Issue: "Permission denied" errors
**Solution:** Ensure you're running migrations as a superuser or database owner. RLS policies may be blocking operations.

### Issue: Foreign key constraint violations
**Solution:** Ensure dependent tables exist first. Follow migration order strictly.

### Issue: Enum value already exists
**Solution:** This is expected if migrations are re-run. The script handles this gracefully.

## 📞 Support

For issues or questions:
1. Check the error messages in migration output
2. Review the validation sections in each migration
3. Consult the main project documentation
4. Contact the development team

## 📄 License

Part of HVAC Djawara platform. See main project LICENSE file.

---

**Version:** 1.0.0  
**Date:** 2025-12-13  
**Author:** System Architect
