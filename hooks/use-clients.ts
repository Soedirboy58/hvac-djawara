// ============================================
// useClients Hook
// Client data fetching and mutations
// ============================================

'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Client {
  id: string
  tenant_id: string
  name: string
  email: string
  phone: string
  type: 'residential' | 'commercial'
  address: string
  city: string
  notes?: string
  status: 'active' | 'inactive'
  created_at: string
}

export function useClients(tenantId?: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Fetch all clients for a tenant
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      
      // TODO: Replace with actual table name when created
      // const { data, error } = await supabase
      //   .from('clients')
      //   .select('*')
      //   .eq('tenant_id', tenantId)
      //   .order('created_at', { ascending: false })

      // if (error) throw error
      // return data as Client[]
      
      // Mock data for now
      return [] as Client[]
    },
    enabled: !!tenantId,
  })

  // Fetch single client
  const useClient = (clientId: string) => {
    return useQuery({
      queryKey: ['client', clientId],
      queryFn: async () => {
        // TODO: Replace with actual query
        // const { data, error } = await supabase
        //   .from('clients')
        //   .select('*')
        //   .eq('id', clientId)
        //   .single()

        // if (error) throw error
        // return data as Client
        
        return null
      },
      enabled: !!clientId,
    })
  }

  // Create client
  const createClient = useMutation({
    mutationFn: async (newClient: Omit<Client, 'id' | 'created_at' | 'status'>) => {
      // TODO: Replace with actual insert
      // const { data, error } = await supabase
      //   .from('clients')
      //   .insert([{ ...newClient, status: 'active' }])
      //   .select()
      //   .single()

      // if (error) throw error
      // return data
      
      console.log('Creating client:', newClient)
      return newClient
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] })
    },
  })

  // Update client
  const updateClient = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      // TODO: Replace with actual update
      // const { data, error } = await supabase
      //   .from('clients')
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single()

      // if (error) throw error
      // return data
      
      console.log('Updating client:', id, updates)
      return { id, ...updates }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] })
    },
  })

  // Delete client
  const deleteClient = useMutation({
    mutationFn: async (clientId: string) => {
      // TODO: Replace with actual delete
      // const { error } = await supabase
      //   .from('clients')
      //   .delete()
      //   .eq('id', clientId)

      // if (error) throw error
      
      console.log('Deleting client:', clientId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', tenantId] })
    },
  })

  return {
    clients,
    isLoading,
    useClient,
    createClient: createClient.mutate,
    updateClient: updateClient.mutate,
    deleteClient: deleteClient.mutate,
    isCreating: createClient.isPending,
    isUpdating: updateClient.isPending,
    isDeleting: deleteClient.isPending,
  }
}
