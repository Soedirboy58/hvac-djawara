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
};

type TechnicianRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
};

function jakartaTodayISO() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function jakartaMonthKey(now = new Date()): string {
  return jakartaTodayISO().slice(0, 7);
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
  const dt = new Date(Date.UTC(y0, (m0 - 1) + delta, 1));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(monthKey: string): { start: string; endExclusive: string } {
  const start = `${monthKey}-01`;
  const nextMonth = addMonths(monthKey, 1);
  const endExclusive = `${nextMonth}-01`;
  return { start, endExclusive };
}

function parseTimeToMinutes(value: string) {
  const trimmed = String(value || "").trim();
  const [h, m] = trimmed.split(":");
  const hour = Number(h || 0);
  const minute = Number(m || 0);
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
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
    const requestedMonth = parseMonthKey(url.searchParams.get("month") || "");
    const month = requestedMonth || jakartaMonthKey();

    const { start, endExclusive } = monthRange(month);

    const { data: config } = await ctx.admin
      .from("working_hours_config")
      .select("work_start_time, work_end_time")
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    const startMinutes = parseTimeToMinutes(String((config as any)?.work_start_time || "09:00:00"));
    const endMinutes = parseTimeToMinutes(String((config as any)?.work_end_time || "18:00:00"));

    const todayISO = jakartaTodayISO();
    const nowIso = new Date().toISOString();
    const nowMinutes = getJakartaMinutes(nowIso);

    const { data: techs, error: techError } = await ctx.admin
      .from("technicians")
      .select("id, user_id, full_name, email")
      .eq("tenant_id", ctx.tenantId)
      .order("full_name", { ascending: true });

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    const technicians = (techs || []) as TechnicianRow[];
    const userIds = technicians.map((t) => t.user_id).filter(Boolean) as string[];

    const attendanceRows: AttendanceRow[] = [];
    if (userIds.length > 0) {
      const { data: rows, error: attError } = await ctx.admin
        .from("daily_attendance")
        .select(
          "id, technician_id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout"
        )
        .eq("tenant_id", ctx.tenantId)
        .gte("date", start)
        .lt("date", endExclusive)
        .in("technician_id", userIds);

      if (attError) {
        return NextResponse.json({ error: attError.message }, { status: 500 });
      }

      attendanceRows.push(...((rows || []) as AttendanceRow[]));
    }

    const byUser = new Map<string, AttendanceRow[]>();
    for (const row of attendanceRows) {
      const list = byUser.get(row.technician_id) || [];
      list.push(row);
      byUser.set(row.technician_id, list);
    }

    const normalize = (r: AttendanceRow) => {
      const clockIn = r.clock_in_time;
      const clockOut = r.clock_out_time;

      // Auto-close open rows for past days (or today after end time).
      if (clockIn && !clockOut) {
        const shouldAuto = r.date < todayISO || (r.date === todayISO && nowMinutes >= endMinutes);
        if (shouldAuto) {
          const outIso = jakartaDateTimeISO(r.date, String((config as any)?.work_end_time || "18:00:00"));
          const computedIsLate = getJakartaMinutes(clockIn) > startMinutes;
          const computedHours = round2((Date.parse(outIso) - Date.parse(clockIn)) / 3600000);

          // Best-effort persist for consistency.
          ctx.admin
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
            .eq("id", r.id);

          return {
            ...r,
            clock_out_time: outIso,
            is_late: Boolean(computedIsLate),
            is_early_leave: false,
            is_auto_checkout: true,
            total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
          } as AttendanceRow;
        }
      }

      const computedIsLate = clockIn ? getJakartaMinutes(clockIn) > startMinutes : false;
      const computedIsEarlyLeave = clockOut ? getJakartaMinutes(clockOut) < endMinutes : false;
      const computedHours =
        clockIn && clockOut
          ? round2((Date.parse(clockOut) - Date.parse(clockIn)) / 3600000)
          : null;

      return {
        ...r,
        is_late: Boolean(computedIsLate),
        is_early_leave: Boolean(computedIsEarlyLeave),
        total_work_hours:
          typeof computedHours === "number" && Number.isFinite(computedHours)
            ? computedHours
            : null,
      } as AttendanceRow;
    };

    const roster = technicians.map((t) => {
      const userId = t.user_id;
      const rows = userId ? (byUser.get(userId) || []).map(normalize) : [];

      let daysClockedIn = 0;
      let daysComplete = 0;
      let missingClockOut = 0;
      let totalHours = 0;
      let lateCount = 0;
      let earlyLeaveCount = 0;
      let autoCheckoutCount = 0;

      for (const r of rows) {
        if (r.clock_in_time) daysClockedIn += 1;
        if (r.clock_in_time && r.clock_out_time) daysComplete += 1;
        if (r.clock_in_time && !r.clock_out_time) missingClockOut += 1;
        if (typeof r.total_work_hours === "number" && Number.isFinite(r.total_work_hours)) {
          totalHours += Number(r.total_work_hours);
        }
        if (r.is_late) lateCount += 1;
        if (r.is_early_leave) earlyLeaveCount += 1;
        if (r.is_auto_checkout) autoCheckoutCount += 1;
      }

      const avgHoursPerCompleteDay = daysComplete > 0 ? round2(totalHours / daysComplete) : 0;

      return {
        technicianRecordId: t.id,
        userId: userId,
        fullName: t.full_name,
        email: t.email,
        daysClockedIn,
        daysComplete,
        missingClockOut,
        totalHours: round2(totalHours),
        avgHoursPerCompleteDay,
        lateCount,
        earlyLeaveCount,
        autoCheckoutCount,
      };
    });

    const totals = roster.reduce(
      (acc, r) => {
        acc.headcount += 1;
        acc.daysClockedIn += r.daysClockedIn;
        acc.daysComplete += r.daysComplete;
        acc.missingClockOut += r.missingClockOut;
        acc.totalHours += r.totalHours;
        acc.lateCount += r.lateCount;
        acc.earlyLeaveCount += r.earlyLeaveCount;
        acc.autoCheckoutCount += r.autoCheckoutCount;
        return acc;
      },
      {
        headcount: 0,
        daysClockedIn: 0,
        daysComplete: 0,
        missingClockOut: 0,
        totalHours: 0,
        lateCount: 0,
        earlyLeaveCount: 0,
        autoCheckoutCount: 0,
      }
    );

    totals.totalHours = round2(totals.totalHours);

    return NextResponse.json({
      month,
      start,
      endExclusive,
      totals,
      roster,
    });
  } catch (error: any) {
    console.error("Error in admin attendance monthly API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
