-- ============================================
-- Migration: Create Reporting Views
-- Purpose: Views for attendance summary and overtime summary
-- Domain: Scheduling & Workforce Management
-- Dependencies: daily_attendance, overtime_requests, profiles
-- Author: System Architect
-- Date: 2025-12-13
-- Version: 1.0.0
-- ============================================

-- ================================================
-- VIEW 1: Daily Attendance Summary
-- ================================================
DROP VIEW IF EXISTS public.v_daily_attendance_summary CASCADE;

CREATE OR REPLACE VIEW public.v_daily_attendance_summary AS
SELECT
  da.id,
  da.tenant_id,
  da.user_id,
  p.full_name as technician_name,
  p.email as technician_email,
  da.attendance_date,
  da.clock_in_time,
  da.clock_out_time,
  da.work_start_time,
  da.work_end_time,
  da.total_work_hours,
  da.is_late,
  da.is_early_leave,
  da.is_auto_checkout,
  da.notes,
  -- Status indicator
  CASE
    WHEN da.clock_out_time IS NULL THEN 'working'
    WHEN da.is_late AND da.is_early_leave THEN 'late_and_early'
    WHEN da.is_late THEN 'late'
    WHEN da.is_early_leave THEN 'early_leave'
    WHEN da.is_auto_checkout THEN 'auto_checkout'
    ELSE 'normal'
  END as attendance_status,
  -- Clock in status
  CASE
    WHEN da.clock_in_time IS NULL THEN NULL
    WHEN da.is_late THEN 'Late: ' || 
      TO_CHAR(da.clock_in_time::TIME, 'HH24:MI')
    ELSE 'On Time'
  END as clock_in_status,
  -- Clock out status
  CASE
    WHEN da.clock_out_time IS NULL THEN 'Not clocked out'
    WHEN da.is_auto_checkout THEN 'Auto clocked out'
    WHEN da.is_early_leave THEN 'Early leave: ' || 
      TO_CHAR(da.clock_out_time::TIME, 'HH24:MI')
    ELSE 'On Time'
  END as clock_out_status,
  da.created_at,
  da.updated_at
FROM public.daily_attendance da
JOIN public.profiles p ON da.user_id = p.id
ORDER BY da.attendance_date DESC, da.clock_in_time DESC;

COMMENT ON VIEW public.v_daily_attendance_summary IS 
'Daily attendance summary with status indicators.
Shows technician attendance with late, early leave, and auto checkout flags.
Includes human-readable status indicators for easy reporting.';

RAISE NOTICE '✓ Created v_daily_attendance_summary view';

-- ================================================
-- VIEW 2: Overtime Summary (Monthly per Technician)
-- ================================================
DROP VIEW IF EXISTS public.v_overtime_summary CASCADE;

CREATE OR REPLACE VIEW public.v_overtime_summary AS
SELECT
  DATE_TRUNC('month', or_req.request_date) as month,
  or_req.tenant_id,
  or_req.user_id,
  p.full_name as technician_name,
  p.email as technician_email,
  -- Request counts
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE or_req.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE or_req.status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE or_req.status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE or_req.status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE or_req.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE or_req.status = 'needs_review') as needs_review_count,
  -- Hours summary
  SUM(or_req.estimated_hours) as total_estimated_hours,
  SUM(or_req.actual_hours) as total_actual_hours,
  SUM(or_req.billable_hours) as total_billable_hours,
  -- Cost summary
  AVG(or_req.overtime_rate) as avg_overtime_rate,
  SUM(or_req.total_cost) as total_cost,
  -- Efficiency metrics
  CASE 
    WHEN SUM(or_req.estimated_hours) > 0 THEN
      ROUND((SUM(or_req.actual_hours) / SUM(or_req.estimated_hours)) * 100, 2)
    ELSE NULL
  END as efficiency_percentage, -- actual vs estimated
  -- Approval metrics
  CASE
    WHEN COUNT(*) > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE or_req.status = 'approved') * 100.0) / COUNT(*), 2)
    ELSE NULL
  END as approval_rate_percentage
FROM public.overtime_requests or_req
JOIN public.profiles p ON or_req.user_id = p.id
GROUP BY 
  DATE_TRUNC('month', or_req.request_date),
  or_req.tenant_id,
  or_req.user_id,
  p.full_name,
  p.email
ORDER BY month DESC, technician_name;

COMMENT ON VIEW public.v_overtime_summary IS 
'Monthly overtime summary per technician.
Shows request counts by status, hours worked, total cost, and efficiency metrics.
Useful for payroll processing and performance analysis.';

RAISE NOTICE '✓ Created v_overtime_summary view';

-- ================================================
-- VIEW 3: Technician Daily Summary (Combined)
-- ================================================
DROP VIEW IF EXISTS public.v_technician_daily_summary CASCADE;

CREATE OR REPLACE VIEW public.v_technician_daily_summary AS
SELECT
  COALESCE(da.attendance_date, ta.availability_date) as work_date,
  COALESCE(da.tenant_id, ta.tenant_id) as tenant_id,
  COALESCE(da.user_id, ta.user_id) as user_id,
  p.full_name as technician_name,
  -- Attendance info
  da.clock_in_time,
  da.clock_out_time,
  da.total_work_hours,
  da.is_late,
  da.is_early_leave,
  da.is_auto_checkout,
  -- Availability info
  ta.is_available,
  ta.max_jobs,
  ta.current_jobs,
  ta.unavailable_reason,
  -- Job load percentage
  CASE
    WHEN ta.max_jobs > 0 THEN
      ROUND((ta.current_jobs * 100.0) / ta.max_jobs, 2)
    ELSE NULL
  END as job_load_percentage,
  -- Overtime info for the day
  COUNT(ot.id) as overtime_requests_count,
  SUM(ot.billable_hours) as overtime_hours,
  SUM(ot.total_cost) as overtime_cost
FROM public.profiles p
LEFT JOIN public.daily_attendance da ON p.id = da.user_id
LEFT JOIN public.technician_availability ta ON p.id = ta.user_id 
  AND (da.attendance_date = ta.availability_date OR da.attendance_date IS NULL)
LEFT JOIN public.overtime_requests ot ON p.id = ot.user_id 
  AND ot.request_date = COALESCE(da.attendance_date, ta.availability_date)
  AND ot.status IN ('approved', 'in_progress', 'completed', 'needs_review')
WHERE 
  da.attendance_date IS NOT NULL OR ta.availability_date IS NOT NULL
GROUP BY
  COALESCE(da.attendance_date, ta.availability_date),
  COALESCE(da.tenant_id, ta.tenant_id),
  COALESCE(da.user_id, ta.user_id),
  p.full_name,
  da.clock_in_time,
  da.clock_out_time,
  da.total_work_hours,
  da.is_late,
  da.is_early_leave,
  da.is_auto_checkout,
  ta.is_available,
  ta.max_jobs,
  ta.current_jobs,
  ta.unavailable_reason
ORDER BY work_date DESC, technician_name;

COMMENT ON VIEW public.v_technician_daily_summary IS 
'Combined daily summary showing attendance, availability, and overtime.
Provides complete picture of technician work status per day.
Shows job load, work hours, and overtime for each day.';

RAISE NOTICE '✓ Created v_technician_daily_summary view';

-- ================================================
-- GRANT PERMISSIONS ON VIEWS
-- ================================================
-- Views inherit permissions from underlying tables via RLS
-- But we need to grant SELECT permission to authenticated users

GRANT SELECT ON public.v_daily_attendance_summary TO authenticated;
GRANT SELECT ON public.v_overtime_summary TO authenticated;
GRANT SELECT ON public.v_technician_daily_summary TO authenticated;

RAISE NOTICE '✓ Granted SELECT permissions on views to authenticated users';

-- ================================================
-- VALIDATION
-- ================================================
DO $$
DECLARE
  view_count INT;
BEGIN
  -- Check views created
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name IN (
    'v_daily_attendance_summary',
    'v_overtime_summary',
    'v_technician_daily_summary'
  );
  
  ASSERT view_count = 3, 
         'Expected 3 views, found ' || view_count;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION 007: VIEWS CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   ✅ Views created: %', view_count;
  RAISE NOTICE '   ✅ v_daily_attendance_summary';
  RAISE NOTICE '   ✅ v_overtime_summary';
  RAISE NOTICE '   ✅ v_technician_daily_summary';
  RAISE NOTICE '   ✅ SELECT permissions granted';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
