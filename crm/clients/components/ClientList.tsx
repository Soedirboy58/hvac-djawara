import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Client } from '../types/client.types'

export default function ClientList({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return <div className="text-center py-12 text-gray-500">Belum ada client</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {clients.map((client) => (
        <Card key={client.id}>
          <CardHeader>
            <CardTitle>{client.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{client.email}</p>
            <p className="text-sm text-gray-600">{client.phone}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
