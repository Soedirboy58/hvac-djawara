-- Migration: Create database views
-- Description: Views for attendance summary and overtime summary

-- A. Daily Attendance Summary View
CREATE OR REPLACE VIEW v_daily_attendance_summary AS
SELECT 
    da.id,
    da.tenant_id,
    t.name as tenant_name,
    da.technician_id,
    p.full_name as technician_name,
    da.date,
    da.clock_in_time,
    da.clock_out_time,
    da.work_start_time,
    da.work_end_time,
    da.total_work_hours,
    da.is_late,
    da.is_early_leave,
    da.is_auto_checkout,
    da.notes,
    CASE 
        WHEN da.clock_in_time IS NULL THEN 'Absent'
        WHEN da.is_auto_checkout THEN 'Auto Checkout (Forgot)'
        WHEN da.is_late AND da.is_early_leave THEN 'Late & Early Leave'
        WHEN da.is_late THEN 'Late'
        WHEN da.is_early_leave THEN 'Early Leave'
        ELSE 'On Time'
    END as attendance_status,
    da.created_at,
    da.updated_at
FROM daily_attendance da
JOIN profiles p ON da.technician_id = p.id
JOIN tenants t ON da.tenant_id = t.id
ORDER BY da.date DESC, p.full_name;

COMMENT ON VIEW v_daily_attendance_summary IS 'Readable summary of daily attendance with status indicators';

-- B. Overtime Summary View
CREATE OR REPLACE VIEW v_overtime_summary AS
SELECT 
    ot.tenant_id,
    t.name as tenant_name,
    ot.technician_id,
    p.full_name as technician_name,
    DATE_TRUNC('month', ot.request_date) as month,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE ot.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE ot.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE ot.status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE ot.status = 'completed') as completed_count,
    COALESCE(SUM(ot.estimated_hours) FILTER (WHERE ot.status IN ('approved', 'completed')), 0) as total_estimated_hours,
    COALESCE(SUM(ot.actual_hours) FILTER (WHERE ot.status = 'completed'), 0) as total_actual_hours,
    COALESCE(SUM(ot.billable_hours) FILTER (WHERE ot.status = 'completed'), 0) as total_billable_hours,
    COALESCE(SUM(ot.billable_hours * whc.overtime_rate_per_hour) FILTER (WHERE ot.status = 'completed'), 0) as total_overtime_cost,
    COUNT(*) FILTER (WHERE ot.needs_review = true) as needs_review_count
FROM overtime_requests ot
JOIN profiles p ON ot.technician_id = p.id
JOIN tenants t ON ot.tenant_id = t.id
LEFT JOIN working_hours_config whc ON ot.tenant_id = whc.tenant_id
GROUP BY 
    ot.tenant_id,
    t.name,
    ot.technician_id,
    p.full_name,
    DATE_TRUNC('month', ot.request_date),
    whc.overtime_rate_per_hour
ORDER BY month DESC, p.full_name;

COMMENT ON VIEW v_overtime_summary IS 'Monthly overtime summary per technician with cost calculation';
