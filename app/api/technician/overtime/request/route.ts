import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  jobId: string;
  requestDate: string; // YYYY-MM-DD
  reason: string;
  estimatedStartTime: string; // HH:MM
  estimatedEndTime: string; // HH:MM
};

function isValidDateISO(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
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

    if (!body?.jobId || !body?.reason || !body?.requestDate || !body?.estimatedStartTime || !body?.estimatedEndTime) {
      return NextResponse.json(
        { error: "Missing jobId, requestDate, reason, estimatedStartTime, estimatedEndTime" },
        { status: 400 }
      );
    }

    if (!isValidDateISO(body.requestDate)) {
      return NextResponse.json({ error: "Invalid requestDate format" }, { status: 400 });
    }

    if (!isValidTime(body.estimatedStartTime) || !isValidTime(body.estimatedEndTime)) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
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

    // Ensure job belongs to same tenant
    const { data: job, error: jobError } = await admin
      .from("service_orders")
      .select("id")
      .eq("tenant_id", tech.tenant_id)
      .eq("id", body.jobId)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: "Job tidak valid" }, { status: 409 });
    }

    const reason = body.reason.trim();
    if (!reason) {
      return NextResponse.json({ error: "Reason tidak boleh kosong" }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await admin
      .from("overtime_requests")
      .insert({
        tenant_id: tech.tenant_id,
        technician_id: user.id,
        job_id: body.jobId,
        request_date: body.requestDate,
        reason,
        estimated_start_time: body.estimatedStartTime,
        estimated_end_time: body.estimatedEndTime,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: inserted.id });
  } catch (error: any) {
    console.error("Error in technician overtime request API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
