import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings - Djawara HVAC',
  description: 'Company settings',
}

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Company and account settings</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Settings will be displayed here</p>
      </div>
    </div>
  )
}
