// ============================================
// Client Service
// CRM client operations
// ============================================

import { createClient } from '@/lib/supabase/server'

export interface ClientData {
  name: string
  email: string
  phone: string
  type: 'residential' | 'commercial'
  address: string
  city: string
  notes?: string
}

export class ClientService {
  static async getClients(tenantId: string) {
    const supabase = await createClient()
    
    // TODO: Replace with actual table name when clients table is created
    // const { data, error } = await supabase
    //   .from('clients')
    //   .select('*')
    //   .eq('tenant_id', tenantId)
    //   .order('created_at', { ascending: false })

    // if (error) throw error
    // return data
    
    return []
  }

  static async getClient(clientId: string) {
    const supabase = await createClient()
    
    // TODO: Replace with actual query
    // const { data, error } = await supabase
    //   .from('clients')
    //   .select('*')
    //   .eq('id', clientId)
    //   .single()

    // if (error) throw error
    // return data
    
    return null
  }

  static async createClient(tenantId: string, clientData: ClientData) {
    const supabase = await createClient()
    
    // TODO: Replace with actual insert
    // const { data, error } = await supabase
    //   .from('clients')
    //   .insert([{
    //     ...clientData,
    //     tenant_id: tenantId,
    //     status: 'active',
    //   }])
    //   .select()
    //   .single()

    // if (error) throw error
    // return data
    
    console.log('Creating client in service:', { tenantId, clientData })
    return { id: 'mock-id', ...clientData }
  }

  static async updateClient(clientId: string, updates: Partial<ClientData>) {
    const supabase = await createClient()
    
    // TODO: Replace with actual update
    // const { data, error } = await supabase
    //   .from('clients')
    //   .update(updates)
    //   .eq('id', clientId)
    //   .select()
    //   .single()

    // if (error) throw error
    // return data
    
    console.log('Updating client in service:', { clientId, updates })
    return { id: clientId, ...updates }
  }

  static async deleteClient(clientId: string) {
    const supabase = await createClient()
    
    // TODO: Replace with actual delete
    // const { error } = await supabase
    //   .from('clients')
    //   .delete()
    //   .eq('id', clientId)

    // if (error) throw error
    
    console.log('Deleting client in service:', clientId)
  }

  static async searchClients(tenantId: string, query: string) {
    const supabase = await createClient()
    
    // TODO: Replace with actual search
    // const { data, error } = await supabase
    //   .from('clients')
    //   .select('*')
    //   .eq('tenant_id', tenantId)
    //   .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    //   .order('created_at', { ascending: false })

    // if (error) throw error
    // return data
    
    return []
  }
}
