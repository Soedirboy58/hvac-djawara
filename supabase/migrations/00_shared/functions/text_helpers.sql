-- ============================================
-- Shared Functions: Text Helpers
-- Purpose: Text manipulation utilities
-- Author: System Architect
-- Date: 2025-12-01
-- ============================================

-- ================================================
-- FUNCTION: slugify
-- Purpose: Convert text to URL-safe slug
-- ================================================
DROP FUNCTION IF EXISTS public.slugify(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.slugify(text_input TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Convert to lowercase
  result := LOWER(text_input);
  
  -- Replace spaces with hyphens
  result := REGEXP_REPLACE(result, '\s+', '-', 'g');
  
  -- Remove non-alphanumeric characters (keep hyphens)
  result := REGEXP_REPLACE(result, '[^a-z0-9-]', '', 'g');
  
  -- Remove multiple consecutive hyphens
  result := REGEXP_REPLACE(result, '-+', '-', 'g');
  
  -- Trim hyphens from start and end
  result := TRIM(BOTH '-' FROM result);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.slugify(TEXT) IS 
'Convert text to URL-safe slug.
Example: slugify(''AC Jaya Service'') → ''ac-jaya-service''
IMMUTABLE: Same input always returns same output.';

-- ================================================
-- FUNCTION: generate_code
-- Purpose: Generate unique code with prefix
-- ================================================
DROP FUNCTION IF EXISTS public.generate_code(TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.generate_code(
  prefix TEXT,
  sequence_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
  code TEXT;
BEGIN
  -- Get next sequence value
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_val;
  
  -- Format: PREFIX-YYYYMM-NNNN
  code := prefix || '-' || 
          TO_CHAR(NOW(), 'YYYYMM') || '-' || 
          LPAD(next_val::TEXT, 4, '0');
  
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION public.generate_code(TEXT, TEXT) IS 
'Generate unique code with prefix and sequence.
Parameters:
  - prefix: Code prefix (e.g., ''SO'' for Service Order)
  - sequence_name: PostgreSQL sequence name
Returns: PREFIX-YYYYMM-NNNN format
Example: generate_code(''SO'', ''service_orders_seq'') → ''SO-202512-0001''
Note: Requires sequence to be created first.';

-- ================================================
-- FUNCTION: clean_phone
-- Purpose: Clean and format phone number
-- ================================================
DROP FUNCTION IF EXISTS public.clean_phone(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.clean_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove all non-digit characters
  cleaned := REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
  
  -- Convert leading 0 to +62 (Indonesia)
  IF LEFT(cleaned, 1) = '0' THEN
    cleaned := '+62' || SUBSTRING(cleaned FROM 2);
  END IF;
  
  -- Add +62 if no country code
  IF LEFT(cleaned, 1) != '+' AND LEFT(cleaned, 2) != '62' THEN
    cleaned := '+62' || cleaned;
  END IF;
  
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.clean_phone(TEXT) IS 
'Clean and format Indonesian phone number to E.164 format.
Example: clean_phone(''0812-3456-7890'') → ''+628123456890''
IMMUTABLE: Same input always returns same output.';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  func_count INT;
  test_slug TEXT;
  test_phone TEXT;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc 
  WHERE proname IN ('slugify', 'generate_code', 'clean_phone');
  
  ASSERT func_count = 3, 
         'Expected 3 text helper functions, found ' || func_count;
  
  -- Test slugify
  test_slug := public.slugify('AC Jaya Service & Repair!!!');
  ASSERT test_slug = 'ac-jaya-service-repair',
         'slugify test failed: expected "ac-jaya-service-repair", got "' || test_slug || '"';
  
  -- Test clean_phone
  test_phone := public.clean_phone('0812-3456-7890');
  ASSERT test_phone = '+628123456790',
         'clean_phone test failed: expected "+628123456790", got "' || test_phone || '"';
         
  RAISE NOTICE '✓ All text helper functions created and tested successfully';
END $$;
