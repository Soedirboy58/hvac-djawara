import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/attendance/stats - Get attendance statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const technician_id = searchParams.get('technician_id') || user.id;

    // Get current month start and end
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: attendances, error } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('technician_id', technician_id)
      .gte('date', monthStart)
      .lte('date', monthEnd);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total_days: attendances.length,
      on_time_count: attendances.filter(a => !a.is_late && a.clock_in_time).length,
      late_count: attendances.filter(a => a.is_late).length,
      early_leave_count: attendances.filter(a => a.is_early_leave).length,
      absent_count: attendances.filter(a => !a.clock_in_time).length,
      avg_work_hours: attendances.length > 0
        ? attendances.reduce((sum, a) => sum + (a.total_work_hours || 0), 0) / attendances.length
        : 0,
    };

    return NextResponse.json({ data: stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
