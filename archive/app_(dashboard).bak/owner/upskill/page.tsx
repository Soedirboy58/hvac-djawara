import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Upskill - Djawara HVAC',
  description: 'Training and certifications',
}

export default function UpskillPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Upskill</h1>
        <p className="text-gray-600">Training materials and certifications</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Training programs will be displayed here</p>
      </div>
    </div>
  )
}
