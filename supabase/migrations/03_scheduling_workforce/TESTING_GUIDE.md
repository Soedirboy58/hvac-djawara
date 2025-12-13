# Testing Guide - Scheduling & Workforce Management System

## 📋 Overview

This guide provides comprehensive testing procedures to validate the scheduling and workforce management system after migration deployment.

## 🎯 Testing Objectives

1. ✅ Verify all tables are created correctly
2. ✅ Validate triggers are working as expected
3. ✅ Test RLS policies enforce correct access
4. ✅ Verify views return accurate data
5. ✅ Test business logic functions
6. ✅ Validate data integrity constraints

## 🧪 Test Categories

### 1. Schema Validation Tests

#### Test 1.1: Verify Tables Created
```sql
-- Expected: 5 new tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'daily_attendance',
  'technician_availability',
  'order_status_history',
  'working_hours_config',
  'overtime_requests'
)
ORDER BY table_name;

-- ✅ PASS: Should return 5 rows
-- ❌ FAIL: If < 5 rows returned
```

#### Test 1.2: Verify Service Orders Extended
```sql
-- Expected: 3 new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_orders'
AND column_name IN ('sales_id', 'actual_start_time', 'actual_end_time')
ORDER BY column_name;

-- ✅ PASS: Should return 3 rows
-- ❌ FAIL: If < 3 rows returned
```

#### Test 1.3: Verify Enums Extended
```sql
-- Expected: 7 order_type values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_type')
ORDER BY enumsortorder;

-- ✅ PASS: Should include 'konsultasi' and 'pengadaan'
-- ❌ FAIL: If missing new values
```

#### Test 1.4: Verify Indexes Created
```sql
-- Expected: Multiple new indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN (
  'service_orders',
  'daily_attendance',
  'technician_availability',
  'order_status_history',
  'working_hours_config',
  'overtime_requests'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ✅ PASS: Should return 15+ indexes
-- ❌ FAIL: If < 15 indexes
```

### 2. Function & Trigger Tests

#### Test 2.1: Verify Functions Created
```sql
-- Expected: 4 functions
SELECT proname, prokind
FROM pg_proc
WHERE proname IN (
  'calculate_work_hours',
  'calculate_overtime_hours',
  'track_status_change',
  'auto_clock_out_forgot_technicians'
)
ORDER BY proname;

-- ✅ PASS: Should return 4 rows
-- ❌ FAIL: If < 4 rows returned
```

#### Test 2.2: Test Work Hours Calculation Trigger
```sql
-- Setup: Create test attendance
DO $$
DECLARE
  test_tenant_id UUID;
  test_user_id UUID;
  test_attendance_id UUID;
BEGIN
  -- Get tenant and user
  SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  -- Insert attendance with clock in at 10:30 (late)
  INSERT INTO daily_attendance (
    tenant_id, 
    user_id, 
    attendance_date, 
    clock_in_time
  )
  VALUES (
    test_tenant_id,
    test_user_id,
    CURRENT_DATE,
    (CURRENT_DATE || ' 10:30:00')::TIMESTAMPTZ
  )
  RETURNING id INTO test_attendance_id;
  
  -- Verify trigger calculated fields
  PERFORM * FROM daily_attendance
  WHERE id = test_attendance_id
  AND is_late = true
  AND work_start_time::TIME = clock_in_time::TIME;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Work hours calculation trigger working correctly';
  ELSE
    RAISE EXCEPTION '❌ Work hours calculation trigger failed';
  END IF;
  
  -- Cleanup
  DELETE FROM daily_attendance WHERE id = test_attendance_id;
END $$;
```

#### Test 2.3: Test Overtime Calculation Trigger
```sql
-- Setup: Create test overtime request
DO $$
DECLARE
  test_tenant_id UUID;
  test_user_id UUID;
  test_request_id UUID;
  calculated_hours DECIMAL;
BEGIN
  -- Get tenant and user
  SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
  SELECT id INTO test_user_id FROM profiles WHERE id IN (
    SELECT user_id FROM user_tenant_roles 
    WHERE role = 'technician' LIMIT 1
  );
  
  IF test_user_id IS NULL THEN
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
  END IF;
  
  -- Insert overtime request
  INSERT INTO overtime_requests (
    tenant_id,
    user_id,
    reason,
    estimated_start_time,
    estimated_end_time
  )
  VALUES (
    test_tenant_id,
    test_user_id,
    'Test overtime calculation',
    NOW(),
    NOW() + INTERVAL '2 hours'
  )
  RETURNING id, estimated_hours INTO test_request_id, calculated_hours;
  
  -- Verify trigger calculated estimated_hours
  IF calculated_hours BETWEEN 1.9 AND 2.1 THEN
    RAISE NOTICE '✅ Overtime calculation trigger working correctly (% hours)', calculated_hours;
  ELSE
    RAISE EXCEPTION '❌ Overtime calculation failed: expected ~2 hours, got %', calculated_hours;
  END IF;
  
  -- Cleanup
  DELETE FROM overtime_requests WHERE id = test_request_id;
END $$;
```

#### Test 2.4: Test Status Change Tracking Trigger
```sql
-- Setup: Update service order status
DO $$
DECLARE
  test_order_id UUID;
  history_count INT;
BEGIN
  -- Get a test order
  SELECT id INTO test_order_id FROM service_orders LIMIT 1;
  
  IF test_order_id IS NOT NULL THEN
    -- Update status
    UPDATE service_orders
    SET status = 'in_progress'
    WHERE id = test_order_id;
    
    -- Check history was created
    SELECT COUNT(*) INTO history_count
    FROM order_status_history
    WHERE service_order_id = test_order_id;
    
    IF history_count > 0 THEN
      RAISE NOTICE '✅ Status change tracking trigger working correctly';
    ELSE
      RAISE EXCEPTION '❌ Status change tracking trigger failed';
    END IF;
  ELSE
    RAISE NOTICE '⊘ No service orders found to test status tracking';
  END IF;
END $$;
```

### 3. RLS Policy Tests

#### Test 3.1: Test Daily Attendance RLS
```sql
-- Test as technician (should see own only)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "technician-user-id"}';

SELECT COUNT(*) as my_attendance_count
FROM daily_attendance
WHERE user_id = auth.uid();

-- ✅ PASS: Should return count of own attendance only
-- ❌ FAIL: If can see other users' attendance

RESET ROLE;
```

#### Test 3.2: Test Overtime Requests RLS
```sql
-- Test technician can create request
SET LOCAL ROLE authenticated;
-- Simulate technician context

-- Should succeed
INSERT INTO overtime_requests (
  tenant_id,
  user_id,
  reason,
  estimated_start_time,
  estimated_end_time,
  status
)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'hvac-djawara'),
  auth.uid(),
  'Test request',
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  'pending'
);

-- ✅ PASS: Insert succeeds
-- ❌ FAIL: Permission denied error

RESET ROLE;
```

#### Test 3.3: Test Order Status History (Read-Only)
```sql
-- Test cannot insert manually
BEGIN;
  -- Should fail
  INSERT INTO order_status_history (
    tenant_id,
    service_order_id,
    new_status
  )
  VALUES (
    (SELECT id FROM tenants LIMIT 1),
    (SELECT id FROM service_orders LIMIT 1),
    'completed'
  );
  
  -- ❌ PASS: Should get permission denied error
  -- ✅ FAIL: If insert succeeds (policy not working)
ROLLBACK;
```

### 4. View Tests

#### Test 4.1: Test Daily Attendance Summary View
```sql
-- Should return formatted attendance data
SELECT *
FROM v_daily_attendance_summary
ORDER BY attendance_date DESC
LIMIT 5;

-- ✅ PASS: Returns rows with status indicators
-- ❌ FAIL: Error or no data when attendance exists
```

#### Test 4.2: Test Overtime Summary View
```sql
-- Should return monthly summary per technician
SELECT *
FROM v_overtime_summary
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
ORDER BY month DESC, technician_name;

-- ✅ PASS: Returns aggregated overtime data
-- ❌ FAIL: Error or incorrect calculations
```

#### Test 4.3: Test Technician Daily Summary View
```sql
-- Should return combined daily view
SELECT *
FROM v_technician_daily_summary
WHERE work_date = CURRENT_DATE
ORDER BY technician_name;

-- ✅ PASS: Returns combined data from multiple tables
-- ❌ FAIL: Error or missing columns
```

### 5. Business Logic Tests

#### Test 5.1: Test Late Detection
```sql
-- Clock in after 09:00 should be marked as late
DO $$
DECLARE
  test_tenant_id UUID;
  test_user_id UUID;
  is_late_flag BOOLEAN;
BEGIN
  SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  INSERT INTO daily_attendance (
    tenant_id, user_id, attendance_date, clock_in_time
  )
  VALUES (
    test_tenant_id,
    test_user_id,
    CURRENT_DATE - INTERVAL '1 day',
    (CURRENT_DATE - INTERVAL '1 day' || ' 09:30:00')::TIMESTAMPTZ
  )
  RETURNING is_late INTO is_late_flag;
  
  IF is_late_flag = true THEN
    RAISE NOTICE '✅ Late detection working correctly';
  ELSE
    RAISE EXCEPTION '❌ Late detection failed';
  END IF;
  
  DELETE FROM daily_attendance 
  WHERE user_id = test_user_id 
  AND attendance_date = CURRENT_DATE - INTERVAL '1 day';
END $$;
```

#### Test 5.2: Test Overtime Billable Hours Logic
```sql
-- Test: Actual > Estimated should flag for review
DO $$
DECLARE
  test_tenant_id UUID;
  test_user_id UUID;
  test_request_id UUID;
  needs_review_flag BOOLEAN;
  billable DECIMAL;
BEGIN
  SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  -- Create request with 2 hour estimate
  INSERT INTO overtime_requests (
    tenant_id, user_id, reason,
    estimated_start_time, estimated_end_time
  )
  VALUES (
    test_tenant_id, test_user_id, 'Test billable calculation',
    NOW(), NOW() + INTERVAL '2 hours'
  )
  RETURNING id INTO test_request_id;
  
  -- Set actual to 3 hours (exceeds estimate)
  UPDATE overtime_requests
  SET 
    actual_start_time = NOW(),
    actual_end_time = NOW() + INTERVAL '3 hours'
  WHERE id = test_request_id
  RETURNING needs_review, billable_hours INTO needs_review_flag, billable;
  
  IF needs_review_flag = true AND billable BETWEEN 1.9 AND 2.1 THEN
    RAISE NOTICE '✅ Billable hours calculation working correctly';
    RAISE NOTICE '   Actual exceeded estimate, flagged for review';
    RAISE NOTICE '   Billable hours capped at estimate: %', billable;
  ELSE
    RAISE EXCEPTION '❌ Billable hours calculation failed';
  END IF;
  
  DELETE FROM overtime_requests WHERE id = test_request_id;
END $$;
```

#### Test 5.3: Test Auto Clock-Out Function
```sql
-- Test auto clock-out function
DO $$
DECLARE
  test_tenant_id UUID;
  test_user_id UUID;
  affected_rows INT;
BEGIN
  SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  -- Create attendance from yesterday without clock out
  INSERT INTO daily_attendance (
    tenant_id, user_id, attendance_date, clock_in_time
  )
  VALUES (
    test_tenant_id,
    test_user_id,
    CURRENT_DATE - INTERVAL '1 day',
    (CURRENT_DATE - INTERVAL '1 day' || ' 09:00:00')::TIMESTAMPTZ
  );
  
  -- Run auto clock-out function
  SELECT COUNT(*) INTO affected_rows
  FROM auto_clock_out_forgot_technicians();
  
  -- Verify clock_out_time was set
  PERFORM * FROM daily_attendance
  WHERE user_id = test_user_id
  AND attendance_date = CURRENT_DATE - INTERVAL '1 day'
  AND clock_out_time IS NOT NULL
  AND is_auto_checkout = true;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Auto clock-out function working correctly';
    RAISE NOTICE '   Affected rows: %', affected_rows;
  ELSE
    RAISE EXCEPTION '❌ Auto clock-out function failed';
  END IF;
  
  DELETE FROM daily_attendance 
  WHERE user_id = test_user_id 
  AND attendance_date = CURRENT_DATE - INTERVAL '1 day';
END $$;
```

### 6. Data Integrity Tests

#### Test 6.1: Test Unique Constraints
```sql
-- Should prevent duplicate attendance for same user/date
BEGIN;
  DO $$
  DECLARE
    test_tenant_id UUID;
    test_user_id UUID;
  BEGIN
    SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    -- First insert should succeed
    INSERT INTO daily_attendance (tenant_id, user_id, attendance_date, clock_in_time)
    VALUES (test_tenant_id, test_user_id, CURRENT_DATE, NOW());
    
    -- Second insert should fail
    INSERT INTO daily_attendance (tenant_id, user_id, attendance_date, clock_in_time)
    VALUES (test_tenant_id, test_user_id, CURRENT_DATE, NOW());
    
    RAISE EXCEPTION '❌ Unique constraint not working - duplicate allowed';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✅ Unique constraint working correctly';
  END $$;
ROLLBACK;
```

#### Test 6.2: Test Check Constraints
```sql
-- Test clock_out must be after clock_in
BEGIN;
  DO $$
  DECLARE
    test_tenant_id UUID;
    test_user_id UUID;
  BEGIN
    SELECT id INTO test_tenant_id FROM tenants WHERE slug = 'hvac-djawara';
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    -- Should fail - clock_out before clock_in
    INSERT INTO daily_attendance (
      tenant_id, user_id, attendance_date, 
      clock_in_time, clock_out_time
    )
    VALUES (
      test_tenant_id, test_user_id, CURRENT_DATE,
      NOW(), NOW() - INTERVAL '1 hour'
    );
    
    RAISE EXCEPTION '❌ Check constraint not working - invalid times allowed';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✅ Check constraint working correctly';
  END $$;
ROLLBACK;
```

### 7. Tenant Seeding Test

#### Test 7.1: Verify HVAC Djawara Tenant
```sql
-- Should find HVAC Djawara tenant with correct details
SELECT 
  slug,
  name,
  contact_email,
  contact_phone,
  subscription_status,
  subscription_plan,
  timezone,
  is_active
FROM tenants
WHERE slug = 'hvac-djawara';

-- ✅ PASS: Returns 1 row with correct data
-- ❌ FAIL: No row or incorrect data
```

#### Test 7.2: Verify Working Hours Config
```sql
-- Should find working hours config for HVAC Djawara
SELECT 
  t.slug,
  wc.work_start_time,
  wc.work_end_time,
  wc.overtime_rate_per_hour,
  wc.max_overtime_hours_per_day,
  wc.is_active
FROM working_hours_config wc
JOIN tenants t ON wc.tenant_id = t.id
WHERE t.slug = 'hvac-djawara'
AND wc.is_active = true;

-- ✅ PASS: Returns config with correct values
-- Expected: 09:00-17:00, Rp 5000/hr, 4hr max
-- ❌ FAIL: No config or incorrect values
```

## 📊 Test Results Template

```
╔════════════════════════════════════════════════════════╗
║  TEST RESULTS - Scheduling & Workforce Management      ║
╚════════════════════════════════════════════════════════╝

Date: _______________
Tester: _______________
Environment: _______________

Schema Validation Tests:
  ☐ 1.1 Tables Created          [PASS / FAIL]
  ☐ 1.2 Service Orders Extended [PASS / FAIL]
  ☐ 1.3 Enums Extended         [PASS / FAIL]
  ☐ 1.4 Indexes Created        [PASS / FAIL]

Function & Trigger Tests:
  ☐ 2.1 Functions Created      [PASS / FAIL]
  ☐ 2.2 Work Hours Trigger     [PASS / FAIL]
  ☐ 2.3 Overtime Trigger       [PASS / FAIL]
  ☐ 2.4 Status Tracking        [PASS / FAIL]

RLS Policy Tests:
  ☐ 3.1 Attendance RLS         [PASS / FAIL]
  ☐ 3.2 Overtime RLS           [PASS / FAIL]
  ☐ 3.3 History Read-Only      [PASS / FAIL]

View Tests:
  ☐ 4.1 Attendance Summary     [PASS / FAIL]
  ☐ 4.2 Overtime Summary       [PASS / FAIL]
  ☐ 4.3 Daily Summary          [PASS / FAIL]

Business Logic Tests:
  ☐ 5.1 Late Detection         [PASS / FAIL]
  ☐ 5.2 Billable Hours         [PASS / FAIL]
  ☐ 5.3 Auto Clock-Out         [PASS / FAIL]

Data Integrity Tests:
  ☐ 6.1 Unique Constraints     [PASS / FAIL]
  ☐ 6.2 Check Constraints      [PASS / FAIL]

Tenant Seeding Tests:
  ☐ 7.1 Tenant Created         [PASS / FAIL]
  ☐ 7.2 Config Created         [PASS / FAIL]

OVERALL RESULT: [PASS / FAIL]
Notes: _______________________________________________
______________________________________________________
```

## 🚨 Common Issues & Solutions

### Issue: Trigger not firing
**Solution:** Check trigger is enabled and function exists:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE '%calculate%';
```

### Issue: RLS blocking operations
**Solution:** Temporarily disable for testing:
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Run tests
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Issue: View returns no data
**Solution:** Check underlying tables have data and RLS allows access.

## 📝 Next Steps After Testing

1. ✅ Document any issues found
2. ✅ Fix critical bugs immediately
3. ✅ Log non-critical issues for future improvement
4. ✅ Update application code to use new schema
5. ✅ Test UI integration
6. ✅ Train staff on new features
7. ✅ Monitor production usage

---

**Version:** 1.0.0  
**Date:** 2025-12-13  
**Author:** System Architect
