// ============================================
// API: Public Service Tracking
// Track service orders WITHOUT authentication
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const phone = searchParams.get('phone')
    const orderNumber = searchParams.get('order')

    if (!phone && !orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Please provide phone number or order number' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let query = supabase
      .from('service_orders')
      .select(`
        id,
        order_number,
        service_type,
        status,
        scheduled_date,
        address,
        notes,
        created_at,
        client:client_id (
          name,
          phone
        )
      `)
      .order('created_at', { ascending: false })

    // Search by phone number
    if (phone) {
      // First get client by phone
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .ilike('phone', `%${phone.replace(/\D/g, '')}%`)

      if (!clients || clients.length === 0) {
        return NextResponse.json({
          success: true,
          orders: [],
          message: 'No service orders found for this phone number'
        })
      }

      const clientIds = clients.map(c => c.id)
      query = query.in('client_id', clientIds)
    }

    // Search by order number
    if (orderNumber) {
      query = query.ilike('order_number', `%${orderNumber}%`)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch service orders' },
        { status: 500 }
      )
    }

    // Anonymize client data slightly (security)
    const sanitizedOrders = orders?.map(order => ({
      ...order,
      client: {
        name: order.client?.name || 'Unknown',
        phone: order.client?.phone ? maskPhone(order.client.phone) : 'N/A'
      }
    }))

    return NextResponse.json({
      success: true,
      orders: sanitizedOrders || [],
      count: sanitizedOrders?.length || 0
    })
  } catch (error) {
    console.error('Error in track-service:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper: Mask phone number for privacy
function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone
  
  const visibleStart = 3
  const visibleEnd = 3
  const masked = phone.slice(0, visibleStart) + 
                 '*'.repeat(Math.max(0, phone.length - visibleStart - visibleEnd)) + 
                 phone.slice(-visibleEnd)
  
  return masked
}
