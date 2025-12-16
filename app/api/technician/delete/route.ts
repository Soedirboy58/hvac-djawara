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

export async function DELETE(request: NextRequest) {
  try {
    const { technicianId } = await request.json();

    if (!technicianId) {
      return NextResponse.json(
        { error: "Technician ID diperlukan" },
        { status: 400 }
      );
    }

    // Get technician data including user_id
    const { data: technician, error: fetchError } = await supabaseAdmin
      .from("technicians")
      .select("id, email, user_id, employee_id")
      .eq("id", technicianId)
      .single();

    if (fetchError || !technician) {
      return NextResponse.json(
        { error: "Teknisi tidak ditemukan" },
        { status: 404 }
      );
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
