import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is owner or admin
    const { data: userRole } = await supabase
      .from('user_tenant_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || !['owner', 'admin_finance', 'admin_logistic'].includes(userRole.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can add members' },
        { status: 403 }
      )
    }

    // Get request body
    const { fullName, email, phone, role, tenantId } = await request.json()

    // Validate required fields
    if (!fullName || !email || !role || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create invitation record
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Valid for 7 days

    const { error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        tenant_id: tenantId,
        email: email,
        full_name: fullName,
        phone: phone || null,
        role: role,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation: ' + inviteError.message },
        { status: 500 }
      )
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hvac-djawara.vercel.app'
    const invitationUrl = `${baseUrl}/invite/${invitationToken}`

    // TODO: Send email with invitation link
    // For now, return the invitation URL
    
    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      invitationUrl: invitationUrl,
      invitation: {
        email: email,
        full_name: fullName,
        role: role,
        expires_at: expiresAt.toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error in add-member API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
