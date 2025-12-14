import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      company_name,
      contact_person,
      phone,
      email,
      address,
      unit_count,
      location_count,
      preferred_frequency,
      notes,
    } = body;

    // Validation
    if (!company_name || !contact_person || !phone || !unit_count) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Insert contract request
    const { data, error } = await supabase
      .from('contract_requests')
      .insert({
        company_name,
        contact_person,
        phone,
        email,
        address,
        unit_count: parseInt(unit_count),
        location_count: parseInt(location_count) || 1,
        preferred_frequency,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create contract request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Contract request submitted successfully',
        data 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('contract_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contract requests', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
