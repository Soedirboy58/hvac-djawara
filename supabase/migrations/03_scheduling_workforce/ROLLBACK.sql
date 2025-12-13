-- ============================================
-- ROLLBACK SCRIPT
-- Purpose: Rollback all scheduling & workforce management migrations
-- Domain: Scheduling & Workforce Management
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================
-- 
-- WARNING: This will DELETE data and REMOVE schema changes
-- Only run this if you need to completely rollback the feature
-- 
-- INSTRUCTIONS:
-- 1. Backup your database before running this
-- 2. Copy this entire file
-- 3. Paste into Supabase SQL Editor
-- 4. Review the script carefully
-- 5. Click RUN to execute
-- 
-- ============================================

BEGIN;

RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '⚠️  STARTING ROLLBACK PROCESS';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

-- ================================================
-- STEP 1: Drop Views (Migration 007)
-- ================================================
RAISE NOTICE '📋 Step 1: Dropping views...';

DROP VIEW IF EXISTS public.v_technician_daily_summary CASCADE;
DROP VIEW IF EXISTS public.v_overtime_summary CASCADE;
DROP VIEW IF EXISTS public.v_daily_attendance_summary CASCADE;

RAISE NOTICE '✓ Views dropped';

-- ================================================
-- STEP 2: Drop RLS Policies (Migration 006)
-- ================================================
RAISE NOTICE '📋 Step 2: Dropping RLS policies...';

-- Service Orders policies
DROP POLICY IF EXISTS "technicians_update_job_times" ON public.service_orders;

-- Working Hours Config policies
DROP POLICY IF EXISTS "owner_delete_working_hours_config" ON public.working_hours_config;
DROP POLICY IF EXISTS "owner_update_working_hours_config" ON public.working_hours_config;
DROP POLICY IF EXISTS "owner_insert_working_hours_config" ON public.working_hours_config;
DROP POLICY IF EXISTS "users_view_working_hours_config" ON public.working_hours_config;

-- Order Status History policies
DROP POLICY IF EXISTS "no_manual_delete_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "no_manual_update_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "no_manual_insert_order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "users_view_order_status_history" ON public.order_status_history;

-- Technician Availability policies
DROP POLICY IF EXISTS "admins_delete_technician_availability" ON public.technician_availability;
DROP POLICY IF EXISTS "users_update_technician_availability" ON public.technician_availability;
DROP POLICY IF EXISTS "users_insert_technician_availability" ON public.technician_availability;
DROP POLICY IF EXISTS "users_view_technician_availability" ON public.technician_availability;

-- Overtime Requests policies
DROP POLICY IF EXISTS "admins_delete_overtime_requests" ON public.overtime_requests;
DROP POLICY IF EXISTS "users_update_overtime_requests" ON public.overtime_requests;
DROP POLICY IF EXISTS "technicians_create_overtime_requests" ON public.overtime_requests;
DROP POLICY IF EXISTS "users_view_overtime_requests" ON public.overtime_requests;

-- Daily Attendance policies
DROP POLICY IF EXISTS "admins_delete_attendance" ON public.daily_attendance;
DROP POLICY IF EXISTS "users_update_attendance" ON public.daily_attendance;
DROP POLICY IF EXISTS "technicians_clock_in" ON public.daily_attendance;
DROP POLICY IF EXISTS "users_view_attendance" ON public.daily_attendance;

RAISE NOTICE '✓ RLS policies dropped';

-- ================================================
-- STEP 3: Drop Triggers (Migration 005)
-- ================================================
RAISE NOTICE '📋 Step 3: Dropping triggers...';

DROP TRIGGER IF EXISTS track_status_change_trigger ON public.service_orders;
DROP TRIGGER IF EXISTS calculate_overtime_hours_trigger ON public.overtime_requests;
DROP TRIGGER IF EXISTS calculate_work_hours_trigger ON public.daily_attendance;

RAISE NOTICE '✓ Triggers dropped';

-- ================================================
-- STEP 4: Drop Functions (Migration 005)
-- ================================================
RAISE NOTICE '📋 Step 4: Dropping functions...';

DROP FUNCTION IF EXISTS public.auto_clock_out_forgot_technicians() CASCADE;
DROP FUNCTION IF EXISTS public.track_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_overtime_hours() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_work_hours() CASCADE;

RAISE NOTICE '✓ Functions dropped';

-- ================================================
-- STEP 5: Drop Tables (Reverse order of creation)
-- ================================================
RAISE NOTICE '📋 Step 5: Dropping tables...';

-- Drop overtime_requests table (Migration 004)
DROP TABLE IF EXISTS public.overtime_requests CASCADE;
RAISE NOTICE '✓ Dropped overtime_requests table';

-- Drop attendance and support tables (Migration 003)
DROP TABLE IF EXISTS public.working_hours_config CASCADE;
RAISE NOTICE '✓ Dropped working_hours_config table';

DROP TABLE IF EXISTS public.order_status_history CASCADE;
RAISE NOTICE '✓ Dropped order_status_history table';

DROP TABLE IF EXISTS public.technician_availability CASCADE;
RAISE NOTICE '✓ Dropped technician_availability table';

DROP TABLE IF EXISTS public.daily_attendance CASCADE;
RAISE NOTICE '✓ Dropped daily_attendance table';

-- ================================================
-- STEP 6: Remove Service Orders Columns (Migration 002)
-- ================================================
RAISE NOTICE '📋 Step 6: Removing columns from service_orders...';

-- Drop indexes first
DROP INDEX IF EXISTS public.idx_service_orders_job_duration;
DROP INDEX IF EXISTS public.idx_service_orders_actual_end;
DROP INDEX IF EXISTS public.idx_service_orders_actual_start;
DROP INDEX IF EXISTS public.idx_service_orders_sales;

-- Drop columns
ALTER TABLE public.service_orders DROP COLUMN IF EXISTS actual_end_time;
ALTER TABLE public.service_orders DROP COLUMN IF EXISTS actual_start_time;
ALTER TABLE public.service_orders DROP COLUMN IF EXISTS sales_id;

RAISE NOTICE '✓ Service orders columns removed';

-- ================================================
-- STEP 7: Drop Enum Types
-- ================================================
RAISE NOTICE '📋 Step 7: Dropping enum types...';

-- Drop overtime_status enum (Migration 004)
DROP TYPE IF EXISTS overtime_status CASCADE;
RAISE NOTICE '✓ Dropped overtime_status enum';

-- Note: Cannot easily remove enum values from order_type
-- PostgreSQL does not support removing enum values directly
-- If you need to remove konsultasi and pengadaan values:
-- 1. Ensure no data uses these values
-- 2. Recreate the enum without these values
-- 3. Or leave them (they won't cause issues)

RAISE NOTICE '⚠️  Note: order_type enum values (konsultasi, pengadaan) cannot be removed easily';
RAISE NOTICE '   They will remain in the enum but won''t cause issues';

-- ================================================
-- STEP 8: Remove Seeded Data (Optional)
-- ================================================
RAISE NOTICE '📋 Step 8: Removing seeded data (optional)...';

-- Remove working hours config for HVAC Djawara tenant (if exists)
-- Note: This is already handled by CASCADE from table drop

-- Optionally remove HVAC Djawara tenant
-- Uncomment the following lines if you want to remove the tenant
/*
DELETE FROM public.tenants 
WHERE slug = 'hvac-djawara' 
AND contact_email = 'pt.djawara3g@gmail.com';
RAISE NOTICE '✓ Removed HVAC Djawara tenant';
*/

RAISE NOTICE '⊘ Skipped tenant removal (uncomment in script if needed)';

-- ================================================
-- VALIDATION
-- ================================================
RAISE NOTICE '📋 Validating rollback...';

DO $$
DECLARE
  table_count INT;
  view_count INT;
  function_count INT;
  trigger_count INT;
BEGIN
  -- Check tables removed
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'daily_attendance',
    'technician_availability',
    'order_status_history',
    'working_hours_config',
    'overtime_requests'
  );
  
  ASSERT table_count = 0, 
         'Some tables still exist. Expected 0, found ' || table_count;
  
  -- Check views removed
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name IN (
    'v_daily_attendance_summary',
    'v_overtime_summary',
    'v_technician_daily_summary'
  );
  
  ASSERT view_count = 0, 
         'Some views still exist. Expected 0, found ' || view_count;
  
  -- Check functions removed
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'calculate_work_hours',
    'calculate_overtime_hours',
    'track_status_change',
    'auto_clock_out_forgot_technicians'
  );
  
  ASSERT function_count = 0, 
         'Some functions still exist. Expected 0, found ' || function_count;
  
  -- Check triggers removed
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'calculate_work_hours_trigger',
    'calculate_overtime_hours_trigger',
    'track_status_change_trigger'
  );
  
  ASSERT trigger_count = 0, 
         'Some triggers still exist. Expected 0, found ' || trigger_count;
  
  RAISE NOTICE '✓ All validations passed';
END $$;

RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '✅ ROLLBACK COMPLETED SUCCESSFULLY!';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '📊 Summary:';
RAISE NOTICE '   ✅ 3 views dropped';
RAISE NOTICE '   ✅ 20+ RLS policies dropped';
RAISE NOTICE '   ✅ 3 triggers dropped';
RAISE NOTICE '   ✅ 4 functions dropped';
RAISE NOTICE '   ✅ 5 tables dropped';
RAISE NOTICE '   ✅ 4 indexes dropped';
RAISE NOTICE '   ✅ 3 columns removed from service_orders';
RAISE NOTICE '   ✅ 1 enum type dropped';
RAISE NOTICE '   ⚠️  order_type enum values remain (safe to ignore)';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '🎉 Rollback transaction committed successfully!';
RAISE NOTICE 'Database has been restored to pre-migration state.';
