// ============================================
// Client Dashboard Summary
// KPIs: Total AC Units, AC Types, Conditions
// Service History with Pagination
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Snowflake, 
  Wrench, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClientDashboardProps {
  clientId: string
}

interface ACStats {
  total_units: number
  total_properties: number
  by_type: { ac_type: string; count: number }[]
  by_condition: { condition_status: string; count: number }[]
}

interface ServiceOrder {
  id: string
  order_code: string
  order_type: string
  status: string
  scheduled_date: string
  created_at: string
}

export function ClientDashboard({ clientId }: ClientDashboardProps) {
  const [stats, setStats] = useState<ACStats | null>(null)
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 5

  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [clientId, page])

  async function fetchDashboardData() {
    try {
      // Fetch AC statistics
      const { data: acData } = await supabase
        .from('ac_units')
        .select('ac_type, condition_status, property_id')
        .eq('client_id', clientId)

      if (acData) {
        // Count by type
        const typeCount: Record<string, number> = {}
        const conditionCount: Record<string, number> = {}
        const properties = new Set()

        acData.forEach(unit => {
          typeCount[unit.ac_type] = (typeCount[unit.ac_type] || 0) + 1
          conditionCount[unit.condition_status] = (conditionCount[unit.condition_status] || 0) + 1
          properties.add(unit.property_id)
        })

        setStats({
          total_units: acData.length,
          total_properties: properties.size,
          by_type: Object.entries(typeCount).map(([ac_type, count]) => ({ ac_type, count })),
          by_condition: Object.entries(conditionCount).map(([condition_status, count]) => ({ condition_status, count }))
        })
      }

      // Fetch service orders with pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data: ordersData, count } = await supabase
        .from('service_orders')
        .select('id, order_number, service_type, job_type, status, scheduled_date, created_at', { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(from, to)

      // Transform data to match interface (map order_number to order_code, service_type to order_type)
      const transformedOrders = (ordersData || []).map(order => ({
        ...order,
        order_code: order.order_number,
        order_type: order.service_type || order.job_type || 'maintenance'
      }))

      setOrders(transformedOrders)
      setTotalPages(Math.ceil((count || 0) / pageSize))
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const conditionColors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-yellow-100 text-yellow-700',
    poor: 'bg-orange-100 text-orange-700',
    broken: 'bg-red-100 text-red-700'
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  }

  if (loading) {
    return <div className="animate-pulse">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total AC Units */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total AC Units</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats?.total_units || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Across {stats?.total_properties || 0} properties
                </p>
              </div>
              <Snowflake className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* AC Types Breakdown */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">AC Types</p>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              {stats?.by_type.slice(0, 3).map(({ ac_type, count }) => (
                <div key={ac_type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{ac_type.replace('_', ' ')}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Conditions</p>
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              {stats?.by_condition.map(({ condition_status, count }) => (
                <div key={condition_status} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs ${conditionColors[condition_status] || 'bg-gray-100'}`}>
                    {condition_status}
                  </span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Service History
          </CardTitle>
          <p className="text-sm text-gray-500">Recent service orders</p>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No service orders yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Order Code</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Scheduled</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {order.order_code}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                          {order.order_type.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {order.scheduled_date 
                            ? new Date(order.scheduled_date).toLocaleDateString('id-ID')
                            : '-'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${statusColors[order.status] || 'bg-gray-100'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
