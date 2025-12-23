import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

type Body = {
  tenantId: string;
  email: string;
  fullName?: string;
  phone?: string;
  role?: "technician" | "supervisor" | "team_lead";
};

function getBaseUrlFromRequest(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    try {
      return new URL(envUrl).origin;
    } catch {
      // ignore
    }
  }

  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return "https://hvac-djawara.vercel.app";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    if (!body?.tenantId) {
      return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });
    }

    const email = (body.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const tenantId = body.tenantId;
    const fullName = (body.fullName || email.split("@")[0] || "Technician").trim().slice(0, 100);
    const phone = (body.phone || "").trim() || null;
    const role = body.role || "technician";

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

    if (!roleRow || !["owner", "admin_finance", "admin_logistic", "tech_head"].includes(roleRow.role)) {
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
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: existingByEmail, error: existingError } = await admin
      .from("technicians")
      .select("id, tenant_id, user_id, is_verified")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingByEmail && existingByEmail.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: "Email already used by a technician in another tenant" },
        { status: 409 }
      );
    }

    let technicianId = existingByEmail?.id as string | undefined;

    if (!technicianId) {
      const { data: inserted, error: insertError } = await admin
        .from("technicians")
        .insert({
          tenant_id: tenantId,
          full_name: fullName,
          email,
          phone,
          role,
          status: "active",
          availability_status: "available",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      technicianId = inserted.id;
    } else {
      const { error: updateError } = await admin
        .from("technicians")
        .update({
          full_name: fullName,
          phone,
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", technicianId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    const baseUrl = getBaseUrlFromRequest(request);

    // Preferred: Supabase built-in invite email (no Resend needed)
    const redirectTo = `${baseUrl}/technician/invite`;
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        role: "technician",
        is_technician: true,
        tenant_id: tenantId,
        technician_id: technicianId,
      },
    });

    if (!inviteError) {
      // Generate action link so admin can send manually if email delivery is delayed
      let verifyUrl: string | undefined;
      let debugRedirectTo: string | undefined;
      try {
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo },
        });
        if (!linkError) {
          const props = (linkData as any)?.properties as any;
          const hashedToken = (props?.hashed_token as string | undefined) || undefined;
          const actionLink = (props?.action_link as string | undefined) || undefined;

          // Prefer app-domain link (token_hash) to avoid /auth/v1/verify redirects and hash-stripping.
          if (hashedToken) {
            verifyUrl = `${baseUrl}/technician/invite?token_hash=${encodeURIComponent(
              hashedToken
            )}&type=invite`;
          } else {
            verifyUrl = actionLink;
          }

          if (actionLink) {
            try {
              debugRedirectTo = new URL(actionLink).searchParams.get("redirect_to") || undefined;
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore - invite already created
      }

      return NextResponse.json({
        success: true,
        technicianId,
        email,
        tokenSent: true,
        verifyUrl,
        debug: {
          baseUrl,
          redirectTo,
          debugRedirectTo,
        },
      });
    }

    // Fallback: generate token + manual link (admin can send via WhatsApp)
    let token: string | null = null;

    const { data: tokenData, error: tokenError } = await admin.rpc("generate_technician_token", {
      p_technician_id: technicianId,
    });

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

    const verifyUrl = `${baseUrl}/technician/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(
      token
    )}`;

    return NextResponse.json({
      success: true,
      technicianId,
      email,
      tokenSent: false,
      verifyUrl,
      token,
      warning: inviteError.message || "Supabase invite email failed",
    });
  } catch (error: any) {
    console.error("Error in add-technician API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
