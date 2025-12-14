'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Clock, User, MapPin, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOrders, useUpdateOrder, OrderStatus } from '@/hooks/use-orders'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import moment from 'moment'
import KanbanColumn from './kanban-column'
import KanbanCard from './kanban-card'
import OrderDetailModal from './order-detail-modal'

const columns: { id: OrderStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'Pending', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-blue-100 border-blue-300' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-purple-100 border-purple-300' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100 border-green-300' },
  { id: 'cancelled', title: 'Cancelled', color: 'bg-red-100 border-red-300' },
]

export default function ScheduleKanbanView() {
  const router = useRouter()
  const { orders, loading, error, refetch } = useOrders()
  const { updateOrder } = useUpdateOrder()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleCardClick = (order: any) => {
    setSelectedOrder(order)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedOrder(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const orderId = active.id as string
    
    // Check if dropped over a column (status) or another card
    let newStatus: OrderStatus
    
    // If dropped over a column, over.id will be the status
    if (columns.some(col => col.id === over.id)) {
      newStatus = over.id as OrderStatus
    } else {
      // If dropped over a card, find which column it belongs to
      const targetOrder = orders.find(o => o.id === over.id)
      if (!targetOrder) return
      newStatus = targetOrder.status as OrderStatus
    }

    // Find the order being moved
    const order = orders.find(o => o.id === orderId)
    if (!order || order.status === newStatus) return

    // Update order status
    const success = await updateOrder(orderId, { status: newStatus })
    
    if (success) {
      toast.success(`Order moved to ${newStatus}`)
      refetch()
    } else {
      toast.error('Failed to update order status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Group orders by status
  const ordersByStatus = columns.reduce((acc, col) => {
    acc[col.id] = orders.filter(o => o.status === col.id)
    return acc
  }, {} as Record<OrderStatus, typeof orders>)

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-5 gap-4">
        {columns.map(col => (
          <Card key={col.id} className={col.color}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{ordersByStatus[col.id].length}</div>
              <div className="text-sm text-gray-600">{col.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
      >
        <div className="grid grid-cols-5 gap-4">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={ordersByStatus[column.id].length}
              color={column.color}
            >
              <SortableContext
                items={ordersByStatus[column.id].map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {ordersByStatus[column.id].map(order => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      onClick={() => handleCardClick(order)}
                    />
                  ))}
                  {ordersByStatus[column.id].length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No orders
                    </div>
                  )}
                </div>
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {activeOrder && <KanbanCard order={activeOrder} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Quick Add Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => router.push('/dashboard/orders/new')}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Create New Order
        </Button>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          open={modalOpen}
          onClose={handleCloseModal}
          onUpdate={refetch}
        />
      )}
    </div>
  )
}
