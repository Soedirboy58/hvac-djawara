import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call function to generate orders
    const { data, error } = await supabase.rpc('check_and_generate_maintenance_orders')

    if (error) {
      console.error('Error generating orders:', error)
      return NextResponse.json(
        { error: 'Failed to generate orders', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      generated_orders: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get ALL active maintenance schedules (let frontend filter)
    const { data, error } = await supabase
      .from('v_upcoming_maintenance')
      .select('*')
      .order('days_until', { ascending: true })

    if (error) {
      console.error('Error fetching maintenance:', error)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming maintenance', details: error.message },
        { status: 500 }
      )
    }

    console.log('Fetched maintenance schedules:', data?.length || 0)

    return NextResponse.json({
      success: true,
      upcoming_maintenance: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
