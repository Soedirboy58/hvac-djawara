-- ============================================
-- FIX: Add Overdue Maintenance Notifications
-- Generate notifications untuk maintenance yang sudah lewat
-- ============================================

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS generate_maintenance_reminders();

-- Add overdue notification generation to existing function
CREATE OR REPLACE FUNCTION generate_maintenance_reminders()
RETURNS TABLE(
    schedule_id UUID,
    notification_id UUID,
    days_until_due INTEGER,
    client_name TEXT,
    property_name TEXT,
    status TEXT
) AS $$
DECLARE
    v_schedule RECORD;
    v_days_until INTEGER;
    v_notif_id UUID;
BEGIN
    -- Generate reminders for UPCOMING maintenance (0-3 days ahead)
    FOR v_schedule IN
        SELECT 
            pms.*,
            cp.property_name,
            c.name as client_name
        FROM property_maintenance_schedules pms
        JOIN client_properties cp ON cp.id = pms.property_id
        JOIN clients c ON c.id = pms.client_id
        WHERE pms.is_active = TRUE
        AND pms.next_scheduled_date IS NOT NULL
        AND pms.next_scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
    LOOP
        v_days_until := v_schedule.next_scheduled_date - CURRENT_DATE;
        
        -- Check if notification already exists for today
        IF NOT EXISTS (
            SELECT 1 FROM notifications
            WHERE related_entity_id = v_schedule.id
            AND related_entity_type = 'maintenance_schedule'
            AND DATE(created_at) = CURRENT_DATE
            AND type IN ('maintenance_due_soon', 'maintenance_due_today')
        ) THEN
            v_notif_id := create_maintenance_reminder_notification(
                v_schedule.id,
                v_days_until
            );
            
            IF v_notif_id IS NOT NULL THEN
                RETURN QUERY SELECT
                    v_schedule.id,
                    v_notif_id,
                    v_days_until,
                    v_schedule.client_name,
                    v_schedule.property_name,
                    'upcoming'::TEXT;
            END IF;
        END IF;
    END LOOP;
    
    -- Generate OVERDUE notifications for maintenance past due
    FOR v_schedule IN
        SELECT 
            pms.*,
            cp.property_name,
            c.name as client_name
        FROM property_maintenance_schedules pms
        JOIN client_properties cp ON cp.id = pms.property_id
        JOIN clients c ON c.id = pms.client_id
        WHERE pms.is_active = TRUE
        AND pms.next_scheduled_date IS NOT NULL
        AND pms.next_scheduled_date < CURRENT_DATE
    LOOP
        v_days_until := v_schedule.next_scheduled_date - CURRENT_DATE; -- Will be negative
        
        -- Check if overdue notification already exists for today
        IF NOT EXISTS (
            SELECT 1 FROM notifications
            WHERE related_entity_id = v_schedule.id
            AND related_entity_type = 'maintenance_schedule'
            AND DATE(created_at) = CURRENT_DATE
            AND type = 'maintenance_overdue'
        ) THEN
            -- Create overdue notification
            INSERT INTO notifications (
                tenant_id,
                client_id,
                type,
                title,
                message,
                related_entity_type,
                related_entity_id,
                priority
            ) VALUES (
                v_schedule.tenant_id,
                v_schedule.client_id,
                'maintenance_overdue',
                '⚠️ Maintenance Overdue: ' || v_schedule.property_name,
                'Maintenance was due on ' || to_char(v_schedule.next_scheduled_date, 'DD Mon YYYY') || 
                ' (' || abs(v_days_until) || ' days ago). Please schedule as soon as possible.',
                'maintenance_schedule',
                v_schedule.id,
                'urgent'
            ) RETURNING id INTO v_notif_id;
            
            RETURN QUERY SELECT
                v_schedule.id,
                v_notif_id,
                v_days_until,
                v_schedule.client_name,
                v_schedule.property_name,
                'overdue'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Test: Generate notifications now (including overdue)
SELECT * FROM generate_maintenance_reminders();

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Overdue notification generation added!';
    RAISE NOTICE 'Run: SELECT * FROM generate_maintenance_reminders();';
END $$;
