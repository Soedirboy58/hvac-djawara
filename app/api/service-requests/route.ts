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

    const supabase = await createClient();

    // Get HVAC Djawara tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'hvac-djawara')
      .single();

    if (!tenant) {
      console.error('Tenant hvac-djawara not found');
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 500 }
      );
    }

    console.log('Found tenant:', tenant.id);

    // Check if client exists by phone
    let clientId: string;
    const { data: existingClient, error: selectError } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (selectError) {
      console.error('Error selecting client:', selectError);
      return NextResponse.json(
        { error: 'Database error checking client', details: selectError.message },
        { status: 500 }
      );
    }

    if (existingClient) {
      clientId = existingClient.id;
      console.log('Found existing client:', clientId);
      
      // Update client info if provided
      if (email || address) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            ...(email && { email }),
            ...(address && { address }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId);

        if (updateError) {
          console.error('Error updating client:', updateError);
          // Don't fail, just log
        }
      }
    } else {
      // Create new client
      console.log('Creating new client');
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          name,
          phone,
          email: email || null,
          address: address || null,
        })
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        return NextResponse.json(
          { error: 'Failed to create client', details: clientError.message },
          { status: 500 }
        );
      }

      if (!newClient) {
        console.error('No client returned after insert');
        return NextResponse.json(
          { error: 'Failed to create client - no data returned' },
          { status: 500 }
        );
      }

      clientId = newClient.id;
      console.log('Created new client:', clientId);
    }

    // Prepare scheduled time based on preferred time
    let scheduledTime = '09:00:00';
    switch (preferred_time) {
      case 'pagi':
        scheduledTime = '09:00:00';
        break;
      case 'siang':
        scheduledTime = '12:00:00';
        break;
      case 'sore':
        scheduledTime = '15:00:00';
        break;
    }

    // Create service order - match PHASE_1_WORKFLOW.sql schema
    console.log('Creating service order with data:', {
      tenant_id: tenant.id,
      client_id: clientId,
      order_type: service_type,
      service_title: `Request ${service_type} dari website`,
      location_address: address,
      requested_date: preferred_date,
    });

    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .insert({
        tenant_id: tenant.id,
        client_id: clientId,
        order_type: service_type,
        status: 'pending',
        priority: 'medium',
        service_title: `Request ${service_type} dari website`,
        service_description: notes || `Waktu yang diinginkan: ${preferred_time} (${preferred_date})`,
        location_address: address || '',
        requested_date: preferred_date || null,
        scheduled_date: preferred_date || null,
        scheduled_time: scheduledTime,
        notes: notes || null,
        is_survey: false,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      );
    }

    if (!order) {
      console.error('No order returned after insert');
      return NextResponse.json(
        { error: 'Failed to create order - no data returned' },
        { status: 500 }
      );
    }

    console.log('Order created successfully:', order.id);

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
