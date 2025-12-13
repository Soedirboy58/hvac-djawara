// ============================================
// useTenants Hook
// Tenant management and switching
// ============================================

'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export function useTenants(userId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Fetch user's profile with active tenant
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*, tenants:active_tenant_id(*)')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  // Switch active tenant
  const switchTenant = useMutation({
    mutationFn: async (tenantId: string) => {
      if (!userId) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({ active_tenant_id: tenantId })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      router.refresh()
    },
  })

  return {
    profile,
    activeTenant: profile?.tenants,
    isLoading,
    switchTenant: switchTenant.mutate,
    isSwitching: switchTenant.isPending,
  }
}
