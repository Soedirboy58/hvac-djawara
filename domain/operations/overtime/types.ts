// Types for Overtime Management

export interface OvertimeRequest {
  id: string;
  tenant_id: string;
  technician_id: string;
  order_id: string | null;
  request_date: string;
  work_date: string;
  estimated_hours: number;
  actual_hours: number | null;
  billable_hours: number | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface OvertimeSummary {
  tenant_id: string;
  tenant_name: string;
  technician_id: string;
  technician_name: string;
  month: string;
  total_requests: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  completed_count: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  total_billable_hours: number;
  total_overtime_cost: number;
  needs_review_count: number;
}

export interface OvertimeRequestInput {
  order_id?: string;
  work_date: string;
  estimated_hours: number;
  reason: string;
}

export interface OvertimeApprovalInput {
  status: 'approved' | 'rejected';
  rejection_reason?: string;
}
