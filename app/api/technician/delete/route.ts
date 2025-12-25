import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { technicianId } = await request.json();

    if (!technicianId) {
      return NextResponse.json(
        { error: "Technician ID diperlukan" },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get technician data including user_id
    const { data: technician, error: fetchError } = await supabaseAdmin
      .from("technicians")
      .select("id, tenant_id, email, user_id, employee_id")
      .eq("id", technicianId)
      .single();

    if (fetchError || !technician) {
      return NextResponse.json(
        { error: "Teknisi tidak ditemukan" },
        { status: 404 }
      );
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_tenant_roles")
      .select("role")
      .eq("tenant_id", technician.tenant_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    if (!roleRow || !["owner", "admin_finance", "admin_logistic", "tech_head"].includes(roleRow.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete auth user if exists (will cascade to identities)
    if (technician.user_id) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        technician.user_id
      );

      if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        // Continue anyway to delete technician record
      }
    }

    // Delete technician record
    const { error: deleteTechError } = await supabaseAdmin
      .from("technicians")
      .delete()
      .eq("id", technicianId);

    if (deleteTechError) {
      console.error("Error deleting technician:", deleteTechError);
      return NextResponse.json(
        { error: "Gagal menghapus teknisi" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Teknisi ${technician.employee_id || technician.email} berhasil dihapus`,
    });
  } catch (error: any) {
    console.error("Delete technician error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
