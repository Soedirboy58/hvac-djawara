import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  tenantId: string;
};

type TechnicianRow = {
  id: string;
  user_id: string | null;
};

type ServiceOrderRow = {
  id: string;
  assigned_to: string | null;
};

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

    // Load technicians for tenant
    const { data: techData, error: techError } = await admin
      .from("technicians")
      .select("id, user_id")
      .eq("tenant_id", tenantId);

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    const technicians = (techData || []) as TechnicianRow[];
    const techUserIds = technicians.map((t) => t.user_id).filter(Boolean) as string[];

    // Also support the new assignment system: completed jobs are determined by service_orders.status
    // for orders linked via work_order_assignments. This is needed because assigned_to may be null
    // and work_order_assignments.status is not always updated to "completed".
    const completedOrderIdsByTechId = new Map<string, Set<string>>();
    const techIds = technicians.map((t) => t.id);
    if (techIds.length > 0) {
      const { data: assignCompletedData, error: assignCompletedError } = await admin
        .from("work_order_assignments")
        .select("technician_id, service_order_id, service_orders!inner(tenant_id, status)")
        .eq("service_orders.tenant_id", tenantId)
        .eq("service_orders.status", "completed")
        .in("technician_id", techIds);

      if (assignCompletedError) {
        return NextResponse.json({ error: assignCompletedError.message }, { status: 500 });
      }

      const rows = (assignCompletedData || []) as Array<{
        technician_id: string;
        service_order_id: string;
        service_orders?: { status?: string } | Array<{ status?: string }>;
      }>;

      for (const r of rows) {
        const joinedStatus = Array.isArray(r.service_orders)
          ? r.service_orders?.[0]?.status
          : r.service_orders?.status;

        if (joinedStatus !== "completed") continue;
        if (!completedOrderIdsByTechId.has(r.technician_id)) {
          completedOrderIdsByTechId.set(r.technician_id, new Set());
        }
        completedOrderIdsByTechId.get(r.technician_id)!.add(r.service_order_id);
      }
    }

    // Load completed orders for tenant
    const { data: completedOrdersData, error: ordersError } = await admin
      .from("service_orders")
      .select("id, assigned_to")
      .eq("tenant_id", tenantId)
      .eq("status", "completed");

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const completedOrders = (completedOrdersData || []) as ServiceOrderRow[];
    const completedOrderIds = completedOrders.map((o) => o.id);

    // Map completed orders -> user ids via assigned_to and job_assignments
    const completedOrderIdsByUserId = new Map<string, Set<string>>();

    for (const o of completedOrders) {
      if (!o.assigned_to) continue;
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

    // Update technicians.total_jobs_completed.
    // IMPORTANT: Do NOT use upsert here because the technicians table has NOT NULL columns
    // (tenant_id, full_name, email). Upsert may attempt an INSERT path and fail with NOT NULL violations.
    const nowIso = new Date().toISOString();
    let updatedCount = 0;

    for (const t of technicians) {
      const set = new Set<string>();

      // Legacy workflow (auth/profiles user id)
      if (t.user_id) {
        const byUser = completedOrderIdsByUserId.get(t.user_id);
        if (byUser) for (const oid of byUser) set.add(oid);
      }

      // New workflow (technicians.id)
      const byTech = completedOrderIdsByTechId.get(t.id);
      if (byTech) for (const oid of byTech) set.add(oid);

      const { error: updateError } = await admin
        .from("technicians")
        .update({ total_jobs_completed: set.size, updated_at: nowIso })
        .eq("id", t.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      updatedCount += 1;
    }

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (error: any) {
    console.error("Error in sync-technician-jobs API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
