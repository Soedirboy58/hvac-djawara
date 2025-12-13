-- Migration: Seed initial tenant data
-- Description: Insert HVAC Djawara tenant and working hours configuration

-- Insert tenant (with conflict handling)
INSERT INTO tenants (
    slug,
    name,
    contact_email,
    contact_phone,
    subscription_status,
    subscription_plan,
    created_at,
    updated_at
) VALUES (
    'hvac-djawara',
    'HVAC Djawara',
    'pt.djawara3g@gmail.com',
    '081234567890',
    'active',
    'pro',
    NOW(),
    NOW()
)
ON CONFLICT (slug) 
DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    contact_phone = EXCLUDED.contact_phone,
    subscription_status = EXCLUDED.subscription_status,
    subscription_plan = EXCLUDED.subscription_plan,
    updated_at = NOW();

-- Insert working hours configuration
INSERT INTO working_hours_config (
    tenant_id,
    work_start_time,
    work_end_time,
    overtime_rate_per_hour,
    max_overtime_hours_per_day,
    created_at,
    updated_at
)
SELECT 
    id,
    '09:00:00'::TIME,
    '17:00:00'::TIME,
    5000.00,
    4,
    NOW(),
    NOW()
FROM tenants
WHERE slug = 'hvac-djawara'
ON CONFLICT (tenant_id) 
DO UPDATE SET
    work_start_time = EXCLUDED.work_start_time,
    work_end_time = EXCLUDED.work_end_time,
    overtime_rate_per_hour = EXCLUDED.overtime_rate_per_hour,
    max_overtime_hours_per_day = EXCLUDED.max_overtime_hours_per_day,
    updated_at = NOW();

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Successfully seeded HVAC Djawara tenant data';
    RAISE NOTICE 'Tenant slug: hvac-djawara';
    RAISE NOTICE 'Working hours: 09:00 - 17:00';
    RAISE NOTICE 'Overtime rate: Rp 5,000/hour';
END $$;
