-- ============================================
-- Shared Function: handle_updated_at
-- Purpose: Auto-update updated_at timestamp
-- Usage: Apply as trigger to any table with updated_at column
-- Author: System Architect
-- Date: 2025-12-01
-- ============================================

-- DROP existing if any
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- CREATE function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COMMENT
COMMENT ON FUNCTION public.handle_updated_at() IS 
'Automatically update updated_at timestamp on row update. 
Apply as BEFORE UPDATE trigger.
Example: CREATE TRIGGER set_updated_at BEFORE UPDATE ON table_name 
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();';

-- VALIDATION
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_updated_at') = 1,
         'Function handle_updated_at not created';
  RAISE NOTICE '✓ handle_updated_at function created successfully';
END $$;
