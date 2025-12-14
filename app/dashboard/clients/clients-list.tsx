// ============================================
// Clients List Component
// Display clients with filters
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Phone, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Client {
  id: string
  name: string
  client_type: string
  email: string | null
  phone: string | null
  address: string | null
  portal_enabled: boolean
}

interface ClientsListProps {
  tenantId: string
}

export function ClientsList({ tenantId }: ClientsListProps) {
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClients() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, client_type, email, phone, address, portal_enabled')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setClients(data)
      }
      setLoading(false)
    }

    fetchClients()
  }, [tenantId])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search clients by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Link key={client.id} href={`/dashboard/clients/${client.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    <Badge variant={client.client_type === 'rumah_tangga' ? 'secondary' : 'default'} className="mt-1">
                      {client.client_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Rumah Tangga'}
                    </Badge>
                  </div>
                  <Badge variant={client.portal_enabled ? 'success' : 'secondary'}>
                    {client.portal_enabled ? 'Portal Active' : 'No Portal'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {client.email || '-'}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {client.phone || '-'}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {client.address || '-'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {clients.length === 0 ? 'No clients yet. Add your first client!' : 'No clients found'}
          </p>
        </div>
      )}
    </div>
  )
}
