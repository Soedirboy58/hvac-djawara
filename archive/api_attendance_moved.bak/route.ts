import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const technician_id = searchParams.get('technician_id') || user.id;
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '30');

    let query = supabase
      .from('daily_attendance')
      .select('*')
      .eq('technician_id', technician_id)
      .order('date', { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
