-- Create test user for HVAC Djawara
-- Email: admin@hvacdjawara.com
-- Password: Admin123!

-- Step 1: Insert auth user (run this in Supabase SQL Editor)
-- NOTE: Password hash below is for: Admin123!
-- Generated using: SELECT crypt('Admin123!', gen_salt('bf'))

-- Delete existing user if exists
DELETE FROM auth.users WHERE email = 'admin@hvacdjawara.com';

INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'admin@hvacdjawara.com',
    '$2a$10$aRWvPXZ8jq0qGqP.JqH0KeJ5gPmF7Y4MoN7dQxJV8Zb6RxK.lH/DO', -- Admin123!
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin HVAC Djawara"}',
    false,
    'authenticated',
    'authenticated'
);

-- Step 2: Insert into identities table
INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object(
        'sub', '11111111-1111-1111-1111-111111111111',
        'email', 'admin@hvacdjawara.com'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
);

-- Step 3: Profile will be auto-created by trigger, then update it
UPDATE profiles
SET full_name = 'Admin HVAC Djawara',
    phone = '081234567890'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- Step 4: Assign owner role to HVAC Djawara tenant
DELETE FROM user_tenant_roles 
WHERE user_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO user_tenant_roles (
    user_id,
    tenant_id,
    role
)
SELECT 
    '11111111-1111-1111-1111-111111111111',
    id,
    'owner'
FROM tenants
WHERE slug = 'hvac-djawara';

-- Verify
SELECT 
    u.email,
    p.full_name,
    t.name as tenant_name,
    utr.role
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN user_tenant_roles utr ON u.id = utr.user_id
JOIN tenants t ON utr.tenant_id = t.id
WHERE u.email = 'admin@hvacdjawara.com';
