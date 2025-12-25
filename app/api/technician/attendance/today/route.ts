import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

function getJakartaDateISO(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    // Fallback (UTC) if Intl is not available
    return now.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

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

    const today = getJakartaDateISO();

    const { data: todayRow, error: todayError } = await admin
      .from("daily_attendance")
      .select(
        "id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout, notes"
      )
      .eq("tenant_id", tech.tenant_id)
      .eq("technician_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (todayError) {
      return NextResponse.json({ error: todayError.message }, { status: 500 });
    }

    const { data: recent, error: recentError } = await admin
      .from("daily_attendance")
      .select(
        "id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout, notes"
      )
      .eq("tenant_id", tech.tenant_id)
      .eq("technician_id", user.id)
      .order("date", { ascending: false })
      .limit(14);

    if (recentError) {
      return NextResponse.json({ error: recentError.message }, { status: 500 });
    }

    return NextResponse.json({ today, todayRow: todayRow || null, recent: recent || [] });
  } catch (error: any) {
    console.error("Error in technician attendance today API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
