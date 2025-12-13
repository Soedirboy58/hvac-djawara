'use client'

import { useClients } from '@/domain/crm/clients/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import ClientList from '@/domain/crm/clients/components/ClientList'

export default function ClientsPage() {
  const { clients, isLoading } = useClients()

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>
      <ClientList clients={clients || []} />
    </div>
  )
}
