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

    const { data: config } = await admin
      .from("working_hours_config")
      .select("work_start_time, work_end_time")
      .eq("tenant_id", tech.tenant_id)
      .maybeSingle();

    const startMinutes = parseTimeToMinutes(String(config?.work_start_time || "09:00:00"));
    const endMinutes = parseTimeToMinutes(String(config?.work_end_time || "18:00:00"));

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

    const nowIso = new Date().toISOString();
    const nowMinutes = getJakartaMinutes(nowIso);

    const maybeAutoCheckout = async (row: any) => {
      if (!row?.id) return row;
      if (!row.clock_in_time || row.clock_out_time) return row;

      const shouldAuto = row.date < today || (row.date === today && nowMinutes >= endMinutes);
      if (!shouldAuto) return row;

      const outIso = jakartaDateTimeISO(row.date, String(config?.work_end_time || "18:00:00"));
      const computedIsLate = getJakartaMinutes(row.clock_in_time) > startMinutes;
      const computedHours = round2((Date.parse(outIso) - Date.parse(row.clock_in_time)) / 3600000);

      await admin
        .from("daily_attendance")
        .update({
          clock_out_time: outIso,
          work_start_time: row.clock_in_time,
          work_end_time: outIso,
          total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
          is_late: Boolean(computedIsLate),
          is_early_leave: false,
          is_auto_checkout: true,
        })
        .eq("id", row.id);

      return {
        ...row,
        clock_out_time: outIso,
        total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
        is_late: Boolean(computedIsLate),
        is_early_leave: false,
        is_auto_checkout: true,
      };
    };

    const computeRow = (row: any) => {
      if (!row) return row;

      const clockIn = row.clock_in_time as string | null;
      const clockOut = row.clock_out_time as string | null;

      const isLate = clockIn ? getJakartaMinutes(clockIn) > startMinutes : false;
      const isEarlyLeave = clockOut ? getJakartaMinutes(clockOut) < endMinutes : false;

      let totalHours: number | null = null;
      if (clockIn && clockOut) {
        totalHours = round2((Date.parse(clockOut) - Date.parse(clockIn)) / 3600000);
      }

      return {
        ...row,
        is_late: Boolean(isLate),
        is_early_leave: Boolean(isEarlyLeave),
        // Important: if clock_out_time is missing, force hours to null to avoid showing stale "running" totals.
        total_work_hours: typeof totalHours === "number" && Number.isFinite(totalHours) ? totalHours : null,
      };
    };

    const autoToday = await maybeAutoCheckout(todayRow || null);
    const autoRecent = await Promise.all((recent || []).map(maybeAutoCheckout));

    const normalizedTodayRow = computeRow(autoToday || null);
    const normalizedRecent = (autoRecent || []).map(computeRow);

    // Best-effort auto-heal: if existing stored values were computed using UTC time-of-day,
    // update today's record so subsequent reads (and other pages) match.
    if (normalizedTodayRow?.id && normalizedTodayRow?.clock_in_time && normalizedTodayRow?.clock_out_time) {
      const storedHours =
        typeof todayRow?.total_work_hours === "number" && Number.isFinite(todayRow.total_work_hours)
          ? Number(todayRow.total_work_hours)
          : null;
      const computedHours =
        typeof normalizedTodayRow.total_work_hours === "number" && Number.isFinite(normalizedTodayRow.total_work_hours)
          ? Number(normalizedTodayRow.total_work_hours)
          : null;

      const hoursMismatch =
        typeof storedHours === "number" && typeof computedHours === "number"
          ? Math.abs(storedHours - computedHours) > 0.01
          : storedHours !== computedHours;

      const flagsMismatch =
        Boolean(todayRow?.is_late) !== Boolean(normalizedTodayRow.is_late) ||
        Boolean(todayRow?.is_early_leave) !== Boolean(normalizedTodayRow.is_early_leave);

      if (hoursMismatch || flagsMismatch) {
        await admin
          .from("daily_attendance")
          .update({
            work_start_time: normalizedTodayRow.clock_in_time,
            work_end_time: normalizedTodayRow.clock_out_time,
            total_work_hours: computedHours,
            is_late: Boolean(normalizedTodayRow.is_late),
            is_early_leave: Boolean(normalizedTodayRow.is_early_leave),
          })
          .eq("id", normalizedTodayRow.id);
      }
    }

    return NextResponse.json({ today, todayRow: normalizedTodayRow || null, recent: normalizedRecent });
  } catch (error: any) {
    console.error("Error in technician attendance today API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
