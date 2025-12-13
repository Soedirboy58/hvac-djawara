'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantService } from '../services/tenantService'
import { useAuth } from '../../auth/hooks/useAuth'

export function useTenant() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: () => tenantService.getUserTenants(user!.id),
    enabled: !!user,
  })

  const switchTenantMutation = useMutation({
    mutationFn: (tenantId: string) => 
      tenantService.setActiveTenant(user!.id, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      window.location.reload()
    },
  })

  return {
    tenants,
    activeTenant: tenants?.[0],
    isLoading,
    switchTenant: switchTenantMutation.mutate,
  }
}
