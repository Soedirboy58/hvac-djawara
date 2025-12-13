import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Announcements - Djawara HVAC',
  description: 'Company announcements',
}

export default function AnnouncementsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-gray-600">Company-wide announcements</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Announcements will be displayed here</p>
      </div>
    </div>
  )
}
