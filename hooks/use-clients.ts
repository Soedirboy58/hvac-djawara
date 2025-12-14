// ============================================
// useClients Hook
// Client data fetching and mutations
// ============================================

'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'

export interface Client {
  id: string
  tenant_id: string
  name: string
  email?: string
  phone: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) {
        throw new Error('No active tenant')
      }

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', profile.active_tenant_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setClients(data || [])
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch clients')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const refetch = useCallback(() => {
    fetchClients()
  }, [fetchClients])

  return {
    clients,
    loading,
    error,
    refetch,
  }
}

// Hook to get single client by ID
export function useClient(clientId: string | null) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (fetchError) throw fetchError

      setClient(data)
    } catch (err) {
      console.error('Error fetching client:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch client')
    } finally {
      setLoading(false)
    }
  }, [clientId, supabase])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  return {
    client,
    loading,
    error,
  }
}

// Hook to create/update client
export function useCreateClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const createClient = useCallback(async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'is_active'>) => {
    try {
      setLoading(true)
      setError(null)

      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) {
        throw new Error('No active tenant')
      }

      const { data, error: createError } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          tenant_id: profile.active_tenant_id,
          is_active: true,
        })
        .select()
        .single()

      if (createError) throw createError

      return data
    } catch (err) {
      console.error('Error creating client:', err)
      setError(err instanceof Error ? err.message : 'Failed to create client')
      return null
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    createClient,
    loading,
    error,
  }
}
