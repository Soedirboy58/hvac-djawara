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

    // Build upsert payload for technicians.total_jobs_completed
    const updates = technicians
      .filter((t) => t.user_id)
      .map((t) => {
        const userId = t.user_id as string;
        const set = completedOrderIdsByUserId.get(userId) || new Set();
        return {
          id: t.id,
          total_jobs_completed: set.size,
          updated_at: new Date().toISOString(),
        };
      });

    if (updates.length > 0) {
      const { error: upsertError } = await admin
        .from("technicians")
        .upsert(updates, { onConflict: "id" });

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error: any) {
    console.error("Error in sync-technician-jobs API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
