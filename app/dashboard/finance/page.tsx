// ============================================
// Finance Page
// Billing and payments
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanceReimburseClient } from './finance-reimburse-client'

export default async function FinancePage() {
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

  // Finance access only
  const { data: roleRow } = await supabase
    .from('user_tenant_roles')
    .select('role')
    .eq('tenant_id', profile.active_tenant_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!roleRow || !['owner', 'admin_finance'].includes(roleRow.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Reimburse Management</p>
      </div>

      <FinanceReimburseClient tenantId={profile.active_tenant_id} />
    </div>
  )
}
