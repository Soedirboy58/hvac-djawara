-- ============================================
-- Migration: Extend Service Orders Table
-- Purpose: Add sales tracking and job timing columns
-- Domain: Scheduling & Workforce Management
-- Dependencies: service_orders table, profiles table
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: ADD NEW COLUMNS
-- ================================================

-- Add sales_id column to track sales/marketing referral
ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS sales_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.service_orders.sales_id IS 
'Sales/marketing person who referred this client or order.
Used for commission tracking and sales performance.
References profiles table, can be NULL if no sales referral.';

-- Add actual_start_time for job tracking
ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;

COMMENT ON COLUMN public.service_orders.actual_start_time IS 
'Actual job start time when technician begins work on-site.
Used for job tracking and duration calculation.
Note: This is different from attendance clock-in time.';

-- Add actual_end_time for job tracking
ALTER TABLE public.service_orders
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;

COMMENT ON COLUMN public.service_orders.actual_end_time IS 
'Actual job end time when technician completes work on-site.
Used for job tracking and duration calculation.
Note: This is different from attendance clock-out time.';

RAISE NOTICE '✓ Added new columns to service_orders table';

-- ================================================
-- SECTION 2: REMOVE OLD COLUMNS (IF EXIST)
-- ================================================
-- These columns are being moved to separate overtime_requests table

DO $$
BEGIN
  -- Remove overtime_hours if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_orders'
    AND column_name = 'overtime_hours'
  ) THEN
    ALTER TABLE public.service_orders DROP COLUMN overtime_hours;
    RAISE NOTICE '✓ Removed overtime_hours column (moved to overtime_requests)';
  ELSE
    RAISE NOTICE '⊘ overtime_hours column does not exist (skip)';
  END IF;

  -- Remove is_overtime if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_orders'
    AND column_name = 'is_overtime'
  ) THEN
    ALTER TABLE public.service_orders DROP COLUMN is_overtime;
    RAISE NOTICE '✓ Removed is_overtime column (moved to overtime_requests)';
  ELSE
    RAISE NOTICE '⊘ is_overtime column does not exist (skip)';
  END IF;
END $$;

-- ================================================
-- SECTION 3: CREATE INDEXES
-- ================================================

-- Index for sales_id (for sales performance queries)
CREATE INDEX IF NOT EXISTS idx_service_orders_sales
ON public.service_orders(sales_id) 
WHERE sales_id IS NOT NULL;

-- Index for actual_start_time (for job tracking queries)
CREATE INDEX IF NOT EXISTS idx_service_orders_actual_start
ON public.service_orders(actual_start_time) 
WHERE actual_start_time IS NOT NULL;

-- Index for actual_end_time (for job completion queries)
CREATE INDEX IF NOT EXISTS idx_service_orders_actual_end
ON public.service_orders(actual_end_time) 
WHERE actual_end_time IS NOT NULL;

-- Composite index for job duration queries
CREATE INDEX IF NOT EXISTS idx_service_orders_job_duration
ON public.service_orders(actual_start_time, actual_end_time) 
WHERE actual_start_time IS NOT NULL AND actual_end_time IS NOT NULL;

RAISE NOTICE '✓ Created indexes on new columns';

-- ================================================
-- SECTION 4: VALIDATION
-- ================================================
DO $$
DECLARE
  has_sales_id BOOLEAN;
  has_actual_start BOOLEAN;
  has_actual_end BOOLEAN;
  index_count INT;
BEGIN
  -- Check sales_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_orders'
    AND column_name = 'sales_id'
  ) INTO has_sales_id;
  
  ASSERT has_sales_id, 'sales_id column not created';
  
  -- Check actual_start_time column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_orders'
    AND column_name = 'actual_start_time'
  ) INTO has_actual_start;
  
  ASSERT has_actual_start, 'actual_start_time column not created';
  
  -- Check actual_end_time column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'service_orders'
    AND column_name = 'actual_end_time'
  ) INTO has_actual_end;
  
  ASSERT has_actual_end, 'actual_end_time column not created';
  
  -- Check indexes created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'service_orders'
  AND indexname IN (
    'idx_service_orders_sales',
    'idx_service_orders_actual_start',
    'idx_service_orders_actual_end',
    'idx_service_orders_job_duration'
  );
  
  ASSERT index_count = 4, 
         'Expected 4 new indexes, found ' || index_count;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 002: SERVICE ORDERS EXTENDED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ sales_id column added: %', has_sales_id;
  RAISE NOTICE '   ✅ actual_start_time column added: %', has_actual_start;
  RAISE NOTICE '   ✅ actual_end_time column added: %', has_actual_end;
  RAISE NOTICE '   ✅ New indexes created: %', index_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
