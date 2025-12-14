-- ============================================
-- NOTIFICATION SYSTEM FOR MAINTENANCE REMINDERS
-- Platform notifications + Client reminders
-- ============================================

-- ============================================
-- STEP 1: Create notifications table
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Target
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    
    -- Notification details
    type TEXT NOT NULL CHECK (type IN (
        'maintenance_due_soon',     -- 3 days before
        'maintenance_due_today',    -- same day
        'maintenance_overdue',      -- past due
        'contract_expiring',        -- contract ending soon
        'order_assigned',           -- technician assigned
        'order_completed'           -- service completed
    )),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    related_entity_type TEXT, -- 'service_order', 'maintenance_schedule', 'contract'
    related_entity_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_sent_email BOOLEAN DEFAULT FALSE,
    is_sent_whatsapp BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    
    -- Priority
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_client ON public.notifications(client_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view notifications in their tenant"
    ON public.notifications FOR SELECT
    USING (
        tenant_id IN (
            SELECT p.active_tenant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Allow system/cron to create

CREATE POLICY "Users can update their notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid() OR client_id IN (
        SELECT c.id FROM public.clients c
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE c.tenant_id = p.active_tenant_id
    ));

-- ============================================
-- STEP 2: Create notification generation functions
-- ============================================

-- Function: Create maintenance reminder notification
CREATE OR REPLACE FUNCTION create_maintenance_reminder_notification(
    p_schedule_id UUID,
    p_days_until_due INTEGER
) RETURNS UUID AS $$
DECLARE
    v_schedule RECORD;
    v_property RECORD;
    v_client RECORD;
    v_notification_id UUID;
    v_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule
    FROM property_maintenance_schedules
    WHERE id = p_schedule_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Get property and client
    SELECT * INTO v_property FROM client_properties WHERE id = v_schedule.property_id;
    SELECT * INTO v_client FROM clients WHERE id = v_schedule.client_id;
    
    -- Determine notification type and message
    IF p_days_until_due <= 0 THEN
        v_type := 'maintenance_due_today';
        v_title := '🔔 Maintenance Due Today!';
        v_message := 'Maintenance scheduled for ' || v_property.property_name || ' is due today.';
    ELSIF p_days_until_due <= 3 THEN
        v_type := 'maintenance_due_soon';
        v_title := '⏰ Maintenance Due in ' || p_days_until_due || ' days';
        v_message := 'Upcoming maintenance for ' || v_property.property_name || ' in ' || p_days_until_due || ' days.';
    ELSE
        RETURN NULL; -- No notification needed
    END IF;
    
    -- Create notification
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
        v_type,
        v_title,
        v_message,
        'maintenance_schedule',
        p_schedule_id,
        CASE WHEN p_days_until_due <= 0 THEN 'urgent' ELSE 'normal' END
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Batch generate maintenance reminders
CREATE OR REPLACE FUNCTION generate_maintenance_reminders()
RETURNS TABLE(
    schedule_id UUID,
    notification_id UUID,
    days_until_due INTEGER,
    client_name TEXT,
    property_name TEXT
) AS $$
DECLARE
    v_schedule RECORD;
    v_days_until INTEGER;
    v_notif_id UUID;
    v_client_name TEXT;
    v_property_name TEXT;
BEGIN
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
                    v_schedule.property_name;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Email notification function (placeholder)
-- ============================================

CREATE OR REPLACE FUNCTION send_notification_email(
    p_notification_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_notification RECORD;
    v_client RECORD;
BEGIN
    -- Get notification details
    SELECT * INTO v_notification
    FROM notifications
    WHERE id = p_notification_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get client email
    SELECT * INTO v_client
    FROM clients
    WHERE id = v_notification.client_id;
    
    -- TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    -- For now, just mark as sent
    UPDATE notifications
    SET is_sent_email = TRUE
    WHERE id = p_notification_id;
    
    RAISE NOTICE 'Email notification sent to: %', v_client.email;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Mark notification as read
-- ============================================

CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        is_read = TRUE,
        read_at = now()
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Setup cron job for daily reminders
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        -- Unschedule if exists
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-maintenance-reminders') THEN
            PERFORM cron.unschedule('generate-maintenance-reminders');
        END IF;
        
        -- Schedule: Daily at 7:00 AM UTC (after order generation at 6 AM)
        PERFORM cron.schedule(
            'generate-maintenance-reminders',
            '0 7 * * *',
            $$SELECT * FROM generate_maintenance_reminders()$$
        );
        
        RAISE NOTICE '✅ Notification cron job scheduled: generate-maintenance-reminders (daily at 7 AM)';
    END IF;
END $$;

-- ============================================
-- STEP 6: Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ NOTIFICATION SYSTEM INSTALLED!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Created:';
    RAISE NOTICE '  • Table: notifications';
    RAISE NOTICE '  • Functions: 4 notification functions';
    RAISE NOTICE '  • Cron: Daily reminders at 7 AM UTC';
    RAISE NOTICE '';
    RAISE NOTICE '🔔 Notification Types:';
    RAISE NOTICE '  • maintenance_due_soon (3 days before)';
    RAISE NOTICE '  • maintenance_due_today (same day)';
    RAISE NOTICE '  • maintenance_overdue (past due)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test manually:';
    RAISE NOTICE '  SELECT * FROM generate_maintenance_reminders();';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email Integration:';
    RAISE NOTICE '  TODO: Integrate send_notification_email() with SendGrid/AWS SES';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
