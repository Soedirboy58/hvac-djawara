import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  tenantId: string;
};

type TechnicianRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  availability_status: string;
  total_jobs_completed: number;
  average_rating: number;
  last_login_at: string | null;
  created_at: string;
};

type ServiceOrderRow = {
  id: string;
  assigned_to: string | null;
};

function safeNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    if (!body?.tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const tenantId = body.tenantId;

    const { data: roleRow, error: roleError } = await supabase
      .from("user_tenant_roles")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    if (!roleRow || !["owner", "admin_finance", "admin_logistic", "tech_head"].includes(roleRow.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: technicians, error: techError } = await admin
      .from("technicians")
      .select(
        "id, tenant_id, user_id, full_name, email, phone, role, status, availability_status, total_jobs_completed, average_rating, last_login_at, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true });

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    const techRows = (technicians || []) as TechnicianRow[];

    // --- A) New technician system (technicians.id based) ---

    // NOTE: In production data, `work_order_assignments.status` is not always updated to "completed"
    // when the related `service_orders.status` becomes "completed".
    // To match the technician dashboard, count completed jobs based on `service_orders.status`.
    const { data: assignmentsData } = await admin
      .from("work_order_assignments")
      .select(
        "technician_id, service_order_id, status, role_in_order, service_orders!inner(tenant_id, status)"
      )
      .eq("service_orders.tenant_id", tenantId)
      .eq("service_orders.status", "completed");

    const assignments = (assignmentsData || []) as Array<{
      technician_id: string;
      service_order_id: string;
      status: string;
      role_in_order?: string | null;
      service_orders?: { status?: string } | Array<{ status?: string }>;
    }>;

    const completedOrderIdsByTechId = new Map<string, Set<string>>();

    for (const a of assignments) {
      // Already filtered by service_orders.status = completed, but keep a defensive check.
      const joinedStatus = Array.isArray(a.service_orders)
        ? a.service_orders?.[0]?.status
        : a.service_orders?.status;

      if (joinedStatus !== "completed") continue;

      if (!completedOrderIdsByTechId.has(a.technician_id)) {
        completedOrderIdsByTechId.set(a.technician_id, new Set());
      }
      completedOrderIdsByTechId.get(a.technician_id)!.add(a.service_order_id);
    }

    // --- B) Existing workflow (profiles/auth uid based) ---
    // Many existing orders are tracked via service_orders.assigned_to + job_assignments,
    // so we must count completed jobs using those sources too.
    const { data: completedServiceOrdersData, error: completedOrdersError } = await admin
      .from("service_orders")
      .select("id, assigned_to")
      .eq("tenant_id", tenantId)
      .eq("status", "completed");

    if (completedOrdersError) {
      return NextResponse.json({ error: completedOrdersError.message }, { status: 500 });
    }

    const completedServiceOrders = (completedServiceOrdersData || []) as ServiceOrderRow[];
    const completedOrderIds = completedServiceOrders.map((o) => o.id);

    const completedOrderIdsByUserId = new Map<string, Set<string>>();
    const orderIdToAssignedUserId = new Map<string, string>();

    for (const o of completedServiceOrders) {
      if (!o.assigned_to) continue;
      orderIdToAssignedUserId.set(o.id, o.assigned_to);
      if (!completedOrderIdsByUserId.has(o.assigned_to)) {
        completedOrderIdsByUserId.set(o.assigned_to, new Set());
      }
      completedOrderIdsByUserId.get(o.assigned_to)!.add(o.id);
    }

    if (completedOrderIds.length > 0) {
      const { data: jobAssignmentsData } = await admin
        .from("job_assignments")
        .select("service_order_id, user_id")
        .in("service_order_id", completedOrderIds);

      const jobAssignments = (jobAssignmentsData || []) as Array<{ service_order_id: string; user_id: string }>;
      for (const ja of jobAssignments) {
        if (!completedOrderIdsByUserId.has(ja.user_id)) {
          completedOrderIdsByUserId.set(ja.user_id, new Set());
        }
        completedOrderIdsByUserId.get(ja.user_id)!.add(ja.service_order_id);
      }
    }

    // Complaints attribution (prefer service_orders.assigned_to, fallback to job_assignments)
    const complaintsByUserId = new Map<string, number>();
    const complaintsByTechId = new Map<string, number>();

    const { data: complaintsTenantData, error: complaintsTenantError } = await admin
      .from("complaints")
      .select("service_order_id, service_orders!inner(tenant_id, assigned_to)")
      .eq("service_orders.tenant_id", tenantId);

    if (complaintsTenantError) {
      // Non-fatal for performance page; keep zero counts
      console.warn("complaints query error:", complaintsTenantError);
    } else {
      const complaints = (complaintsTenantData || []) as unknown as Array<{
        service_order_id: string;
        service_orders: Array<{ assigned_to: string | null }>;
      }>;

      // Preload job_assignments per order for fallback
      const complaintOrderIds = Array.from(new Set(complaints.map((c) => c.service_order_id)));
      const orderIdToUsers = new Map<string, Set<string>>();
      if (complaintOrderIds.length > 0) {
        const { data: jaAllData } = await admin
          .from("job_assignments")
          .select("service_order_id, user_id")
          .in("service_order_id", complaintOrderIds);
        const jaAll = (jaAllData || []) as Array<{ service_order_id: string; user_id: string }>;
        for (const ja of jaAll) {
          if (!orderIdToUsers.has(ja.service_order_id)) orderIdToUsers.set(ja.service_order_id, new Set());
          orderIdToUsers.get(ja.service_order_id)!.add(ja.user_id);
        }
      }

      for (const c of complaints) {
        const orderId = c.service_order_id;
        const assignedTo = c.service_orders?.[0]?.assigned_to ?? null;

        if (assignedTo) {
          complaintsByUserId.set(assignedTo, (complaintsByUserId.get(assignedTo) || 0) + 1);
          continue;
        }

        const users = orderIdToUsers.get(orderId);
        if (!users) continue;
        for (const userId of users) {
          complaintsByUserId.set(userId, (complaintsByUserId.get(userId) || 0) + 1);
        }
      }
    }

    const techUserIds = techRows.map((t) => t.user_id).filter(Boolean) as string[];
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sinceDate = since.toISOString().slice(0, 10);

    const attendanceByUser = new Map<string, { present: number; late: number }>();

    if (techUserIds.length > 0) {
      const { data: attendanceData, error: attendanceError } = await admin
        .from("daily_attendance")
        .select("technician_id, clock_in_time, is_late, date")
        .eq("tenant_id", tenantId)
        .gte("date", sinceDate)
        .in("technician_id", techUserIds);

      if (!attendanceError && attendanceData) {
        const rows = attendanceData as Array<{
          technician_id: string;
          clock_in_time: string | null;
          is_late: boolean | null;
        }>;
        for (const r of rows) {
          const current = attendanceByUser.get(r.technician_id) || { present: 0, late: 0 };
          if (r.clock_in_time) current.present += 1;
          if (r.is_late) current.late += 1;
          attendanceByUser.set(r.technician_id, current);
        }
      }
    }

    const overtimeByUser = new Map<string, number>();
    if (techUserIds.length > 0) {
      const { data: overtimeData, error: overtimeError } = await admin
        .from("overtime_requests")
        .select("technician_id, actual_hours, status, request_date")
        .eq("tenant_id", tenantId)
        .gte("request_date", sinceDate)
        .in("technician_id", techUserIds);

      if (!overtimeError && overtimeData) {
        const rows = overtimeData as Array<{ technician_id: string; actual_hours: number | null; status: string }>;
        for (const r of rows) {
          if (r.status !== "completed") continue;
          overtimeByUser.set(
            r.technician_id,
            (overtimeByUser.get(r.technician_id) || 0) + safeNumber(r.actual_hours)
          );
        }
      }
    }

    const rows = techRows.map((t) => {
      const orderIdsSet = new Set<string>();
      const completedByTech = completedOrderIdsByTechId.get(t.id);
      if (completedByTech) {
        for (const oid of completedByTech) orderIdsSet.add(oid);
      }

      if (t.user_id) {
        const completedByUser = completedOrderIdsByUserId.get(t.user_id);
        if (completedByUser) {
          for (const oid of completedByUser) orderIdsSet.add(oid);
        }
      }

      const completedJobs = orderIdsSet.size;

      const complaints =
        (t.user_id ? complaintsByUserId.get(t.user_id) || 0 : 0) + (complaintsByTechId.get(t.id) || 0);
      const attendance = t.user_id ? attendanceByUser.get(t.user_id) : undefined;
      const overtimeHours = t.user_id ? overtimeByUser.get(t.user_id) || 0 : 0;

      return {
        id: t.id,
        full_name: t.full_name,
        email: t.email,
        phone: t.phone,
        level: t.role,
        status: t.status,
        availability_status: t.availability_status,
        last_login_at: t.last_login_at,
        jobs_completed: completedJobs,
        complaints_count: complaints,
        average_rating: safeNumber(t.average_rating),
        attendance_30d_present: attendance?.present || 0,
        attendance_30d_late: attendance?.late || 0,
        overtime_30d_hours: overtimeHours,
      };
    });

    return NextResponse.json({ success: true, rows });
  } catch (error: any) {
    console.error("Error in technician-performance API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
