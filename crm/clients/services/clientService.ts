import { createClient } from '@/lib/supabase/client'
import type { Client } from '../types/client.types'

export const clientService = {
  async getClients() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as Client[]
  },

  async getClientById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createClient(client: any) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
