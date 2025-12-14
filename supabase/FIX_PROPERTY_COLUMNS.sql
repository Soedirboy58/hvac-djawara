-- ============================================
-- FIX PROPERTY COLUMNS
-- Add missing columns to client_properties
-- ============================================

-- Add property_category column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_properties' 
    AND column_name = 'property_category'
  ) THEN
    ALTER TABLE public.client_properties 
    ADD COLUMN property_category TEXT;
    
    RAISE NOTICE '✅ Added property_category column';
  ELSE
    RAISE NOTICE '✓ property_category column already exists';
  END IF;
END $$;

-- Add coordinates column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_properties' 
    AND column_name = 'coordinates'
  ) THEN
    ALTER TABLE public.client_properties 
    ADD COLUMN coordinates JSONB;
    
    RAISE NOTICE '✅ Added coordinates column';
  ELSE
    RAISE NOTICE '✓ coordinates column already exists';
  END IF;
END $$;

-- Add constraint for property_category if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'public' 
    AND table_name = 'client_properties' 
    AND constraint_name = 'client_properties_category_check'
  ) THEN
    ALTER TABLE public.client_properties 
    ADD CONSTRAINT client_properties_category_check 
    CHECK (property_category IN ('rumah_tangga', 'layanan_publik', 'industri'));
    
    RAISE NOTICE '✅ Added property_category constraint';
  ELSE
    RAISE NOTICE '✓ property_category constraint already exists';
  END IF;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Property columns fixed!';
  RAISE NOTICE '✅ Now you can save properties';
END $$;
