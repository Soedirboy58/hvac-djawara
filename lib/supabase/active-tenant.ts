import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type SbClient = SupabaseClient<Database>

export async function getActiveTenantId(supabase: SbClient): Promise<string | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) return null

  const userId = authData.user.id

  // Preferred: profiles.active_tenant_id
  const { data: profileData } = await supabase
    .from('profiles')
    .select('active_tenant_id')
    .eq('id', userId)
    .maybeSingle()

  const profileTenantId = String((profileData as any)?.active_tenant_id || '').trim()
  if (profileTenantId) return profileTenantId

  // Fallback: last active role assignment
  const { data: roleData } = await supabase
    .from('user_tenant_roles')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const roleTenantId = String((roleData as any)?.tenant_id || '').trim()
  if (!roleTenantId) return null

  // Heal profile for future RLS checks
  const updateRes = await supabase
    .from('profiles')
    .update({ active_tenant_id: roleTenantId })
    .eq('id', userId)

  if (updateRes.error) {
    await supabase
      .from('profiles')
      .upsert({ id: userId, active_tenant_id: roleTenantId }, { onConflict: 'id' })
  }

  return roleTenantId
}
