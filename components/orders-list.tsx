'use client'

import { useState } from 'react'
import { useOrders } from '@/domain/operations/orders/hooks/useOrders'
import { OrderStatus } from '@/domain/operations/orders/types/order.types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2, Eye } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

interface OrdersListProps {
  onSelectOrder?: (orderId: string) => void
}

export function OrdersList({ onSelectOrder }: OrdersListProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const options = statusFilter === 'all' ? {} : { status: statusFilter as OrderStatus }
  const { orders, loading, error } = useOrders(options)

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-'
    return timeString
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Service Orders</h2>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                  <TableCell className="font-medium">{order.client?.name || '-'}</TableCell>
                  <TableCell className="text-sm">{order.service_title}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate" title={order.location_address}>
                    {order.location_address}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    <div>{formatDate(order.scheduled_date)}</div>
                    {order.scheduled_time && (
                      <div className="text-xs text-muted-foreground">{formatTime(order.scheduled_time)}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{order.technician?.full_name || 'Unassigned'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectOrder?.(order.id)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
