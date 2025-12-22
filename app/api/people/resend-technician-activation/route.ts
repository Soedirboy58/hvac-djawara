import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  tenantId: string;
  technicianId: string;
};

function generateToken(length = 32) {
  // base64url without padding
  const raw = crypto.randomBytes(Math.ceil((length * 3) / 4));
  return raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
    .slice(0, length);
}

async function sendResendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, error: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });

  if (!res.ok) {
    let details = "";
    try {
      details = await res.text();
    } catch {
      // ignore
    }
    return { sent: false, error: `Resend error: ${res.status} ${details}` };
  }

  return { sent: true, error: null as string | null };
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

    const body = (await request.json()) as Body;
    if (!body?.tenantId || !body?.technicianId) {
      return NextResponse.json(
        { error: "Missing tenantId or technicianId" },
        { status: 400 }
      );
    }

    const tenantId = body.tenantId;
    const technicianId = body.technicianId;

    const { data: roleRow, error: roleError } = await supabase
      .from("user_tenant_roles")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    if (
      !roleRow ||
      !["owner", "admin_finance", "admin_logistic", "tech_head"].includes(
        roleRow.role
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const { data: technician, error: techError } = await admin
      .from("technicians")
      .select(
        "id, tenant_id, user_id, is_verified, full_name, email, verification_token, token_expires_at"
      )
      .eq("id", technicianId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (techError) {
      return NextResponse.json({ error: techError.message }, { status: 500 });
    }

    if (!technician) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }

    // If already verified / already has user_id, nothing to resend.
    if (technician.is_verified || technician.user_id) {
      return NextResponse.json(
        { error: "Technician already activated" },
        { status: 409 }
      );
    }

    let token: string | null = null;

    const { data: tokenData, error: tokenError } = await admin.rpc(
      "generate_technician_token",
      { p_technician_id: technicianId }
    );

    if (!tokenError && tokenData) {
      token = String(tokenData);
    } else {
      token = generateToken(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: fallbackError } = await admin
        .from("technicians")
        .update({
          verification_token: token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", technicianId);

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://hvac-djawara.vercel.app";

    const email = String(technician.email || "").trim().toLowerCase();
    const fullName = String(technician.full_name || email.split("@")[0] || "Technician");

    const verifyUrl = `${baseUrl}/technician/verify?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(token)}`;

    const emailSubject = "Aktivasi Akun Teknisi - HVAC Djawara";
    const emailText = `Halo ${fullName},\n\nSilakan aktivasi akun teknisi Anda dengan membuka link berikut:\n${verifyUrl}\n\nLink ini berlaku selama 7 hari.\n\nTerima kasih.`;
    const emailHtml = `
      <div>
        <p>Halo ${fullName},</p>
        <p>Silakan aktivasi akun teknisi Anda dengan membuka link berikut:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Link ini berlaku selama 7 hari.</p>
        <p>Terima kasih.</p>
      </div>
    `;

    const sendResult = await sendResendEmail({
      to: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      tokenSent: sendResult.sent,
      verifyUrl,
      token: sendResult.sent ? undefined : token,
      warning: sendResult.sent ? undefined : sendResult.error,
    });
  } catch (error: any) {
    console.error("Error in resend-technician-activation API:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
