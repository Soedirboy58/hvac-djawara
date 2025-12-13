'use client'

import { useOrders } from '@/domain/operations/orders/hooks/useOrders'
import OrderList from '@/domain/operations/orders/components/OrderList'
import { CreateOrderModal } from '@/domain/operations/orders/components/CreateOrderModal'
import { Button } from '@/components/ui/button'
import { Plus, Filter } from 'lucide-react'
import { useState } from 'react'

export default function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const filteredOrders = orders?.filter(order => 
    filterStatus === 'all' || order.status === filterStatus
  ) || []

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading orders: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-gray-600">
            {orders?.length || 0} total orders
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        <Filter className="h-5 w-5 text-gray-400" />
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filterStatus === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('scheduled')}
          >
            Scheduled
          </Button>
          <Button
            variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('in_progress')}
          >
            In Progress
          </Button>
          <Button
            variant={filterStatus === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <OrderList 
        orders={filteredOrders}
        onSelectOrder={(order) => {
          console.log('Selected order:', order)
          // TODO: Open order detail modal/page
        }}
      />

      {/* Create Order Modal */}
      <CreateOrderModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  )
}
