'use client'

import { ServiceOrder } from '../types/order.types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/formatters'
import { 
  ClipboardList, 
  Calendar, 
  User, 
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface OrderListProps {
  orders: ServiceOrder[]
  onSelectOrder?: (order: ServiceOrder) => void
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  complaint: { label: 'Complaint', color: 'bg-red-100 text-red-800', icon: XCircle },
  invoiced: { label: 'Invoiced', color: 'bg-indigo-100 text-indigo-800', icon: CheckCircle },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
}

const typeConfig = {
  maintenance: { label: 'Maintenance', icon: '🔧' },
  repair: { label: 'Repair', icon: '🔨' },
  installation: { label: 'Installation', icon: '📦' },
  survey: { label: 'Survey', icon: '📋' },
  troubleshooting: { label: 'Troubleshooting', icon: '🔍' },
}

export default function OrderList({ orders, onSelectOrder }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No orders</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new order.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => {
        const statusInfo = statusConfig[order.status]
        const StatusIcon = statusInfo.icon
        const priorityInfo = priorityConfig[order.priority]
        const typeInfo = typeConfig[order.order_type]

        return (
          <Card
            key={order.id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelectOrder?.(order)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{typeInfo.icon}</span>
                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                    {order.service_title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500">{order.order_number}</p>
              </div>
            </div>

            {/* Client */}
            {order.client && (
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{order.client.name}</span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600 line-clamp-2">
                {order.location_address}
              </span>
            </div>

            {/* Scheduled Date */}
            {order.scheduled_date && (
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {formatDate(order.scheduled_date)}
                  {order.scheduled_time && ` at ${order.scheduled_time}`}
                </span>
              </div>
            )}

            {/* Assigned Technician */}
            {order.assigned_technician && (
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-700">
                  {order.assigned_technician.full_name}
                </span>
              </div>
            )}

            {/* Footer - Status & Priority */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Badge className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <Badge className={priorityInfo.color}>
                {priorityInfo.label}
              </Badge>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
