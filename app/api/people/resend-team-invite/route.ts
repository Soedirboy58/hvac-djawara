import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

type Body = {
  tenantId: string
  invitationId: string
}

function getBaseUrlFromRequest(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) {
    try {
      return new URL(envUrl).origin
    } catch {
      // ignore
    }
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return 'https://hvac-djawara.vercel.app'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<Body>
    const tenantId = String(body?.tenantId || '').trim()
    const invitationId = String(body?.invitationId || '').trim()

    if (!tenantId || !invitationId) {
      return NextResponse.json({ error: 'Missing tenantId or invitationId' }, { status: 400 })
    }

    const { data: roleRow, error: roleError } = await supabase
      .from('user_tenant_roles')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 })
    }

    if (!roleRow || !['owner', 'admin_finance', 'admin_logistic', 'tech_head'].includes(roleRow.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('id, tenant_id, token, email, role, status, expires_at')
      .eq('id', invitationId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already activated or cancelled' }, { status: 409 })
    }

    const now = Date.now()
    const expMs = invitation.expires_at ? new Date(invitation.expires_at as any).getTime() : NaN
    const isExpired = Number.isFinite(expMs) ? expMs < now : false

    let effectiveToken = String(invitation.token || '')
    let effectiveExpiresAt = invitation.expires_at

    // If expired, generate a fresh token and extend expiry.
    if (isExpired) {
      const newToken = crypto.randomUUID()
      const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: updated, error: updateError } = await supabase
        .from('team_invitations')
        .update({ token: newToken, expires_at: expiresAt })
        .eq('id', invitationId)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .select('token, expires_at')
        .maybeSingle()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      effectiveToken = String((updated as any)?.token || newToken)
      effectiveExpiresAt = String((updated as any)?.expires_at || expiresAt)
    }

    // For team invites, we currently do not send emails from server.
    // We provide the activation URL so admin can forward it (WhatsApp/email).
    const baseUrl = getBaseUrlFromRequest(request)
    const invitationUrl = `${baseUrl}/team/invite/${effectiveToken}`

    return NextResponse.json({
      success: true,
      tokenSent: false,
      invitationUrl,
      warning: 'Email invitation is not configured; share this link manually.',
      meta: {
        email: invitation.email,
        role: invitation.role,
        token: effectiveToken,
        expires_at: effectiveExpiresAt,
        regenerated: isExpired,
      },
    })
  } catch (error: any) {
    console.error('Error in resend-team-invite API:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
