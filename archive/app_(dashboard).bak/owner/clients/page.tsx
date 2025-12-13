import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clients - Djawara HVAC',
  description: 'Manage clients',
}

export default function ClientsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="text-gray-600">Manage customer information</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Client list will be displayed here</p>
      </div>
    </div>
  )
}
