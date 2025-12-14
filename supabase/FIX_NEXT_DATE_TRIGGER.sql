-- ============================================
-- FIX: Next Scheduled Date Trigger
-- Issue: next_scheduled_date tidak muncul saat insert baru
-- Solution: Calculate directly in trigger tanpa memanggil function dengan NEW.id
-- ============================================

-- Drop old trigger
DROP TRIGGER IF EXISTS trg_update_next_sched_date 
    ON public.property_maintenance_schedules;

-- Recreate function with direct calculation
CREATE OR REPLACE FUNCTION update_next_scheduled_date()
RETURNS TRIGGER AS $$
DECLARE
    v_interval_days INTEGER;
    v_base_date DATE;
BEGIN
    -- Calculate interval
    v_interval_days := get_maintenance_interval_days(
        NEW.frequency,
        NEW.custom_interval_days
    );
    
    -- Determine base date
    IF NEW.last_generated_date IS NOT NULL THEN
        v_base_date := NEW.last_generated_date;
    ELSE
        v_base_date := NEW.start_date;
    END IF;
    
    -- Calculate next date directly (without calling function that needs NEW.id)
    NEW.next_scheduled_date := v_base_date + (v_interval_days || ' days')::INTERVAL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trg_update_next_sched_date
    BEFORE INSERT OR UPDATE ON public.property_maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_next_scheduled_date();

-- ============================================
-- Test: Update existing records without next_scheduled_date
-- ============================================

DO $$
DECLARE
    v_updated INTEGER;
BEGIN
    -- Force trigger on existing records
    UPDATE property_maintenance_schedules
    SET updated_at = now()
    WHERE next_scheduled_date IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated > 0 THEN
        RAISE NOTICE '✅ Updated % existing records with next_scheduled_date', v_updated;
    ELSE
        RAISE NOTICE '✅ No records needed update';
    END IF;
END $$;

-- ============================================
-- Verification
-- ============================================

DO $$
DECLARE
    v_missing INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_missing
    FROM property_maintenance_schedules
    WHERE next_scheduled_date IS NULL
    AND is_active = TRUE;
    
    IF v_missing = 0 THEN
        RAISE NOTICE '✅ All active schedules have next_scheduled_date';
    ELSE
        RAISE NOTICE '⚠️  Still % records missing next_scheduled_date', v_missing;
    END IF;
END $$;

-- Show current schedules with next dates
SELECT 
    id,
    frequency,
    start_date,
    last_generated_date,
    next_scheduled_date,
    is_active
FROM property_maintenance_schedules
ORDER BY created_at DESC
LIMIT 5;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ NEXT DATE TRIGGER FIXED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Next scheduled dates will now populate automatically on INSERT/UPDATE';
    RAISE NOTICE '';
END $$;
