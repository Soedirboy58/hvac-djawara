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
  role: string | null;
};

function jakartaTodayISO() {
  // YYYY-MM-DD in Asia/Jakarta
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function parseTimeToMinutes(value: string) {
  const trimmed = String(value || '').trim();
  const [h, m] = trimmed.split(':');
  const hour = Number(h || 0);
  const minute = Number(m || 0);
  return hour * 60 + minute;
}

function normalizeTimeToHHMMSS(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '00:00:00';
  const parts = trimmed.split(':');
  const h = String(Number(parts[0] || 0)).padStart(2, '0');
  const m = String(Number(parts[1] || 0)).padStart(2, '0');
  const s = String(Number(parts[2] || 0)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function jakartaDateTimeISO(dateISO: string, timeValue: string) {
  const t = normalizeTimeToHHMMSS(timeValue);
  return `${dateISO}T${t}+07:00`;
}

function getJakartaMinutes(isoTs: string) {
  const dt = new Date(isoTs);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(dt);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);
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

  return { supabase, admin, tenantId } as const;
}

function statusFor(row: AttendanceRow | null, hasUser: boolean) {
  if (!hasUser) return "Belum aktivasi";
  if (!row || !row.clock_in_time) return "Tidak hadir";
  if (row.is_auto_checkout) return "Auto checkout";
  if (row.is_late && row.is_early_leave) return "Terlambat & pulang cepat";
  if (row.is_late) return "Terlambat";
  if (row.is_early_leave) return "Pulang cepat";
  return "Tepat waktu";
}

export async function GET() {
  try {
    const ctx = await getAuthedTenantContext();
    if ("error" in ctx) return ctx.error;

    const today = jakartaTodayISO();

    const { data: config } = await ctx.admin
      .from('working_hours_config')
      .select('work_start_time, work_end_time')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle();

    const startMinutes = parseTimeToMinutes(String((config as any)?.work_start_time || '09:00:00'));
    const endMinutes = parseTimeToMinutes(String((config as any)?.work_end_time || '18:00:00'));

    const nowIso = new Date().toISOString();
    const nowMinutes = getJakartaMinutes(nowIso);

    const { data: techs, error: techError } = await ctx.admin
      .from("technicians")
      .select("id, user_id, full_name, email, role")
      .eq("tenant_id", ctx.tenantId)
      .order("full_name", { ascending: true });

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    const technicians = (techs || []) as TechnicianRow[];
    const userIds = technicians.map((t) => t.user_id).filter(Boolean) as string[];

    const attendanceByUser = new Map<string, AttendanceRow>();
    if (userIds.length > 0) {
      const { data: attendanceRows, error: attError } = await ctx.admin
        .from("daily_attendance")
        .select(
          "id, technician_id, date, clock_in_time, clock_out_time, total_work_hours, is_late, is_early_leave, is_auto_checkout"
        )
        .eq("tenant_id", ctx.tenantId)
        .eq("date", today)
        .in("technician_id", userIds);

      if (attError) {
        return NextResponse.json({ error: attError.message }, { status: 500 });
      }

      for (const r of (attendanceRows || []) as AttendanceRow[]) {
        // Auto-checkout at end time if still open.
        if (r.clock_in_time && !r.clock_out_time && nowMinutes >= endMinutes) {
          const outIso = jakartaDateTimeISO(today, String((config as any)?.work_end_time || '18:00:00'));
          const computedIsLate = getJakartaMinutes(r.clock_in_time) > startMinutes;
          const computedHours = round2((Date.parse(outIso) - Date.parse(r.clock_in_time)) / 3600000);

          await ctx.admin
            .from('daily_attendance')
            .update({
              clock_out_time: outIso,
              work_start_time: r.clock_in_time,
              work_end_time: outIso,
              total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
              is_late: Boolean(computedIsLate),
              is_early_leave: false,
              is_auto_checkout: true,
            })
            .eq('id', r.id);

          const normalized: AttendanceRow = {
            ...r,
            clock_out_time: outIso,
            is_late: Boolean(computedIsLate),
            is_early_leave: false,
            is_auto_checkout: true,
            total_work_hours: Number.isFinite(computedHours) ? computedHours : null,
          };

          attendanceByUser.set(r.technician_id, normalized);
          continue;
        }

        // Normalize values derived from timestamps + config, because stored flags/hours
        // may be stale/wrong if older code paths wrote incorrect totals.
        const clockIn = r.clock_in_time;
        const clockOut = r.clock_out_time;

        const computedIsLate = clockIn ? getJakartaMinutes(clockIn) > startMinutes : false;
        const computedIsEarlyLeave = clockOut ? getJakartaMinutes(clockOut) < endMinutes : false;
        const computedHours =
          clockIn && clockOut
            ? round2((Date.parse(clockOut) - Date.parse(clockIn)) / 3600000)
            : null;

        const normalized: AttendanceRow = {
          ...r,
          is_late: Boolean(computedIsLate),
          is_early_leave: Boolean(computedIsEarlyLeave),
          total_work_hours:
            typeof computedHours === 'number' && Number.isFinite(computedHours)
              ? computedHours
              : null,
        };

        attendanceByUser.set(r.technician_id, normalized);

        // Best-effort persist normalization for consistency in other views.
        const hoursMismatch =
          typeof computedHours === 'number' &&
          Number.isFinite(computedHours) &&
          Math.abs(Number(r.total_work_hours || 0) - computedHours) > 0.01;

        const flagsMismatch =
          Boolean(r.is_late) !== Boolean(computedIsLate) ||
          Boolean(r.is_early_leave) !== Boolean(computedIsEarlyLeave);

        if (hoursMismatch || flagsMismatch) {
          await ctx.admin
            .from('daily_attendance')
            .update({
              total_work_hours: computedHours,
              is_late: Boolean(computedIsLate),
              is_early_leave: Boolean(computedIsEarlyLeave),
            })
            .eq('id', r.id);
        }
      }
    }

    const roleByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: rolesRows, error: rolesError } = await ctx.admin
        .from("user_tenant_roles")
        .select("user_id, role")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true)
        .in("user_id", userIds);

      if (!rolesError) {
        for (const rr of (rolesRows || []) as Array<{ user_id: string; role: string }>) {
          roleByUser.set(rr.user_id, rr.role);
        }
      }
    }

    const roster = technicians.map((t) => {
      const userId = t.user_id;
      const attendance = userId ? attendanceByUser.get(userId) || null : null;
      const staffRole = userId ? roleByUser.get(userId) || null : null;
      return {
        technicianRecordId: t.id,
        userId: userId,
        fullName: t.full_name,
        email: t.email,
        staffRole,
        attendance,
        status: statusFor(attendance, Boolean(userId)),
      };
    });

    return NextResponse.json({ success: true, date: today, roster });
  } catch (error: any) {
    console.error("Error in admin attendance-today API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
