# Database Schema Documentation

## Overview

This document describes the database schema for the HVAC Djawara scheduling and workforce management system.

## New Tables (5)

### 1. daily_attendance
Track technician daily attendance with clock in/out times

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| technician_id | UUID | Foreign key to profiles |
| date | DATE | Attendance date |
| clock_in_time | TIMESTAMPTZ | When technician clocked in |
| clock_out_time | TIMESTAMPTZ | When technician clocked out |
| work_start_time | TIMESTAMPTZ | Calculated work start (09:00 or actual) |
| work_end_time | TIMESTAMPTZ | Calculated work end (17:00 or actual) |
| total_work_hours | DECIMAL(5,2) | Total working hours |
| is_late | BOOLEAN | Flag if clocked in after 09:00 |
| is_early_leave | BOOLEAN | Flag if left before 17:00 |
| is_auto_checkout | BOOLEAN | Flag if auto-checked out |

### 2. technician_availability
Manage technician availability and daily job capacity

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| technician_id | UUID | Foreign key to profiles |
| date | DATE | Availability date |
| is_available | BOOLEAN | Whether technician is available |
| max_jobs_per_day | INTEGER | Maximum jobs per day (default: 4) |
| reason | TEXT | Reason if unavailable |

### 3. overtime_requests
Track overtime requests with approval workflow

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| technician_id | UUID | Foreign key to profiles |
| job_id | UUID | Foreign key to service_orders |
| request_date | DATE | Date of overtime work |
| reason | TEXT | Reason for overtime |
| estimated_start_time | TIME | Estimated start time |
| estimated_end_time | TIME | Estimated end time |
| estimated_hours | DECIMAL(5,2) | Calculated estimated hours |
| status | TEXT | pending/approved/rejected/completed |
| approved_by | UUID | Manager/coordinator who approved |
| actual_start_time | TIMESTAMPTZ | Actual overtime start |
| actual_end_time | TIMESTAMPTZ | Actual overtime end |
| actual_hours | DECIMAL(5,2) | Actual hours worked |
| billable_hours | DECIMAL(5,2) | Billable hours (min of actual vs estimated) |
| needs_review | BOOLEAN | Flag if actual > estimated |

### 4. order_status_history
Audit trail for service order status changes

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| order_id | UUID | Foreign key to service_orders |
| old_status | order_status | Previous status |
| new_status | order_status | New status |
| changed_by | UUID | User who made change |
| changed_by_role | user_role | Role of user |
| created_at | TIMESTAMPTZ | Change timestamp |

### 5. working_hours_config
Configure working hours and overtime rates per tenant

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants (UNIQUE) |
| work_start_time | TIME | Standard work start time (default: 09:00:00) |
| work_end_time | TIME | Standard work end time (default: 17:00:00) |
| overtime_rate_per_hour | DECIMAL(10,2) | Overtime rate in Rupiah (default: 5000.00) |
| max_overtime_hours_per_day | INTEGER | Max overtime hours per day (default: 4) |

## Enums

### order_type (Extended)
Values: `pemasangan`, `perbaikan`, `perawatan`, `konsultasi`, `pengadaan`

### order_status (Existing)
Values: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`

### user_role (Existing)
Values: `owner`, `admin`, `coordinator`, `tech_head`, `technician`, `sales`

## Views (2)

### v_daily_attendance_summary
Readable summary of daily attendance with status indicators

**Columns:** id, tenant_id, tenant_name, technician_id, technician_name, technician_email, date, clock_in_time, clock_out_time, work_start_time, work_end_time, total_work_hours, is_late, is_early_leave, is_auto_checkout, attendance_status, created_at, updated_at

### v_overtime_summary
Monthly overtime summary per technician with cost calculation

**Columns:** tenant_id, tenant_name, technician_id, technician_name, technician_email, month, total_requests, pending_count, approved_count, rejected_count, completed_count, total_estimated_hours, total_actual_hours, total_billable_hours, total_overtime_cost, needs_review_count

## Functions (4)

### calculate_work_hours()
Auto-calculate work hours and set attendance flags (TRIGGER on daily_attendance)

### calculate_overtime_hours()
Auto-calculate overtime hours and set billable hours (TRIGGER on overtime_requests)

### track_status_change()
Auto-track service order status changes (TRIGGER on service_orders)

### auto_clock_out_forgot_technicians()
Auto clock out technicians who forgot (for cron job)

## Row Level Security (RLS)

All tables have RLS enabled:

- **daily_attendance**: Technicians can view/update own, Admin/Coordinator/Tech_Head can view/manage all
- **overtime_requests**: Technicians can create/view own, Managers can approve/reject, All staff can view approved
- **technician_availability**: Technicians can manage own, Coordinators can manage all, All staff can view
- **order_status_history**: All staff can view (audit trail, trigger-only)
- **working_hours_config**: All staff can view, Only owner can update

## Extended Tables

### service_orders (Extended)
Added columns:
- `sales_id` (UUID) - Sales person who created order
- `actual_start_time` (TIMESTAMPTZ) - Actual start time
- `actual_end_time` (TIMESTAMPTZ) - Actual end time
