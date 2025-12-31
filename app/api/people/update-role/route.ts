import { NextResponse } from 'next/server'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

type Body = {
  tenantId: string
  userId: string
  newRole: string
}

const ADMIN_ROLES = ['owner', 'admin_finance', 'admin_logistic', 'tech_head'] as const

// Roles stored in user_tenant_roles.role (enum user_role) that affect technician portal access.
// Keep these mutually exclusive so "maybeSingle" role lookups behave deterministically.
const STAFF_TECH_ROLES = ['helper', 'technician', 'tech_head'] as const

function isAllowedNewRole(role: string) {
  return STAFF_TECH_ROLES.includes(role as any)
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Partial<Body>
    const tenantId = String(body?.tenantId || '').trim()
    const userId = String(body?.userId || '').trim()
    const newRoleRaw = String(body?.newRole || '').trim()
    const newRole = newRoleRaw.toLowerCase()

    if (!tenantId || !userId || !newRole) {
      return NextResponse.json({ error: 'Missing tenantId, userId, or newRole' }, { status: 400 })
    }

    if (!isAllowedNewRole(newRole)) {
      return NextResponse.json({ error: 'Invalid newRole' }, { status: 400 })
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

    const viewerRole = String((roleRow as any)?.role || '')
    if (!viewerRole || !(ADMIN_ROLES as readonly string[]).includes(viewerRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Deactivate existing active staff-tech roles for this user (avoid multiple-active rows breaking maybeSingle()).
    // IMPORTANT: Do not deactivate other roles (admin_finance, etc.) so role-based access stays intact.
    const { error: deactivateError } = await admin
      .from('user_tenant_roles')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role', STAFF_TECH_ROLES as unknown as string[])

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }

    const now = new Date().toISOString()

    const { error: upsertError } = await admin
      .from('user_tenant_roles')
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          role: newRole,
          is_active: true,
          assigned_by: user.id,
          assigned_at: now,
        } as any,
        { onConflict: 'user_id,tenant_id,role' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in update-role API:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
