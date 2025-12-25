import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: tech, error: techError } = await admin
      .from("technicians")
      .select("tenant_id, id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    if (!tech?.tenant_id || !tech?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get recent assignments to build job picker.
    const { data: assignments, error: asgError } = await admin
      .from("work_order_assignments")
      .select("service_order_id")
      .eq("technician_id", tech.id)
      .order("assigned_at", { ascending: false })
      .limit(30);

    // If table doesn't exist in DB yet, surface clear error.
    if (asgError) {
      return NextResponse.json(
        {
          error:
            asgError.message ||
            "Gagal memuat daftar pekerjaan (work_order_assignments)",
        },
        { status: 500 }
      );
    }

    const serviceOrderIds = Array.from(
      new Set((assignments || []).map((a: any) => a.service_order_id).filter(Boolean))
    ) as string[];

    if (serviceOrderIds.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const { data: jobs, error: jobsError } = await admin
      .from("service_orders")
      .select("id, order_number, service_title, scheduled_date, status")
      .in("id", serviceOrderIds)
      .order("scheduled_date", { ascending: false })
      .limit(30);

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error: any) {
    console.error("Error in technician overtime meta API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
