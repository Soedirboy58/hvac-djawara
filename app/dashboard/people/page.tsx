// ============================================
// People Management Page
// Manage team members and their positions
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PeopleManagementClient } from './people-client'

export const metadata = {
  title: 'People Management | HVAC Djawara',
  description: 'Manage team members and organizational positions',
}

export default async function PeopleManagementPage() {
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

  // Fetch role hierarchy for display
  const { data: roleHierarchy } = await supabase
    .from('role_hierarchy')
    .select('*')
    .order('sort_order')

  // Fetch all team members
  const { data: teamMembers } = await supabase
    .from('user_tenant_roles')
    .select(`
      id,
      user_id,
      role,
      is_active,
      created_at,
      profiles:user_id (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq('tenant_id', profile.active_tenant_id)
    .order('is_active', { ascending: false })
    .order('role')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
        <p className="text-gray-500 mt-1">Manage your team members and organizational structure</p>
      </div>

      <PeopleManagementClient 
        tenantId={profile.active_tenant_id}
        initialTeamMembers={teamMembers || []}
        roleHierarchy={roleHierarchy || []}
      />
    </div>
  )
}
