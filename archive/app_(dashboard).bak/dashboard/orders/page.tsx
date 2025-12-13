// ============================================
// Service Orders Page
// List all service orders
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OrdersList } from './orders-list'

export default async function OrdersPage() {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-gray-500 mt-1">Manage customer service requests</p>
        </div>
        <Link href="/dashboard/orders/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      <OrdersList tenantId={profile.active_tenant_id} />
    </div>
  )
}
