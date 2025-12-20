// ============================================
// API: Generate Technical Report PDF
// Generate PDF for client download
// ============================================

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateTechnicalReportPDF } from '@/lib/pdf-generator'

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const orderId = params.orderId
    
    // Fetch work log with all data
    const { data: workLog, error } = await supabase
      .from('technician_work_logs')
      .select(`
        *,
        service_orders (
          order_number,
          service_title,
          location_address,
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
      .single()
    
    if (error || !workLog) {
      return NextResponse.json(
        { error: 'Technical report not found' },
        { status: 404 }
      )
    }
    
    // Fetch spareparts
    const { data: spareparts } = await supabase
      .from('work_order_spareparts')
      .select('*')
      .eq('work_log_id', workLog.id)
    
    // Check access: either technician who created it, staff in same tenant, or client who owns the order
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_tenant_id, role')
      .eq('id', user.id)
      .single()
    
    const isClient = user.user_metadata?.account_type === 'client'
    const clientId = user.user_metadata?.client_id
    
    if (!isClient) {
      // For staff/technicians, check they're in the same tenant
      const { data: techProfile } = await supabase
        .from('technicians')
        .select('tenant_id')
        .eq('id', workLog.technician_id)
        .single()
      
      if (profile?.active_tenant_id !== techProfile?.tenant_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // For clients, check they own this order
      if (workLog.service_orders?.clients?.id !== clientId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    // Generate PDF
    const pdfData = {
      orderNumber: workLog.service_orders?.order_number || 'N/A',
      clientName: workLog.service_orders?.clients?.name || 'N/A',
      clientPhone: workLog.service_orders?.clients?.phone || '',
      clientAddress: workLog.service_orders?.clients?.address || workLog.service_orders?.location_address || '',
      serviceTitle: workLog.service_orders?.service_title || 'N/A',
      findings: workLog.findings || '',
      actionsTaken: workLog.actions_taken || '',
      workDuration: workLog.work_duration?.toString() || '',
      distance: workLog.travel_distance?.toString() || '',
      additionalNotes: workLog.additional_notes || '',
      repairNotes: workLog.repair_notes || '',
      photos: workLog.documentation_photos || [],
      photoCaptions: workLog.photo_captions || [],
      spareparts: spareparts || [],
      technicianSignature: workLog.signature_technician,
      clientSignature: workLog.signature_client,
      technicianName: workLog.technicians?.full_name || workLog.signature_technician_name || '',
      clientName: workLog.signature_client_name || workLog.service_orders?.clients?.name || '',
      signatureDate: workLog.signature_date || new Date().toISOString(),
    }
    
    const pdfBlob = await generateTechnicalReportPDF(pdfData)
    
    // Return PDF
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Laporan-Teknis-${workLog.service_orders?.order_number}.pdf"`,
      },
    })
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
