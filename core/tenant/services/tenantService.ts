import { createClient } from '@/lib/supabase/client'

export const tenantService = {
  async getUserTenants(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_tenant_roles')
      .select('tenant_id, tenants(*)')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) throw error
    return data.map((item: any) => item.tenants)
  },

  async setActiveTenant(userId: string, tenantId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ active_tenant_id: tenantId })
      .eq('id', userId)

    if (error) throw error
  },
}
