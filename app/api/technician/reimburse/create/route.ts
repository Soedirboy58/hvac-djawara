import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  categoryId: string;
  amount: number;
  description?: string | null;
  receiptPath: string;
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

    if (!body?.categoryId || !body?.receiptPath || !Number.isFinite(body?.amount)) {
      return NextResponse.json(
        { error: "Missing categoryId, amount, or receiptPath" },
        { status: 400 }
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
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

    // Ensure category belongs to tenant and active
    const { data: cat, error: catError } = await admin
      .from("reimburse_categories")
      .select("id")
      .eq("tenant_id", tech.tenant_id)
      .eq("id", body.categoryId)
      .eq("is_active", true)
      .maybeSingle();

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    if (!cat) {
      return NextResponse.json(
        { error: "Kategori tidak valid atau tidak aktif" },
        { status: 409 }
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from("reimburse_requests")
      .insert({
        tenant_id: tech.tenant_id,
        category_id: body.categoryId,
        submitted_by: user.id,
        amount: body.amount,
        description: body.description || null,
        receipt_path: body.receiptPath,
        status: "submitted",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: inserted.id });
  } catch (error: any) {
    console.error("Error in technician reimburse create API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
