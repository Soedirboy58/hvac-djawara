-- ============================================
-- SIMPLE MAINTENANCE SCHEDULE SYSTEM
-- For small clients without formal contract
-- ============================================
-- Run this FIRST before contract-based system
-- Version: 1.0
-- Date: December 14, 2025

-- ============================================
-- STEP 1: Create property_maintenance_schedules table
-- ============================================

CREATE TABLE IF NOT EXISTS public.property_maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.client_properties(id) ON DELETE CASCADE,
    
    -- Schedule configuration
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
    custom_interval_days INTEGER, -- untuk custom frequency
    start_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL DEFAULT 'cleaning_inspection',
    
    -- Unit selection
    apply_to_all_units BOOLEAN DEFAULT TRUE,
    selected_unit_ids UUID[], -- Array of ac_units.id (if apply_to_all = FALSE)
    
    -- Auto-generation tracking
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_date DATE,
    next_scheduled_date DATE, -- calculated field for UI display
    
    -- Notes
    notes TEXT,
    special_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- ============================================
-- STEP 2: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_prop_maint_sched_tenant 
    ON public.property_maintenance_schedules(tenant_id);

CREATE INDEX IF NOT EXISTS idx_prop_maint_sched_client 
    ON public.property_maintenance_schedules(client_id);

CREATE INDEX IF NOT EXISTS idx_prop_maint_sched_property 
    ON public.property_maintenance_schedules(property_id);

CREATE INDEX IF NOT EXISTS idx_prop_maint_sched_active 
    ON public.property_maintenance_schedules(is_active) 
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_prop_maint_sched_next_date 
    ON public.property_maintenance_schedules(next_scheduled_date)
    WHERE is_active = TRUE;

-- ============================================
-- STEP 3: Add comments
-- ============================================

COMMENT ON TABLE public.property_maintenance_schedules IS 
'Simple maintenance scheduling per property without formal contract. For small clients with straightforward recurring needs.';

COMMENT ON COLUMN public.property_maintenance_schedules.apply_to_all_units IS 
'TRUE = all AC units in property, FALSE = only selected_unit_ids';

COMMENT ON COLUMN public.property_maintenance_schedules.selected_unit_ids IS 
'Array of ac_units.id when apply_to_all_units = FALSE. Example: {uuid1, uuid2, uuid3}';

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE public.property_maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schedules in their tenant
DROP POLICY IF EXISTS "Users can view property schedules in their tenant" 
    ON public.property_maintenance_schedules;

CREATE POLICY "Users can view property schedules in their tenant"
    ON public.property_maintenance_schedules
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT p.active_tenant_id 
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

-- Policy: Users can create schedules in their tenant
DROP POLICY IF EXISTS "Users can create property schedules in their tenant" 
    ON public.property_maintenance_schedules;

CREATE POLICY "Users can create property schedules in their tenant"
    ON public.property_maintenance_schedules
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT p.active_tenant_id 
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

-- Policy: Users can update schedules in their tenant
DROP POLICY IF EXISTS "Users can update property schedules in their tenant" 
    ON public.property_maintenance_schedules;

CREATE POLICY "Users can update property schedules in their tenant"
    ON public.property_maintenance_schedules
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT p.active_tenant_id 
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

-- Policy: Users can delete schedules in their tenant
DROP POLICY IF EXISTS "Users can delete property schedules in their tenant" 
    ON public.property_maintenance_schedules;

CREATE POLICY "Users can delete property schedules in their tenant"
    ON public.property_maintenance_schedules
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT p.active_tenant_id 
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

-- ============================================
-- STEP 5: Create helper functions
-- ============================================

-- Function: Calculate interval days from frequency
CREATE OR REPLACE FUNCTION get_maintenance_interval_days(
    p_frequency TEXT,
    p_custom_days INTEGER
) RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_frequency
        WHEN 'monthly' THEN 30
        WHEN 'quarterly' THEN 90
        WHEN 'semi_annual' THEN 180
        WHEN 'annual' THEN 365
        WHEN 'custom' THEN COALESCE(p_custom_days, 30)
        ELSE 30
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_maintenance_interval_days IS 
'Convert frequency text to number of days. Used for calculating next schedule date.';

-- Function: Calculate next scheduled date
CREATE OR REPLACE FUNCTION calculate_next_maintenance_date(
    p_schedule_id UUID
) RETURNS DATE AS $$
DECLARE
    v_schedule RECORD;
    v_interval_days INTEGER;
    v_base_date DATE;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM property_maintenance_schedules
    WHERE id = p_schedule_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Calculate interval
    v_interval_days := get_maintenance_interval_days(
        v_schedule.frequency,
        v_schedule.custom_interval_days
    );
    
    -- Determine base date
    IF v_schedule.last_generated_date IS NOT NULL THEN
        v_base_date := v_schedule.last_generated_date;
    ELSE
        v_base_date := v_schedule.start_date;
    END IF;
    
    -- Calculate next date
    RETURN v_base_date + (v_interval_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_next_maintenance_date IS 
'Calculate next scheduled maintenance date based on last generated date or start date.';

-- Function: Update next_scheduled_date after insert/update
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
    
    -- Calculate next date directly
    NEW.next_scheduled_date := v_base_date + (v_interval_days || ' days')::INTERVAL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update next_scheduled_date
DROP TRIGGER IF EXISTS trg_update_next_sched_date 
    ON public.property_maintenance_schedules;

CREATE TRIGGER trg_update_next_sched_date
    BEFORE INSERT OR UPDATE ON public.property_maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_next_scheduled_date();

-- ============================================
-- STEP 6: Create order generation function
-- ============================================

-- Function: Generate maintenance order from simple schedule
CREATE OR REPLACE FUNCTION generate_order_from_simple_schedule(
    p_schedule_id UUID
) RETURNS UUID AS $$
DECLARE
    v_schedule RECORD;
    v_property RECORD;
    v_client RECORD;
    v_units TEXT;
    v_unit_count INTEGER;
    v_order_id UUID;
    v_interval_days INTEGER;
    v_next_date DATE;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM property_maintenance_schedules
    WHERE id = p_schedule_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Schedule % not found or inactive', p_schedule_id;
        RETURN NULL;
    END IF;
    
    -- Check if already generated for today
    IF v_schedule.last_generated_date = CURRENT_DATE THEN
        RAISE NOTICE 'Schedule % already generated today', p_schedule_id;
        RETURN NULL;
    END IF;
    
    -- Calculate next date
    v_interval_days := get_maintenance_interval_days(
        v_schedule.frequency,
        v_schedule.custom_interval_days
    );
    
    IF v_schedule.last_generated_date IS NULL THEN
        v_next_date := v_schedule.start_date;
    ELSE
        v_next_date := v_schedule.last_generated_date + (v_interval_days || ' days')::INTERVAL;
    END IF;
    
    -- Check if due
    IF v_next_date > CURRENT_DATE THEN
        RAISE NOTICE 'Schedule % not due yet. Next date: %', p_schedule_id, v_next_date;
        RETURN NULL;
    END IF;
    
    -- Get property details
    SELECT * INTO v_property
    FROM client_properties
    WHERE id = v_schedule.property_id;
    
    -- Get client details
    SELECT * INTO v_client
    FROM clients
    WHERE id = v_schedule.client_id;
    
    -- Build unit description
    IF v_schedule.apply_to_all_units THEN
        SELECT COUNT(*) INTO v_unit_count
        FROM ac_units
        WHERE property_id = v_schedule.property_id AND is_active = TRUE;
        
        v_units := 'All AC units (' || v_unit_count || ' units)';
    ELSE
        v_unit_count := array_length(v_schedule.selected_unit_ids, 1);
        v_units := 'Selected units (' || v_unit_count || ' units)';
    END IF;
    
    -- Create service order
    INSERT INTO service_orders (
        tenant_id,
        client_id,
        order_type,
        status,
        priority,
        service_title,
        service_description,
        location_address,
        scheduled_date,
        scheduled_time,
        is_recurring,
        notes,
        created_by
    ) VALUES (
        v_schedule.tenant_id,
        v_schedule.client_id,
        'maintenance',
        'scheduled',
        'medium',
        'Recurring Maintenance - ' || v_property.property_name,
        'Scheduled maintenance for ' || v_units || E'\n' ||
        'Maintenance Type: ' || v_schedule.maintenance_type || E'\n' ||
        'Frequency: ' || v_schedule.frequency,
        v_property.address,
        v_next_date,
        '09:00:00', -- Default time
        TRUE,
        'Auto-generated from simple maintenance schedule' || 
        CASE WHEN v_schedule.notes IS NOT NULL 
            THEN E'\n\nNotes: ' || v_schedule.notes 
            ELSE '' 
        END,
        v_schedule.created_by
    ) RETURNING id INTO v_order_id;
    
    -- Update schedule
    UPDATE property_maintenance_schedules
    SET 
        last_generated_date = CURRENT_DATE,
        next_scheduled_date = v_next_date + (v_interval_days || ' days')::INTERVAL,
        updated_at = now()
    WHERE id = p_schedule_id;
    
    RAISE NOTICE 'Generated order % for schedule %', v_order_id, p_schedule_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_from_simple_schedule IS 
'Generate service order from simple maintenance schedule. Called by cron job daily.';

-- ============================================
-- STEP 7: Create batch generation function
-- ============================================

-- Function: Generate all due simple maintenance orders
CREATE OR REPLACE FUNCTION batch_generate_simple_maintenance_orders()
RETURNS TABLE(
    schedule_id UUID,
    order_id UUID,
    client_name TEXT,
    property_name TEXT,
    generated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_schedule RECORD;
    v_order_id UUID;
    v_client_name TEXT;
    v_property_name TEXT;
BEGIN
    FOR v_schedule IN
        SELECT pms.* 
        FROM property_maintenance_schedules pms
        WHERE pms.is_active = TRUE
        AND (
            -- First time: start_date <= today
            (pms.last_generated_date IS NULL AND pms.start_date <= CURRENT_DATE)
            OR 
            -- Recurring: next_scheduled_date <= today
            (pms.next_scheduled_date IS NOT NULL AND pms.next_scheduled_date <= CURRENT_DATE)
        )
        ORDER BY pms.start_date, pms.created_at
    LOOP
        -- Generate order
        v_order_id := generate_order_from_simple_schedule(v_schedule.id);
        
        IF v_order_id IS NOT NULL THEN
            -- Get client and property names for logging
            SELECT c.name INTO v_client_name
            FROM clients c
            WHERE c.id = v_schedule.client_id;
            
            SELECT cp.property_name INTO v_property_name
            FROM client_properties cp
            WHERE cp.id = v_schedule.property_id;
            
            RETURN QUERY SELECT 
                v_schedule.id,
                v_order_id,
                v_client_name,
                v_property_name,
                now();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION batch_generate_simple_maintenance_orders IS 
'Batch generate all due simple maintenance orders. Called by cron job daily at 6 AM.';

-- ============================================
-- STEP 8: Create manual trigger function (for testing)
-- ============================================

-- Function: Manual trigger for testing
CREATE OR REPLACE FUNCTION trigger_simple_maintenance_generation()
RETURNS TABLE(
    total_generated INTEGER,
    schedules_processed UUID[],
    orders_created UUID[]
) AS $$
DECLARE
    v_generated INTEGER := 0;
    v_schedule_ids UUID[] := ARRAY[]::UUID[];
    v_order_ids UUID[] := ARRAY[]::UUID[];
    v_result RECORD;
BEGIN
    FOR v_result IN 
        SELECT * FROM batch_generate_simple_maintenance_orders()
    LOOP
        v_generated := v_generated + 1;
        v_schedule_ids := array_append(v_schedule_ids, v_result.schedule_id);
        v_order_ids := array_append(v_order_ids, v_result.order_id);
        
        RAISE NOTICE 'Generated order % for % - %', 
            v_result.order_id, 
            v_result.client_name, 
            v_result.property_name;
    END LOOP;
    
    RETURN QUERY SELECT v_generated, v_schedule_ids, v_order_ids;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_simple_maintenance_generation IS 
'Manual trigger for testing order generation. Returns summary of generated orders.';

-- ============================================
-- STEP 9: Grant permissions
-- ============================================

GRANT SELECT ON public.property_maintenance_schedules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.property_maintenance_schedules TO authenticated;

-- ============================================
-- STEP 10: Setup cron job (optional - will be combined with contract system later)
-- ============================================

-- Note: This will be replaced by unified cron job in CREATE_UNIFIED_MAINTENANCE_GENERATION.sql
-- For now, can be enabled separately for testing

-- Check if pg_cron is available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions 
        WHERE name = 'pg_cron'
    ) THEN
        -- Enable extension
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        
        -- Unschedule if exists (check first to avoid error)
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-simple-maintenance-orders') THEN
            PERFORM cron.unschedule('generate-simple-maintenance-orders');
            RAISE NOTICE 'Unscheduled existing job: generate-simple-maintenance-orders';
        END IF;
        
        -- Schedule: Daily at 6:00 AM
        PERFORM cron.schedule(
            'generate-simple-maintenance-orders',
            '0 6 * * *',
            $cron$SELECT * FROM batch_generate_simple_maintenance_orders()$cron$
        );
        
        RAISE NOTICE '✅ Cron job scheduled: generate-simple-maintenance-orders (daily at 6 AM)';
    ELSE
        RAISE NOTICE '⚠️  pg_cron not available. Cron job not scheduled.';
        RAISE NOTICE '   Run unified generation manually or wait for combined cron setup.';
    END IF;
END $$;

-- ============================================
-- STEP 11: Verification queries
-- ============================================

-- Check table creation
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_maintenance_schedules'
    ) THEN
        RAISE NOTICE '✅ Table property_maintenance_schedules created successfully';
    ELSE
        RAISE EXCEPTION '❌ Table creation failed';
    END IF;
END $$;

-- Check RLS enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'property_maintenance_schedules'
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled on property_maintenance_schedules';
    ELSE
        RAISE NOTICE '⚠️  RLS not enabled';
    END IF;
END $$;

-- Check policies
DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'property_maintenance_schedules';
    
    RAISE NOTICE '✅ Created % RLS policies for property_maintenance_schedules', v_policy_count;
END $$;

-- Check functions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'generate_order_from_simple_schedule'
    ) THEN
        RAISE NOTICE '✅ Function generate_order_from_simple_schedule created';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'batch_generate_simple_maintenance_orders'
    ) THEN
        RAISE NOTICE '✅ Function batch_generate_simple_maintenance_orders created';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'trigger_simple_maintenance_generation'
    ) THEN
        RAISE NOTICE '✅ Function trigger_simple_maintenance_generation created';
    END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SIMPLE MAINTENANCE SCHEDULE SYSTEM INSTALLED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Created:';
    RAISE NOTICE '  • Table: property_maintenance_schedules';
    RAISE NOTICE '  • Indexes: 5 indexes for performance';
    RAISE NOTICE '  • RLS Policies: 4 policies (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '  • Functions: 6 functions for automation';
    RAISE NOTICE '  • Triggers: 1 trigger for next_scheduled_date';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test manually:';
    RAISE NOTICE '  SELECT * FROM trigger_simple_maintenance_generation();';
    RAISE NOTICE '';
    RAISE NOTICE '📅 Auto-generation:';
    RAISE NOTICE '  Cron job runs daily at 6:00 AM UTC';
    RAISE NOTICE '  Check: SELECT * FROM cron.job WHERE jobname LIKE ''%%simple%%'';';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Next steps:';
    RAISE NOTICE '  1. Test schedule creation from UI';
    RAISE NOTICE '  2. Run manual trigger to test generation';
    RAISE NOTICE '  3. Install contract system (CREATE_MAINTENANCE_CONTRACT_TABLES.sql)';
    RAISE NOTICE '  4. Install unified cron (CREATE_UNIFIED_MAINTENANCE_GENERATION.sql)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
