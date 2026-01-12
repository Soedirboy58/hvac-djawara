// ============================================
// Settings Page
// Tenant and user settings
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentBrandingSettingsCard } from '@/components/settings/DocumentBrandingSettingsCard'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants:active_tenant_id(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and tenant settings</p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <p className="mt-1 text-gray-900">{profile?.full_name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tenant Information */}
        {profile?.tenants && (
          <Card>
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <p className="mt-1 text-gray-900">{profile.tenants.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Subscription Status</label>
                <div className="mt-1">
                  <Badge variant={
                    profile.tenants.subscription_status === 'active' ? 'success' :
                    profile.tenants.subscription_status === 'trial' ? 'warning' : 'error'
                  }>
                    {profile.tenants.subscription_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Branding (Kop) */}
        <DocumentBrandingSettingsCard />

        {/* Placeholder sections */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Password management and 2FA settings coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Email and push notification preferences coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
