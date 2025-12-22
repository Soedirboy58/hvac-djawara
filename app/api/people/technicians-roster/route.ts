import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  tenantId: string;
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

    const { data, error } = await admin
      .from("technicians")
      .select(
        "id, tenant_id, user_id, full_name, email, phone, role, status, availability_status, is_verified, last_login_at, created_at"
      )
      .eq("tenant_id", tenantId)
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rows: data || [] });
  } catch (error: any) {
    console.error("Error in technicians-roster API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
