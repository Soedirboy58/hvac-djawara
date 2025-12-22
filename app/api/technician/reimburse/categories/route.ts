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
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    if (!tech?.tenant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: categories, error: catError } = await admin
      .from("reimburse_categories")
      .select("id, name")
      .eq("tenant_id", tech.tenant_id)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    return NextResponse.json({ tenantId: tech.tenant_id, categories: categories || [] });
  } catch (error: any) {
    console.error("Error in technician reimburse categories API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
