-- ============================================
-- Migration: Extend Order Types
-- Purpose: Add new order types for consultation and procurement
-- Domain: Scheduling & Workforce Management
-- Dependencies: order_type enum (PHASE_1_WORKFLOW.sql)
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: EXTEND ORDER_TYPE ENUM
-- ================================================
-- Add new values to existing order_type enum
-- Current values: maintenance, repair, installation, survey, troubleshooting
-- New values: konsultasi, pengadaan

DO $$
BEGIN
  -- Add 'konsultasi' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'konsultasi' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
  ) THEN
    ALTER TYPE order_type ADD VALUE 'konsultasi';
    RAISE NOTICE '✓ Added konsultasi to order_type enum';
  ELSE
    RAISE NOTICE '⊘ konsultasi already exists in order_type enum';
  END IF;

  -- Add 'pengadaan' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pengadaan' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
  ) THEN
    ALTER TYPE order_type ADD VALUE 'pengadaan';
    RAISE NOTICE '✓ Added pengadaan to order_type enum';
  ELSE
    RAISE NOTICE '⊘ pengadaan already exists in order_type enum';
  END IF;
END $$;

-- ================================================
-- SECTION 2: UPDATE ENUM COMMENT
-- ================================================
COMMENT ON TYPE order_type IS 
'Service order types:
- maintenance: Pemeliharaan rutin / routine maintenance
- repair: Perbaikan / repair work
- installation: Pemasangan baru / new installation
- survey: Survey lokasi / site survey
- troubleshooting: Analisa kerusakan / troubleshooting
- konsultasi: Konsultasi teknis / technical consultation
- pengadaan: Pengadaan equipment / equipment procurement';

-- ================================================
-- SECTION 3: VALIDATION
-- ================================================
DO $$
DECLARE
  enum_count INT;
  has_konsultasi BOOLEAN;
  has_pengadaan BOOLEAN;
BEGIN
  -- Check total enum values
  SELECT COUNT(*) INTO enum_count
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type');
  
  ASSERT enum_count = 7, 
         'Expected 7 order_type values, found ' || enum_count;
  
  -- Check konsultasi exists
  SELECT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'konsultasi' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
  ) INTO has_konsultasi;
  
  ASSERT has_konsultasi, 'konsultasi not found in order_type enum';
  
  -- Check pengadaan exists
  SELECT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pengadaan' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
  ) INTO has_pengadaan;
  
  ASSERT has_pengadaan, 'pengadaan not found in order_type enum';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 001: ORDER TYPES EXTENDED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Total order_type values: %', enum_count;
  RAISE NOTICE '   ✅ konsultasi added: %', has_konsultasi;
  RAISE NOTICE '   ✅ pengadaan added: %', has_pengadaan;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
