-- ============================================
-- Migration: Seed Tenant Data
-- Purpose: Create HVAC Djawara tenant and working hours config
-- Domain: Scheduling & Workforce Management
-- Dependencies: tenants, working_hours_config tables
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- SECTION 1: CREATE HVAC DJAWARA TENANT
-- ================================================
DO $$
DECLARE
  tenant_id_var UUID;
  tenant_exists BOOLEAN;
BEGIN
  -- Check if tenant already exists
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE slug = 'hvac-djawara'
    OR contact_email = 'pt.djawara3g@gmail.com'
  ) INTO tenant_exists;
  
  IF tenant_exists THEN
    RAISE NOTICE '⊘ Tenant hvac-djawara already exists, skipping creation';
    
    -- Get existing tenant ID
    SELECT id INTO tenant_id_var
    FROM public.tenants
    WHERE slug = 'hvac-djawara'
    LIMIT 1;
  ELSE
    -- Create new tenant
    INSERT INTO public.tenants (
      slug,
      name,
      contact_email,
      contact_phone,
      address,
      city,
      province,
      postal_code,
      subscription_status,
      subscription_plan,
      subscription_started_at,
      subscription_expires_at,
      timezone,
      is_active
    ) VALUES (
      'hvac-djawara',
      'HVAC Djawara',
      'pt.djawara3g@gmail.com',
      '081234567890',
      'Jl. Industri No. 123',
      'Jakarta',
      'DKI Jakarta',
      '12345',
      'active',
      'pro',
      NOW(),
      NULL, -- No expiry for active plan
      'Asia/Jakarta',
      true
    )
    RETURNING id INTO tenant_id_var;
    
    RAISE NOTICE '✓ Created HVAC Djawara tenant (ID: %)', tenant_id_var;
  END IF;
  
  -- Store tenant_id in a temporary table for next section
  CREATE TEMP TABLE IF NOT EXISTS temp_tenant_data (tenant_id UUID);
  DELETE FROM temp_tenant_data;
  INSERT INTO temp_tenant_data (tenant_id) VALUES (tenant_id_var);
  
END $$;

-- ================================================
-- SECTION 2: CREATE WORKING HOURS CONFIG
-- ================================================
DO $$
DECLARE
  tenant_id_var UUID;
  config_exists BOOLEAN;
BEGIN
  -- Get tenant_id from temporary table
  SELECT tenant_id INTO tenant_id_var FROM temp_tenant_data LIMIT 1;
  
  IF tenant_id_var IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found. Cannot create working hours config.';
  END IF;
  
  -- Check if config already exists for this tenant
  SELECT EXISTS (
    SELECT 1 FROM public.working_hours_config
    WHERE tenant_id = tenant_id_var
    AND is_active = true
  ) INTO config_exists;
  
  IF config_exists THEN
    RAISE NOTICE '⊘ Working hours config already exists for tenant, skipping creation';
  ELSE
    -- Create working hours config
    INSERT INTO public.working_hours_config (
      tenant_id,
      work_start_time,
      work_end_time,
      overtime_rate_per_hour,
      max_overtime_hours_per_day,
      effective_from,
      is_active
    ) VALUES (
      tenant_id_var,
      '09:00'::TIME,
      '17:00'::TIME,
      5000.00, -- Rp 5,000/hour
      4.00,    -- 4 hours max per day
      CURRENT_DATE,
      true
    );
    
    RAISE NOTICE '✓ Created working hours config for HVAC Djawara';
    RAISE NOTICE '  - Work hours: 09:00 - 17:00';
    RAISE NOTICE '  - Overtime rate: Rp 5,000/hour';
    RAISE NOTICE '  - Max overtime: 4 hours/day';
  END IF;
END $$;

-- Clean up temp table
DROP TABLE IF EXISTS temp_tenant_data;

-- ================================================
-- SECTION 3: DISPLAY TENANT INFO
-- ================================================
DO $$
DECLARE
  tenant_record RECORD;
  config_record RECORD;
BEGIN
  -- Get tenant info
  SELECT * INTO tenant_record
  FROM public.tenants
  WHERE slug = 'hvac-djawara'
  LIMIT 1;
  
  IF tenant_record IS NOT NULL THEN
    -- Get config info
    SELECT * INTO config_record
    FROM public.working_hours_config
    WHERE tenant_id = tenant_record.id
    AND is_active = true
    LIMIT 1;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ MIGRATION 008: TENANT DATA SEEDED!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 Tenant Details:';
    RAISE NOTICE '   ✅ Tenant ID: %', tenant_record.id;
    RAISE NOTICE '   ✅ Slug: %', tenant_record.slug;
    RAISE NOTICE '   ✅ Name: %', tenant_record.name;
    RAISE NOTICE '   ✅ Email: %', tenant_record.contact_email;
    RAISE NOTICE '   ✅ Phone: %', tenant_record.contact_phone;
    RAISE NOTICE '   ✅ Status: %', tenant_record.subscription_status;
    RAISE NOTICE '   ✅ Plan: %', tenant_record.subscription_plan;
    RAISE NOTICE '   ✅ Timezone: %', tenant_record.timezone;
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  Working Hours Config:';
    IF config_record IS NOT NULL THEN
      RAISE NOTICE '   ✅ Work Start: %', config_record.work_start_time;
      RAISE NOTICE '   ✅ Work End: %', config_record.work_end_time;
      RAISE NOTICE '   ✅ Overtime Rate: Rp %/hour', config_record.overtime_rate_per_hour;
      RAISE NOTICE '   ✅ Max Overtime: % hours/day', config_record.max_overtime_hours_per_day;
      RAISE NOTICE '   ✅ Effective From: %', config_record.effective_from;
    ELSE
      RAISE NOTICE '   ⚠️  No working hours config found';
    END IF;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '1. Create owner user via Supabase Dashboard > Authentication';
    RAISE NOTICE '2. Use email: pt.djawara3g@gmail.com';
    RAISE NOTICE '3. Assign owner role in user_tenant_roles table';
    RAISE NOTICE '4. Configure staff and technicians via application';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 All migrations completed successfully!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  ELSE
    RAISE WARNING 'Tenant hvac-djawara not found after seeding';
  END IF;
END $$;

-- ================================================
-- SECTION 4: VALIDATION
-- ================================================
DO $$
DECLARE
  tenant_exists BOOLEAN;
  config_exists BOOLEAN;
BEGIN
  -- Validate tenant exists
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE slug = 'hvac-djawara'
    AND contact_email = 'pt.djawara3g@gmail.com'
    AND subscription_status = 'active'
    AND subscription_plan = 'pro'
  ) INTO tenant_exists;
  
  ASSERT tenant_exists, 
         'HVAC Djawara tenant not found or has incorrect values';
  
  -- Validate config exists
  SELECT EXISTS (
    SELECT 1 FROM public.working_hours_config wc
    JOIN public.tenants t ON wc.tenant_id = t.id
    WHERE t.slug = 'hvac-djawara'
    AND wc.is_active = true
    AND wc.work_start_time = '09:00'::TIME
    AND wc.work_end_time = '17:00'::TIME
    AND wc.overtime_rate_per_hour = 5000.00
    AND wc.max_overtime_hours_per_day = 4.00
  ) INTO config_exists;
  
  ASSERT config_exists, 
         'Working hours config not found or has incorrect values';
  
  RAISE NOTICE '✓ All validations passed';
END $$;
