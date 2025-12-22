import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, token } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 }
      );
    }

    // Get technician by email (token already verified in step 1)
    const { data: technician, error: techError } = await supabaseAdmin
      .from("technicians")
      .select("id, tenant_id, user_id, role, full_name, phone, verification_token, token_expires_at")
      .eq("email", email)
      .single();

    if (techError || !technician) {
      return NextResponse.json(
        { error: "Teknisi tidak ditemukan" },
        { status: 400 }
      );
    }

    // If token provided, verify it matches (optional backward compatibility)
    if (token && technician.verification_token && token !== technician.verification_token) {
      return NextResponse.json(
        { error: "Token tidak valid" },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (technician.user_id) {
      return NextResponse.json(
        { 
          error: "Akun sudah dibuat sebelumnya",
          already_exists: true,
          message: "Akun Anda sudah terdaftar. Silakan login dengan email dan password yang telah dibuat."
        },
        { status: 400 }
      );
    }

    // Create user with admin client (email auto-confirmed)
    const { data: authData, error: signUpError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          role: "technician",
          is_technician: true,
        },
      });

    if (signUpError) {
      console.error("Sign up error:", signUpError);
      
      // Check if error is due to user already existing
      if (signUpError.message?.includes("already been registered")) {
        return NextResponse.json(
          { 
            error: "Akun sudah terdaftar",
            already_exists: true,
            message: "Akun Anda sudah terdaftar. Silakan login dengan email dan password yang telah dibuat."
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: signUpError?.message || "Gagal membuat akun" },
        { status: 500 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: "Gagal membuat akun" },
        { status: 500 }
      );
    }

    // Update technician record with user_id
    const { error: updateError } = await supabaseAdmin
      .from("technicians")
      .update({
        user_id: authData.user.id,
        is_verified: true,
        verification_token: null,
        token_expires_at: null,
      })
      .eq("id", technician.id);

    if (updateError) {
      console.error("Update error:", updateError);
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Gagal mengupdate data teknisi" },
        { status: 500 }
      );
    }

    // Ensure profile exists for People Management / team hierarchy
    const fullName = (technician.full_name || email.split("@")[0] || "Technician").slice(0, 100);
    const phone = technician.phone || null;

    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authData.user.id,
          full_name: fullName,
          phone,
          active_tenant_id: technician.tenant_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileUpsertError) {
      console.error("Profile upsert error:", profileUpsertError);
      // Non-fatal: account already created and technician verified
    }

    // Ensure user has a tenant role entry (so they appear in get_team_members)
    // Map technician system roles to user_role enum values.
    const roleMap: Record<string, string> = {
      technician: "technician",
      supervisor: "supervisor",
      team_lead: "tech_head",
    };
    const tenantRole = roleMap[String(technician.role || "technician")] || "technician";

    const { data: existingRole, error: existingRoleError } = await supabaseAdmin
      .from("user_tenant_roles")
      .select("id")
      .eq("tenant_id", technician.tenant_id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (existingRoleError) {
      console.error("Check existing role error:", existingRoleError);
    } else if (!existingRole) {
      const { error: insertRoleError } = await supabaseAdmin
        .from("user_tenant_roles")
        .insert({
          tenant_id: technician.tenant_id,
          user_id: authData.user.id,
          role: tenantRole as any,
          is_active: true,
          assigned_at: new Date().toISOString(),
        });

      if (insertRoleError) {
        console.error("Insert user_tenant_roles error:", insertRoleError);
        // Non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      message: "Akun berhasil dibuat! Silakan login.",
      user_id: authData.user.id,
    });
  } catch (error: any) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
