import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
  reason?: string | null;
};

function isValidDateISO(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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

    const body = (await request.json().catch(() => null)) as Body | null;

    if (!body?.date || typeof body.isAvailable !== "boolean") {
      return NextResponse.json({ error: "Missing date or isAvailable" }, { status: 400 });
    }

    if (!isValidDateISO(body.date)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
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

    const trimmedReason = typeof body.reason === "string" ? body.reason.trim() : "";
    const reason = trimmedReason ? trimmedReason : null;

    if (!body.isAvailable && !reason) {
      return NextResponse.json({ error: "Alasan cuti/izin wajib diisi" }, { status: 400 });
    }

    // Upsert by unique(tenant_id, technician_id, date)
    const { data: upserted, error: upsertError } = await admin
      .from("technician_availability")
      .upsert(
        {
          tenant_id: tech.tenant_id,
          technician_id: user.id,
          date: body.date,
          is_available: body.isAvailable,
          reason: body.isAvailable ? null : reason,
        },
        { onConflict: "tenant_id,technician_id,date" }
      )
      .select("id, date, is_available, reason")
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, row: upserted });
  } catch (error: any) {
    console.error("Error in technician leave set API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
