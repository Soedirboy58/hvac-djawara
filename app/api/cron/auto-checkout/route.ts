import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WorkingHoursConfigRow = {
  tenant_id: string;
  work_start_time: string | null;
  work_end_time: string | null;
};

type AttendanceOpenRow = {
  id: string;
  tenant_id: string;
  technician_id: string;
  date: string; // YYYY-MM-DD
  clock_in_time: string | null;
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

function jakartaNowMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
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
  // Asia/Jakarta is UTC+07:00 (no DST)
  return `${dateISO}T${t}+07:00`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isAuthorizedCron(request: Request) {
  // Vercel Cron sets this header on cron invocations.
  const vercelCron = request.headers.get("x-vercel-cron");
  if (vercelCron) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const url = new URL(request.url);
  const provided = url.searchParams.get("secret");
  return Boolean(provided && provided === secret);
}

export async function GET(request: Request) {
  try {
    if (!isAuthorizedCron(request)) {
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

    const today = jakartaTodayISO();
    const nowMinutes = jakartaNowMinutes();

    const { data: configs, error: cfgError } = await admin
      .from("working_hours_config")
      .select("tenant_id, work_start_time, work_end_time");

    if (cfgError) {
      return NextResponse.json({ error: cfgError.message }, { status: 500 });
    }

    const tenants = (configs || []) as WorkingHoursConfigRow[];

    let processedTenants = 0;
    let candidates = 0;
    let autoCheckedOut = 0;

    for (const cfg of tenants) {
      const tenantId = String(cfg.tenant_id || "").trim();
      if (!tenantId) continue;

      const startMinutes = parseTimeToMinutes(String(cfg.work_start_time || "09:00:00"));
      const endMinutes = parseTimeToMinutes(String(cfg.work_end_time || "18:00:00"));

      // Only do today's auto-checkout after end time.
      if (nowMinutes < endMinutes) continue;

      processedTenants += 1;

      // Pull open rows up to the last 7 days for safety.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
      const minDate = jakartaTodayISO(sevenDaysAgo);

      const { data: openRows, error: openError } = await admin
        .from("daily_attendance")
        .select("id, tenant_id, technician_id, date, clock_in_time")
        .eq("tenant_id", tenantId)
        .not("clock_in_time", "is", null)
        .is("clock_out_time", null)
        .gte("date", minDate)
        .lte("date", today);

      if (openError) continue;

      const rows = (openRows || []) as AttendanceOpenRow[];
      candidates += rows.length;

      for (const r of rows) {
        if (!r.clock_in_time) continue;

        // Close past dates always; close today only because now >= endMinutes.
        const outIso = jakartaDateTimeISO(r.date, String(cfg.work_end_time || "18:00:00"));

        const computedIsLate = getJakartaMinutes(r.clock_in_time) > startMinutes;
        const computedHours = round2((Date.parse(outIso) - Date.parse(r.clock_in_time)) / 3600000);

        const { error: updError } = await admin
          .from("daily_attendance")
          .update({
            clock_out_time: outIso,
            work_start_time: r.clock_in_time,
            work_end_time: outIso,
            total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
            is_late: Boolean(computedIsLate),
            is_early_leave: false,
            is_auto_checkout: true,
          })
          .eq("id", r.id);

        if (!updError) autoCheckedOut += 1;
      }
    }

    return NextResponse.json({
      success: true,
      today,
      processedTenants,
      candidates,
      autoCheckedOut,
    });
  } catch (error: any) {
    console.error("Error in cron auto-checkout:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
