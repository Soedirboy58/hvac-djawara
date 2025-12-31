import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AttendanceRow = {
  id: string;
  technician_id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_work_hours: number | null;
  is_late: boolean | null;
  is_early_leave: boolean | null;
  is_auto_checkout: boolean | null;
  notes?: string | null;
};

function jakartaTodayISO(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function parseMonthKey(value: string): string | null {
  const trimmed = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  const [y, m] = trimmed.split("-").map((v) => Number(v));
  if (!y || !m || m < 1 || m > 12) return null;
  return trimmed;
}

function addMonths(monthKey: string, delta: number): string {
  const [y0, m0] = monthKey.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y0, m0 - 1 + delta, 1));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(monthKey: string): { start: string; endExclusive: string } {
  const start = `${monthKey}-01`;
  const nextMonth = addMonths(monthKey, 1);
  return { start, endExclusive: `${nextMonth}-01` };
}

function parseTimeToMinutes(value: string) {
  const trimmed = String(value || "").trim();
  const [h, m] = trimmed.split(":");
  const hour = Number(h || 0);
  const minute = Number(m || 0);
  return hour * 60 + minute;
}

function getJakartaMinutes(isoTs: string) {
  const dt = new Date(isoTs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);

  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function normalizeTimeToHHMMSS(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "00:00:00";
  const parts = trimmed.split(":");
  const h = String(Number(parts[0] || 0)).padStart(2, "0");
  const m = String(Number(parts[1] || 0)).padStart(2, "0");
  const s = String(Number(parts[2] || 0)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function jakartaDateTimeISO(dateISO: string, timeValue: string) {
  const t = normalizeTimeToHHMMSS(timeValue);
  return `${dateISO}T${t}+07:00`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function listDaysInMonth(monthKey: string) {
  const [y, m] = monthKey.split("-").map((v) => Number(v));
  const start = new Date(Date.UTC(y, (m || 1) - 1, 1));
  const end = new Date(Date.UTC(y, (m || 1), 1));

  const days: string[] = [];
  for (let dt = start; dt < end; dt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1))) {
    const y2 = dt.getUTCFullYear();
    const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d2 = String(dt.getUTCDate()).padStart(2, "0");
    days.push(`${y2}-${m2}-${d2}`);
  }
  return days;
}

async function getAuthedTenantContext() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 500 }) } as const;
  }

  const tenantId = String((profile as any)?.active_tenant_id || "").trim();
  if (!tenantId) {
    return {
      error: NextResponse.json({ error: "No active tenant. Set active tenant first." }, { status: 409 }),
    } as const;
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_tenant_roles")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (roleError) {
    return { error: NextResponse.json({ error: roleError.message }, { status: 500 }) } as const;
  }

  if (!roleRow || !["owner", "admin_finance", "admin_logistic", "tech_head"].includes((roleRow as any).role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      ),
    } as const;
  }

  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  return { admin, tenantId } as const;
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedTenantContext();
    if ("error" in ctx) return ctx.error;

    const url = new URL(request.url);
    const userId = String(url.searchParams.get("userId") || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const requestedMonth = parseMonthKey(url.searchParams.get("month") || "");
    const month = requestedMonth || jakartaTodayISO().slice(0, 7);

    const { start, endExclusive } = monthRange(month);

    const { data: config } = await ctx.admin
      .from("working_hours_config")
      .select("work_start_time, work_end_time")
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    const startMinutes = parseTimeToMinutes(String((config as any)?.work_start_time || "09:00:00"));
    const endMinutes = parseTimeToMinutes(String((config as any)?.work_end_time || "18:00:00"));

    const today = jakartaTodayISO();
    const nowMinutes = getJakartaMinutes(new Date().toISOString());

    const { data: rows, error: rowsError } = await ctx.admin
      .from("daily_attendance")
      .select(
        "id, technician_id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout, notes"
      )
      .eq("tenant_id", ctx.tenantId)
      .eq("technician_id", userId)
      .gte("date", start)
      .lt("date", endExclusive)
      .order("date", { ascending: true });

    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    }

    const normalized: AttendanceRow[] = [];

    for (const raw of (rows || []) as AttendanceRow[]) {
      const clockIn = raw.clock_in_time;
      const clockOut = raw.clock_out_time;

      // Auto-checkout if missing clock_out_time and day is past end time.
      if (clockIn && !clockOut) {
        const shouldAuto = raw.date < today || (raw.date === today && nowMinutes >= endMinutes);
        if (shouldAuto) {
          const outIso = jakartaDateTimeISO(raw.date, String((config as any)?.work_end_time || "18:00:00"));
          const computedIsLate = getJakartaMinutes(clockIn) > startMinutes;
          const computedHours = round2((Date.parse(outIso) - Date.parse(clockIn)) / 3600000);

          await ctx.admin
            .from("daily_attendance")
            .update({
              clock_out_time: outIso,
              work_start_time: clockIn,
              work_end_time: outIso,
              total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
              is_late: Boolean(computedIsLate),
              is_early_leave: false,
              is_auto_checkout: true,
            })
            .eq("id", raw.id);

          normalized.push({
            ...raw,
            clock_out_time: outIso,
            total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
            is_late: Boolean(computedIsLate),
            is_early_leave: false,
            is_auto_checkout: true,
          });
          continue;
        }
      }

      const computedIsLate = clockIn ? getJakartaMinutes(clockIn) > startMinutes : false;
      const computedIsEarlyLeave = clockOut ? getJakartaMinutes(clockOut) < endMinutes : false;
      const computedHours =
        clockIn && clockOut
          ? round2((Date.parse(clockOut) - Date.parse(clockIn)) / 3600000)
          : null;

      normalized.push({
        ...raw,
        is_late: Boolean(computedIsLate),
        is_early_leave: Boolean(computedIsEarlyLeave),
        // If no clock_out_time, force hours to null to avoid showing stale "running" totals.
        total_work_hours:
          typeof computedHours === "number" && Number.isFinite(computedHours) ? computedHours : null,
      });
    }

    const byDate = new Map<string, AttendanceRow>();
    for (const r of normalized) byDate.set(r.date, r);

    const days = listDaysInMonth(month).map((d) => {
      const row = byDate.get(d) || null;
      return { date: d, row };
    });

    return NextResponse.json({
      success: true,
      month,
      start,
      endExclusive,
      userId,
      days,
    });
  } catch (error: any) {
    console.error("Error in admin attendance user API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
