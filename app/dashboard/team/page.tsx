import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team - Djawara HVAC',
  description: 'Manage team members',
}

export default function TeamPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-gray-600">Recruit, manage, and assign technicians</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Team members list will be displayed here</p>
      </div>
    </div>
  )
}
