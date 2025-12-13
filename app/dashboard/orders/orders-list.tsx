// ============================================
// Orders List Component
// Display service orders with filters
// ============================================

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Calendar, User, DollarSign } from 'lucide-react'
import Link from 'next/link'

// Placeholder data
const MOCK_ORDERS = [
  {
    id: '1',
    order_number: 'ORD-2025-001',
    client_name: 'ABC Corporation',
    service_type: 'AC Installation',
    status: 'pending',
    priority: 'high',
    scheduled_date: '2025-01-20',
    estimated_cost: 5000000,
  },
  {
    id: '2',
    order_number: 'ORD-2025-002',
    client_name: 'John Doe',
    service_type: 'AC Maintenance',
    status: 'in_progress',
    priority: 'normal',
    scheduled_date: '2025-01-18',
    estimated_cost: 1500000,
  },
  {
    id: '3',
    order_number: 'ORD-2025-003',
    client_name: 'XYZ Industries',
    service_type: 'AC Repair',
    status: 'completed',
    priority: 'urgent',
    scheduled_date: '2025-01-15',
    estimated_cost: 2500000,
  },
]

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'error',
}

const PRIORITY_COLORS: Record<string, 'default' | 'warning' | 'error'> = {
  normal: 'default',
  high: 'warning',
  urgent: 'error',
}

interface OrdersListProps {
  tenantId: string
}

export function OrdersList({ tenantId }: OrdersListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredOrders = MOCK_ORDERS.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(search.toLowerCase()) ||
                         order.client_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search orders by number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                      <Badge variant={STATUS_COLORS[order.status]}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={PRIORITY_COLORS[order.priority]}>
                        {order.priority}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {order.client_name}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(order.scheduled_date).toLocaleDateString('id-ID')}
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Rp {order.estimated_cost.toLocaleString('id-ID')}
                      </div>
                      <div className="font-medium text-gray-900">
                        {order.service_type}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      )}
    </div>
  )
}
