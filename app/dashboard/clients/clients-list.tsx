// ============================================
// Clients List Component
// Display clients with filters
// ============================================

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Phone, Mail } from 'lucide-react'
import Link from 'next/link'

// Placeholder data - will be replaced with real data from Supabase
const MOCK_CLIENTS = [
  {
    id: '1',
    name: 'ABC Corporation',
    type: 'commercial',
    email: 'contact@abc.com',
    phone: '+62-21-1234-5678',
    address: 'Jakarta Selatan',
    status: 'active'
  },
  {
    id: '2',
    name: 'John Doe',
    type: 'residential',
    email: 'john@example.com',
    phone: '+62-812-3456-7890',
    address: 'Tangerang',
    status: 'active'
  },
  {
    id: '3',
    name: 'XYZ Industries',
    type: 'commercial',
    email: 'info@xyz.com',
    phone: '+62-21-9876-5432',
    address: 'Jakarta Pusat',
    status: 'inactive'
  }
]

interface ClientsListProps {
  tenantId: string
}

export function ClientsList({ tenantId }: ClientsListProps) {
  const [search, setSearch] = useState('')

  const filteredClients = MOCK_CLIENTS.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  )

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
                    <Badge variant={client.type === 'commercial' ? 'default' : 'secondary'} className="mt-1">
                      {client.type}
                    </Badge>
                  </div>
                  <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
                    {client.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {client.email}
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {client.phone}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {client.address}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No clients found</p>
        </div>
      )}
    </div>
  )
}
