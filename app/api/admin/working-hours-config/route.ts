import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ConfigRow = {
  tenant_id: string;
  work_start_time: string | null;
  work_end_time: string | null;
  overtime_rate_per_hour: number | null;
  max_overtime_hours_per_day: number | null;
};

type PutBody = {
  workStartTime?: string; // HH:MM or HH:MM:SS
  workEndTime?: string; // HH:MM or HH:MM:SS
  overtimeRatePerHour?: number | string;
  maxOvertimeHoursPerDay?: number | string;
};

function normalizeTime(value: unknown, fallback: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  // accept HH:MM or HH:MM:SS
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return fallback;

  const hh = match[1];
  const mm = match[2];
  const ss = match[3] ?? "00";
  return `${hh}:${mm}:${ss}`;
}

function normalizeNumber(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : fallback;
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

export async function GET() {
  try {
    const ctx = await getAuthedTenantContext();
    if ("error" in ctx) return ctx.error;

    const { data, error } = await ctx.admin
      .from("working_hours_config")
      .select("tenant_id, work_start_time, work_end_time, overtime_rate_per_hour, max_overtime_hours_per_day")
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = (data as any) as ConfigRow | null;

    return NextResponse.json({
      success: true,
      tenantId: ctx.tenantId,
      config: {
        work_start_time: row?.work_start_time ?? "09:00:00",
        work_end_time: row?.work_end_time ?? "18:00:00",
        overtime_rate_per_hour: row?.overtime_rate_per_hour ?? 5000,
        max_overtime_hours_per_day: row?.max_overtime_hours_per_day ?? 4,
      },
    });
  } catch (error: any) {
    console.error("Error in working-hours-config GET:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await getAuthedTenantContext();
    if ("error" in ctx) return ctx.error;

    const body = (await request.json()) as PutBody;

    const workStart = normalizeTime(body?.workStartTime, "09:00:00");
    const workEnd = normalizeTime(body?.workEndTime, "18:00:00");
    const overtimeRate = normalizeNumber(body?.overtimeRatePerHour, 5000);
    const maxOvertime = Math.max(0, Math.floor(normalizeNumber(body?.maxOvertimeHoursPerDay, 4)));

    const payload: Partial<ConfigRow> = {
      tenant_id: ctx.tenantId,
      work_start_time: workStart,
      work_end_time: workEnd,
      overtime_rate_per_hour: overtimeRate,
      max_overtime_hours_per_day: maxOvertime,
    };

    const { data, error } = await ctx.admin
      .from("working_hours_config")
      .upsert(payload, { onConflict: "tenant_id" })
      .select("tenant_id, work_start_time, work_end_time, overtime_rate_per_hour, max_overtime_hours_per_day")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    console.error("Error in working-hours-config PUT:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
