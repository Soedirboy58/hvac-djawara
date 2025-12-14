-- ============================================
-- MAINTENANCE SCHEDULE SYSTEM
-- Auto-generate recurring service orders
-- ============================================

-- Table: contract_schedules
CREATE TABLE IF NOT EXISTS contract_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES maintenance_contracts(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
    custom_interval_days INTEGER,
    start_date DATE NOT NULL,
    maintenance_type TEXT NOT NULL DEFAULT 'preventive',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_generated_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_contract_schedules_contract ON contract_schedules(contract_id);
CREATE INDEX idx_contract_schedules_active ON contract_schedules(is_active) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE contract_schedules ENABLE ROW LEVEL SECURITY;

-- Allow clients to view their schedules
CREATE POLICY contract_schedules_client_select ON contract_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM maintenance_contracts mc
            WHERE mc.id = contract_schedules.contract_id
            AND mc.client_id IN (
                SELECT client_id FROM profiles
                WHERE id = auth.uid()
            )
        )
    );

-- Allow staff to manage all schedules
CREATE POLICY contract_schedules_staff_all ON contract_schedules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND user_role::text = ANY(ARRAY['admin', 'manager', 'supervisor'])
        )
    );

-- Function: Get interval days based on frequency
CREATE OR REPLACE FUNCTION get_schedule_interval_days(
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
$$ LANGUAGE plpgsql;

-- Function: Auto-generate next maintenance order
CREATE OR REPLACE FUNCTION generate_next_maintenance_order(
    p_schedule_id UUID
) RETURNS UUID AS $$
DECLARE
    v_schedule RECORD;
    v_contract RECORD;
    v_next_date DATE;
    v_interval_days INTEGER;
    v_order_id UUID;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM contract_schedules
    WHERE id = p_schedule_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schedule not found or inactive';
    END IF;

    -- Get contract details
    SELECT * INTO v_contract
    FROM maintenance_contracts
    WHERE id = v_schedule.contract_id;

    -- Calculate next maintenance date
    v_interval_days := get_schedule_interval_days(
        v_schedule.frequency,
        v_schedule.custom_interval_days
    );

    v_next_date := COALESCE(
        v_schedule.last_generated_date + v_interval_days,
        v_schedule.start_date
    );

    -- Don't generate if future orders exist
    IF EXISTS (
        SELECT 1 FROM service_orders
        WHERE contract_id = v_schedule.contract_id
        AND scheduled_date >= v_next_date
        AND status NOT IN ('cancelled', 'completed')
    ) THEN
        RETURN NULL; -- Already has future order
    END IF;

    -- Generate service order
    INSERT INTO service_orders (
        client_id,
        contract_id,
        order_type,
        order_code,
        scheduled_date,
        status,
        description,
        created_by
    ) VALUES (
        v_contract.client_id,
        v_contract.id,
        'maintenance',
        'MNT-' || TO_CHAR(v_next_date, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        v_next_date,
        'scheduled',
        'Auto-generated ' || v_schedule.maintenance_type || ' maintenance',
        (SELECT id FROM profiles WHERE user_role::text = 'admin' LIMIT 1) -- System generated
    ) RETURNING id INTO v_order_id;

    -- Update schedule last generated date
    UPDATE contract_schedules
    SET last_generated_date = v_next_date,
        updated_at = now()
    WHERE id = p_schedule_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Batch generate maintenance orders (run daily via cron)
CREATE OR REPLACE FUNCTION batch_generate_maintenance_orders()
RETURNS TABLE(
    schedule_id UUID,
    order_id UUID,
    client_name TEXT,
    scheduled_date DATE
) AS $$
DECLARE
    v_schedule RECORD;
    v_order_id UUID;
BEGIN
    -- Loop through active schedules that need generation
    FOR v_schedule IN
        SELECT 
            cs.id,
            cs.contract_id,
            cs.start_date,
            cs.last_generated_date,
            cs.frequency,
            cs.custom_interval_days,
            mc.client_id,
            c.name AS client_name
        FROM contract_schedules cs
        JOIN maintenance_contracts mc ON mc.id = cs.contract_id
        JOIN clients c ON c.id = mc.client_id
        WHERE cs.is_active = TRUE
        AND (
            -- Never generated yet and start date is today or past
            (cs.last_generated_date IS NULL AND cs.start_date <= CURRENT_DATE)
            OR
            -- Last generated + interval is today or past
            (cs.last_generated_date + get_schedule_interval_days(cs.frequency, cs.custom_interval_days) <= CURRENT_DATE)
        )
    LOOP
        BEGIN
            v_order_id := generate_next_maintenance_order(v_schedule.id);
            
            IF v_order_id IS NOT NULL THEN
                schedule_id := v_schedule.id;
                order_id := v_order_id;
                client_name := v_schedule.client_name;
                scheduled_date := COALESCE(
                    v_schedule.last_generated_date + get_schedule_interval_days(
                        v_schedule.frequency,
                        v_schedule.custom_interval_days
                    ),
                    v_schedule.start_date
                );
                RETURN NEXT;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing other schedules
            RAISE WARNING 'Failed to generate order for schedule %: %', v_schedule.id, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create cron job extension (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily job at 6 AM to generate maintenance orders
SELECT cron.schedule(
    'generate-maintenance-orders',
    '0 6 * * *', -- Every day at 6:00 AM
    $$SELECT batch_generate_maintenance_orders()$$
);

-- Manual trigger function (for testing)
CREATE OR REPLACE FUNCTION trigger_maintenance_generation()
RETURNS TABLE(
    generated_count INTEGER,
    orders TEXT[]
) AS $$
DECLARE
    v_result RECORD;
    v_count INTEGER := 0;
    v_orders TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR v_result IN
        SELECT * FROM batch_generate_maintenance_orders()
    LOOP
        v_count := v_count + 1;
        v_orders := array_append(v_orders, v_result.order_id::TEXT);
    END LOOP;

    generated_count := v_count;
    orders := v_orders;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Notification function when maintenance order is generated
CREATE OR REPLACE FUNCTION notify_maintenance_generated()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification (implement your notification logic here)
    -- For now, just log
    RAISE NOTICE 'Maintenance order % generated for client %', NEW.order_code, NEW.client_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_maintenance
    AFTER INSERT ON service_orders
    FOR EACH ROW
    WHEN (NEW.order_type = 'maintenance' AND NEW.status = 'scheduled')
    EXECUTE FUNCTION notify_maintenance_generated();

-- Grant permissions
GRANT SELECT ON contract_schedules TO authenticated;
GRANT INSERT, UPDATE ON contract_schedules TO authenticated;

COMMENT ON TABLE contract_schedules IS 'Recurring maintenance schedule configuration';
COMMENT ON FUNCTION generate_next_maintenance_order IS 'Generate single maintenance order for a schedule';
COMMENT ON FUNCTION batch_generate_maintenance_orders IS 'Batch generate all due maintenance orders';
COMMENT ON FUNCTION trigger_maintenance_generation IS 'Manual trigger for testing schedule generation';
