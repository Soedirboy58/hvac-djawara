'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../services/clientService'

export function useClients() {
  const queryClient = useQueryClient()

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  const createMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })

  return {
    clients,
    isLoading,
    createClient: createMutation.mutate,
  }
}
