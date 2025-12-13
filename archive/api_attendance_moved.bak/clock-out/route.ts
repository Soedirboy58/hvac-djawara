import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/attendance/clock-out - Clock out for today
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attendance_id, notes } = body;

    // Get attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('id', attendance_id)
      .single();

    if (fetchError || !attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    if (attendance.clock_out_time) {
      return NextResponse.json(
        { error: 'Sudah melakukan clock out' },
        { status: 400 }
      );
    }

    // Update with clock out time
    const { data, error } = await supabase
      .from('daily_attendance')
      .update({
        clock_out_time: new Date().toISOString(),
        notes: notes || attendance.notes,
      })
      .eq('id', attendance_id)
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
