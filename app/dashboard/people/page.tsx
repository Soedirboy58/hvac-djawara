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

  // Fetch role hierarchy for display (fallback if view doesn't exist)
  const { data: roleHierarchy } = await supabase
    .from('role_hierarchy')
    .select('*')
    .order('sort_order')

  // Create default role hierarchy if view doesn't exist yet
  const defaultRoleHierarchy = [
    { role_name: 'owner', category: 'Executive', display_name: 'Pemilik Perusahaan', sort_order: 1 },
    { role_name: 'direktur', category: 'Executive', display_name: 'Direktur', sort_order: 2 },
    { role_name: 'manager', category: 'Management', display_name: 'Manager', sort_order: 3 },
    { role_name: 'supervisor', category: 'Management', display_name: 'Supervisor', sort_order: 4 },
    { role_name: 'admin_finance', category: 'Management', display_name: 'Admin Finance', sort_order: 5 },
    { role_name: 'admin_logistic', category: 'Management', display_name: 'Admin Logistik', sort_order: 6 },
    { role_name: 'admin', category: 'Administrative', display_name: 'Admin', sort_order: 7 },
    { role_name: 'sales_partner', category: 'Sales & Marketing', display_name: 'Sales Partner', sort_order: 8 },
    { role_name: 'marketing', category: 'Sales & Marketing', display_name: 'Marketing', sort_order: 9 },
    { role_name: 'business_dev', category: 'Sales & Marketing', display_name: 'Business Development', sort_order: 10 },
    { role_name: 'tech_head', category: 'Senior Technical', display_name: 'Kepala Teknisi', sort_order: 11 },
    { role_name: 'senior_teknisi', category: 'Senior Technical', display_name: 'Teknisi Senior', sort_order: 12 },
    { role_name: 'technician', category: 'Technical', display_name: 'Teknisi', sort_order: 13 },
    { role_name: 'teknisi', category: 'Technical', display_name: 'Teknisi', sort_order: 14 },
    { role_name: 'helper', category: 'Support', display_name: 'Helper', sort_order: 15 },
    { role_name: 'magang', category: 'Support', display_name: 'Magang/Trainee', sort_order: 16 },
    { role_name: 'client', category: 'External', display_name: 'Client', sort_order: 17 },
  ]

  // Fetch all team members - use raw SQL to get email from auth.users
  const { data: teamMembers, error: teamError } = await supabase.rpc('get_team_members', {
    p_tenant_id: profile.active_tenant_id
  })

  console.log('Team members data:', teamMembers, 'Error:', teamError)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
        <p className="text-gray-500 mt-1">Manage your team members and organizational structure</p>
      </div>

      <PeopleManagementClient 
        tenantId={profile.active_tenant_id}
        initialTeamMembers={teamMembers || []}
        roleHierarchy={roleHierarchy || defaultRoleHierarchy}
      />
    </div>
  )
}
