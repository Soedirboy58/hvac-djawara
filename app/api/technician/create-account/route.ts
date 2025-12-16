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
    if (!email || !password || !token) {
      return NextResponse.json(
        { error: "Email, password, dan token harus diisi" },
        { status: 400 }
      );
    }

    // Verify token is valid
    const { data: technician, error: techError } = await supabaseAdmin
      .from("technicians")
      .select("id, user_id, verification_token, token_expires_at")
      .eq("email", email)
      .eq("verification_token", token)
      .single();

    if (techError || !technician) {
      return NextResponse.json(
        { error: "Token tidak valid" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(technician.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token sudah expired" },
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
