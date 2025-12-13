// ============================================
// Finance Page
// Billing and payments
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Clock } from 'lucide-react'

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

  // Mock financial data
  const stats = [
    { label: 'Total Revenue', value: 'Rp 125,000,000', icon: DollarSign, trend: 'up' },
    { label: 'Outstanding', value: 'Rp 15,500,000', icon: Clock, trend: 'neutral' },
    { label: 'This Month', value: 'Rp 28,750,000', icon: TrendingUp, trend: 'up' },
    { label: 'Expenses', value: 'Rp 12,300,000', icon: TrendingDown, trend: 'down' },
  ]

  const recentInvoices = [
    { id: 'INV-001', client: 'ABC Corporation', amount: 5000000, status: 'paid', date: '2025-01-15' },
    { id: 'INV-002', client: 'John Doe', amount: 1500000, status: 'pending', date: '2025-01-18' },
    { id: 'INV-003', client: 'XYZ Industries', amount: 2500000, status: 'overdue', date: '2025-01-10' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Manage invoices, payments, and expenses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  stat.trend === 'up' ? 'bg-green-100' :
                  stat.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <stat.icon className={`w-5 h-5 ${
                    stat.trend === 'up' ? 'text-green-600' :
                    stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-gray-900">{invoice.id}</h4>
                    <Badge variant={
                      invoice.status === 'paid' ? 'success' :
                      invoice.status === 'pending' ? 'warning' : 'error'
                    }>
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{invoice.client}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    Rp {invoice.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(invoice.date).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
