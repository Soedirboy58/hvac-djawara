import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  tenantId: string;
  userId: string;
  avatarUrl: string;
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

    if (!body?.tenantId || !body?.userId || !body?.avatarUrl) {
      return NextResponse.json(
        { error: "Missing tenantId, userId, or avatarUrl" },
        { status: 400 }
      );
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

    if (
      !roleRow ||
      !["owner", "admin_finance", "admin_logistic", "tech_head"].includes(roleRow.role)
    ) {
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Ensure target user belongs to tenant
    const { data: membership, error: membershipError } = await admin
      .from("user_tenant_roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", body.userId)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Target user is not a member of this tenant" },
        { status: 409 }
      );
    }

    const { data: updated, error: updateError } = await admin
      .from("profiles")
      .update({ avatar_url: body.avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", body.userId)
      .select("id, avatar_url")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error("Error in update-profile-avatar API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
