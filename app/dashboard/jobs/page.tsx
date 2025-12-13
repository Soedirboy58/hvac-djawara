// ============================================
// Jobs Kanban Board Page
// Visual workflow management
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobsKanban } from './jobs-kanban'

export default async function JobsPage() {
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

  if (!profile?.active_tenant_id) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please set up your tenant first from the dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs Board</h1>
        <p className="text-gray-500 mt-1">Manage technician assignments and job progress</p>
      </div>

      <JobsKanban tenantId={profile.active_tenant_id} />
    </div>
  )
}
