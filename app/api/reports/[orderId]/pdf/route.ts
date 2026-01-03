// ============================================
// API: Get Technical Report Data (JSON)
// Client will generate PDF using jsPDF
// ============================================

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const orderId = params.orderId

    // Prefer PIC (primary) work log so assistant logs don't override the report.
    const { data: picAssignments, error: picErr } = await supabaseAdmin
      .from('work_order_assignments')
      .select('technician_id')
      .eq('service_order_id', orderId)
      .eq('role_in_order', 'primary')

    if (picErr) {
      console.error('PIC assignment lookup failed:', picErr)
    }

    const picTechnicianIds = (picAssignments || []).map((r: any) => r.technician_id).filter(Boolean)

    // Fetch work log with all data using admin client (bypasses RLS)
    let workLogQuery = supabaseAdmin
      .from('technician_work_logs')
      .select(`
        *,
        service_orders (
          order_number,
          service_title,
          location_address,
          scheduled_date,
          clients (
            name,
            phone,
            email,
            address,
            client_type
          )
        ),
        technicians (
          full_name
        )
      `)
      .eq('service_order_id', orderId)

    if (picTechnicianIds.length > 0) {
      workLogQuery = workLogQuery.in('technician_id', picTechnicianIds)
    }

    const { data: workLog, error } = await workLogQuery
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error || !workLog) {
      console.error('Work log not found:', error);
      return NextResponse.json(
        { error: 'Technical report not found' },
        { status: 404 }
      )
    }
    
    // Fetch spareparts using admin client
    const { data: spareparts } = await supabaseAdmin
      .from('work_order_spareparts')
      .select('*')
      .eq('work_log_id', workLog.id)
    
    // Return JSON data for client-side PDF generation
    const reportData = {
      orderNumber: workLog.service_orders?.order_number || 'N/A',
      serviceTitle: workLog.service_orders?.service_title || 'N/A',
      clientName: workLog.service_orders?.clients?.name || 'N/A',
      clientPhone: workLog.service_orders?.clients?.phone || '',
      location: workLog.service_orders?.location_address || workLog.service_orders?.clients?.address || '',
      scheduledDate: workLog.service_orders?.scheduled_date || new Date().toISOString(),
      technicianName: workLog.technicians?.full_name || workLog.signature_technician_name || '',

      work_type: workLog.work_type || '',
      check_type: workLog.check_type || '',
      ac_units_data: workLog.ac_units_data || [],
      maintenance_units_data: workLog.maintenance_units_data || [],
      catatan_rekomendasi: workLog.catatan_rekomendasi || '',
      catatan_perbaikan: workLog.catatan_perbaikan || '',

      problem: workLog.problem || '',
      tindakan: workLog.tindakan || '',
      rincian_pekerjaan: workLog.rincian_pekerjaan || '',
      rincian_kerusakan: workLog.rincian_kerusakan || '',
      lama_kerja: workLog.lama_kerja || 0,
      jarak_tempuh: workLog.jarak_tempuh || 0,

      // Measurement fields (instalasi)
      mcb_1: workLog.mcb_1,
      mcb_2: workLog.mcb_2,
      mcb_3: workLog.mcb_3,
      mcb_4: workLog.mcb_4,
      mcb_5: workLog.mcb_5,
      volt_1: workLog.volt_1,
      volt_2: workLog.volt_2,
      volt_3: workLog.volt_3,
      volt_4: workLog.volt_4,
      volt_5: workLog.volt_5,
      ampere_total_1: workLog.ampere_total_1,
      ampere_total_2: workLog.ampere_total_2,
      ampere_total_3: workLog.ampere_total_3,
      ampere_total_4: workLog.ampere_total_4,
      ampere_total_5: workLog.ampere_total_5,
      ampere_kompressor_1: workLog.ampere_kompressor_1,
      ampere_kompressor_2: workLog.ampere_kompressor_2,
      ampere_kompressor_3: workLog.ampere_kompressor_3,
      ampere_kompressor_4: workLog.ampere_kompressor_4,
      ampere_kompressor_5: workLog.ampere_kompressor_5,
      ampere_kipas_1: workLog.ampere_kipas_1,
      ampere_kipas_2: workLog.ampere_kipas_2,
      ampere_kipas_3: workLog.ampere_kipas_3,
      ampere_kipas_4: workLog.ampere_kipas_4,
      ampere_kipas_5: workLog.ampere_kipas_5,
      tekanan_tinggi_1: workLog.tekanan_tinggi_1,
      tekanan_tinggi_2: workLog.tekanan_tinggi_2,
      tekanan_tinggi_3: workLog.tekanan_tinggi_3,
      tekanan_tinggi_4: workLog.tekanan_tinggi_4,
      tekanan_tinggi_5: workLog.tekanan_tinggi_5,
      tekanan_rendah_1: workLog.tekanan_rendah_1,
      tekanan_rendah_2: workLog.tekanan_rendah_2,
      tekanan_rendah_3: workLog.tekanan_rendah_3,
      tekanan_rendah_4: workLog.tekanan_rendah_4,
      tekanan_rendah_5: workLog.tekanan_rendah_5,
      kondensor_in_out_1: workLog.kondensor_in_out_1,
      kondensor_in_out_2: workLog.kondensor_in_out_2,
      kondensor_in_out_3: workLog.kondensor_in_out_3,
      kondensor_in_out_4: workLog.kondensor_in_out_4,
      kondensor_in_out_5: workLog.kondensor_in_out_5,
      evaporator_in_out_1: workLog.evaporator_in_out_1,
      evaporator_in_out_2: workLog.evaporator_in_out_2,
      evaporator_in_out_3: workLog.evaporator_in_out_3,
      evaporator_in_out_4: workLog.evaporator_in_out_4,
      evaporator_in_out_5: workLog.evaporator_in_out_5,
      temp_ruang_1: workLog.temp_ruang_1,
      temp_ruang_2: workLog.temp_ruang_2,
      temp_ruang_3: workLog.temp_ruang_3,
      temp_ruang_4: workLog.temp_ruang_4,
      temp_ruang_5: workLog.temp_ruang_5,
      lain_lain: workLog.lain_lain,
      spareparts: (spareparts || []).map(sp => ({
        name: sp.sparepart_name,
        quantity: sp.quantity,
        unit: sp.unit,
        notes: sp.notes || ''
      })),
      photos: workLog.documentation_photos || [],
      photoCaptions: workLog.photo_captions || [],
      signatureTechnician: workLog.signature_technician,
      signatureClient: workLog.signature_client,
      signatureTechnicianName: workLog.signature_technician_name || workLog.technicians?.full_name || '',
      signatureClientName: workLog.signature_client_name || workLog.service_orders?.clients?.name || '',
      signatureDate: workLog.signature_date || new Date().toISOString(),
    }

    return NextResponse.json(reportData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
    
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report data', details: String(error) },
      { status: 500 }
    )
  }
}
