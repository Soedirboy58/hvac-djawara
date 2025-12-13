import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/service-requests - Create new service request from landing page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, service_type, address, preferred_date, preferred_time, notes } = body;

    // Validate required fields
    if (!name || !phone || !service_type || !preferred_date) {
      return NextResponse.json(
        { error: 'Name, phone, service_type, and preferred_date are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get HVAC Djawara tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'hvac-djawara')
      .single();

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 500 }
      );
    }

    // Check if client exists by phone
    let clientId: string;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .eq('tenant_id', tenant.id)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
      
      // Update client info if provided
      if (email || address) {
        await supabase
          .from('clients')
          .update({
            ...(email && { email }),
            ...(address && { address }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId);
      }
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          name,
          phone,
          email: email || null,
          address: address || null,
          client_type: 'individual',
        })
        .select('id')
        .single();

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: 'Failed to create client' },
          { status: 500 }
        );
      }

      clientId = newClient.id;
    }

    // Prepare scheduled date based on preferred date and time
    let scheduledDate = null;
    if (preferred_date) {
      const date = new Date(preferred_date);
      
      // Set time based on preferred_time
      switch (preferred_time) {
        case 'pagi':
          date.setHours(9, 0, 0);
          break;
        case 'siang':
          date.setHours(12, 0, 0);
          break;
        case 'sore':
          date.setHours(15, 0, 0);
          break;
        default:
          date.setHours(9, 0, 0);
      }
      
      scheduledDate = date.toISOString();
    }

    // Create service order
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .insert({
        tenant_id: tenant.id,
        client_id: clientId,
        order_type: service_type,
        status: 'pending',
        priority: 'medium',
        description: notes || `Request ${service_type} dari website\nWaktu yang diinginkan: ${preferred_time} (${preferred_date})`,
        location: address || null,
        source: 'web',
        scheduled_start: scheduledDate,
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        client_id: clientId,
        message: 'Request berhasil dikirim. Tim kami akan menghubungi Anda segera.',
      },
    });
  } catch (error: any) {
    console.error('Error creating service request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
