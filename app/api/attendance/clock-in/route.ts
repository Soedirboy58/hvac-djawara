import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/attendance/clock-in - Clock in for today
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { technician_id, notes } = body;

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenant_roles')
      .select('tenant_id')
      .eq('user_id', technician_id || user.id)
      .single();

    if (!userTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already clocked in today
    const { data: existing } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('tenant_id', userTenant.tenant_id)
      .eq('technician_id', technician_id || user.id)
      .eq('date', today)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Sudah melakukan clock in hari ini' },
        { status: 400 }
      );
    }

    // Insert new attendance record
    const { data, error } = await supabase
      .from('daily_attendance')
      .insert({
        tenant_id: userTenant.tenant_id,
        technician_id: technician_id || user.id,
        date: today,
        clock_in_time: new Date().toISOString(),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
