import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Timecard - Djawara HVAC',
  description: 'Attendance and work hours tracking',
}

export default function TimecardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Timecard</h1>
        <p className="text-gray-600">Track attendance and work hours</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Timecard records will be displayed here</p>
      </div>
    </div>
  )
}
