// Types for Attendance Management

export interface DailyAttendance {
  id: string;
  tenant_id: string;
  technician_id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  work_start_time: string | null;
  work_end_time: string | null;
  total_work_hours: number | null;
  is_late: boolean;
  is_early_leave: boolean;
  is_auto_checkout: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary extends DailyAttendance {
  tenant_name: string;
  technician_name: string;
  attendance_status: 'Absent' | 'Auto Checkout (Forgot)' | 'Late & Early Leave' | 'Late' | 'Early Leave' | 'On Time';
}

export interface WorkingHoursConfig {
  id: string;
  tenant_id: string;
  work_start_time: string; // HH:MM:SS
  work_end_time: string; // HH:MM:SS
  overtime_rate_per_hour: number;
  late_tolerance_minutes: number;
  early_leave_tolerance_minutes: number;
  auto_checkout_time: string; // HH:MM:SS
  created_at: string;
  updated_at: string;
}

export interface ClockInRequest {
  tenant_id: string;
  technician_id: string;
  notes?: string;
}

export interface ClockOutRequest {
  attendance_id: string;
  notes?: string;
}
