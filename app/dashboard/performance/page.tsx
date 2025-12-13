import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Performance - Djawara HVAC',
  description: 'Team performance and rankings',
}

export default function PerformancePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Performance</h1>
        <p className="text-gray-600">Team rankings and productivity metrics</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Performance dashboard will be displayed here</p>
      </div>
    </div>
  )
}
