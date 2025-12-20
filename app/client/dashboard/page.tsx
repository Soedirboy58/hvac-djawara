// ============================================
// Client Portal Dashboard Page
// Overview for clients
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, FileText, CheckCircle, Calendar, Users, Download } from 'lucide-react'
import Link from 'next/link'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/client/login')

  const clientId = user.user_metadata?.client_id
  if (!clientId) redirect('/client/login')

  // Get client data
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  // Get orders count
  const { count: pendingOrders } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .in('status', ['pending', 'confirmed', 'in_progress'])

  const { count: completedOrders } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'completed')

  // Get active contracts
  const { count: activeContracts } = await supabase
    .from('maintenance_contracts')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('is_active', true)

  // Get recent orders with technician info from the view
  const { data: recentOrders } = await supabase
    .from('order_with_technicians')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="p-6">
      {/* TESTING - VERSION 3.0 - IF YOU SEE THIS, DEPLOYMENT IS WORKING */}
      <div className="bg-red-500 text-white p-4 mb-4 rounded-lg font-bold text-center">
        🚨 TEST MODE - VERSION 3.0 - DEPLOYMENT WORKING! 🚨
      </div>

      {/* Welcome Section with Client Name */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {client?.name || 'Guest'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's an overview of your services and contracts
            </p>
            {client && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-500">
                <p className="font-semibold text-blue-900 mb-2">Your Profile:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {client.name}</p>
                  {client.email && <p><span className="font-medium">Email:</span> {client.email}</p>}
                  {client.phone && <p><span className="font-medium">Phone:</span> {client.phone}</p>}
                  {client.client_type && <p><span className="font-medium">Type:</span> {client.client_type.replace('_', ' ')}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Orders
            </CardTitle>
            <Package className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Contracts
            </CardTitle>
            <FileText className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Maintenance contracts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed Services
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Total completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Next Service
            </CardTitle>
            <Calendar className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-gray-500 mt-1">
              No scheduled service
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-lg">
                          {order.order_number}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'scheduled'
                              ? 'bg-indigo-100 text-indigo-800'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-base font-medium text-gray-700">
                        {order.service_title || order.order_type}
                      </p>
                    </div>
                  </div>

                  {/* Project Timeline */}
                  {(order.scheduled_date || order.scheduled_time) && (
                    <div className="bg-blue-50 rounded-md p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">Project Schedule</p>
                          <div className="mt-1 space-y-1">
                            {order.scheduled_date && (
                              <p className="text-sm text-blue-700">
                                📅 Start: {new Date(order.scheduled_date).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                                {order.scheduled_time && ` at ${order.scheduled_time}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Service Description / Work Notes */}
                  {order.service_description && (
                    <div className="bg-gray-50 rounded-md p-3 mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Work Description / Notes
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {order.service_description}
                      </p>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {order.notes && (
                    <div className="bg-amber-50 rounded-md p-3 mb-3">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">
                        📝 Additional Notes
                      </p>
                      <p className="text-sm text-amber-900 leading-relaxed">
                        {order.notes}
                      </p>
                    </div>
                  )}

                  {/* Technician Assignment */}
                  {order.assigned_technician_names && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Technician PIC:</span>
                      <span className="text-gray-900">{order.assigned_technician_names}</span>
                      {order.technician_count && order.technician_count > 1 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {order.technician_count} persons
                        </span>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {order.location_address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">📍</span>
                      <span className="flex-1">{order.location_address}</span>
                    </div>
                  )}

                  {/* Footer - Created Date & Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Created: {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {order.status === 'completed' && (
                      <a
                        href={`/api/reports/${order.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF Report
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No orders yet</p>
              <p className="text-sm mt-1">
                Your service orders will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
