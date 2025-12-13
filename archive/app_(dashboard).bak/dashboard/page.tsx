// ============================================
// Dashboard Home Page
// Overview & Stats
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants:active_tenant_id(*)')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Selamat datang kembali, {profile?.full_name || user.email}!</p>
      </div>

      {!profile?.active_tenant_id && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-6">
          <h3 className="font-semibold">Belum Ada Tenant Aktif</h3>
          <p className="text-sm">Anda belum terdaftar di tenant manapun. Silakan hubungi administrator untuk mendapatkan akses.</p>
        </div>
      )}

      {profile?.active_tenant_id && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600">Total Clients</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">-</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600">Active Jobs</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">-</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600">Pending Orders</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">-</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600">Revenue (Month)</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">-</p>
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Getting Started</h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm mr-3 mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Complete Your Profile</h4>
              <p className="text-sm text-gray-600">Add your contact information and avatar</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm mr-3 mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Setup Your Tenant</h4>
              <p className="text-sm text-gray-600">Configure company settings and business hours</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm mr-3 mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Invite Team Members</h4>
              <p className="text-sm text-gray-600">Add technicians, admins, and other staff</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm mr-3 mt-0.5">
              4
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Add Your First Client</h4>
              <p className="text-sm text-gray-600">Start managing your customer database</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
