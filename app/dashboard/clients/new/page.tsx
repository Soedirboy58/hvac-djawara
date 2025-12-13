// ============================================
// Add New Client Page
// Form to create new client
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientForm } from '../client-form'

export default async function NewClientPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.active_tenant_id) {
    redirect('/dashboard')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
        <p className="text-gray-500 mt-1">Create a new client record</p>
      </div>

      <ClientForm tenantId={profile.active_tenant_id} />
    </div>
  )
}
