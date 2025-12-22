'use client'

import { useEffect, useMemo, useState } from 'react'
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOrders, useUpdateOrder, OrderStatus } from '@/hooks/use-orders'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import moment from 'moment'
import KanbanColumn from './kanban-column'
import KanbanCard from './kanban-card'
import OrderDetailModal from './order-detail-modal'

const columns: { id: OrderStatus; title: string; color: string; description: string }[] = [
  { 
    id: 'listing', 
    title: 'Listing', 
    color: 'bg-gray-100 border-gray-300',
    description: 'New requests & proposals'
  },
  { 
    id: 'scheduled', 
    title: 'Scheduled', 
    color: 'bg-blue-100 border-blue-300',
    description: 'Approved & scheduled'
  },
  { 
    id: 'in_progress', 
    title: 'In Progress', 
    color: 'bg-purple-100 border-purple-300',
    description: 'Survey, action, checking'
  },
  { 
    id: 'pending', 
    title: 'Pending', 
    color: 'bg-orange-100 border-orange-300',
    description: 'On hold (parts/reschedule)'
  },
  { 
    id: 'completed', 
    title: 'Completed', 
    color: 'bg-green-100 border-green-300',
    description: 'Finished & clear'
  },
  { 
    id: 'cancelled', 
    title: 'Cancelled', 
    color: 'bg-red-100 border-red-300',
    description: 'Cancelled work'
  },
]

export default function ScheduleKanbanView() {
  const router = useRouter()
  const { orders: serverOrders, loading, error, refetch } = useOrders()
  const { updateOrder } = useUpdateOrder()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(() => moment().startOf('month'))

  // Local state for optimistic updates
  const [optimisticOrders, setOptimisticOrders] = useState<any[]>([])
  
  // Use optimistic orders if available, otherwise server orders
  const orders = optimisticOrders.length > 0 ? optimisticOrders : serverOrders
  
  // Sync optimistic with server when server updates
  useEffect(() => {
    if (serverOrders.length > 0 && optimisticOrders.length === 0) {
      setOptimisticOrders(serverOrders)
    }
  }, [serverOrders, optimisticOrders.length])

  const selectedMonthKey = useMemo(() => selectedMonth.format('YYYY-MM'), [selectedMonth])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const scheduledDate = order?.scheduled_date
      if (!scheduledDate) return true

      const m = moment(scheduledDate)
      if (!m.isValid()) return true

      return m.isSame(selectedMonth, 'month')
    })
  }, [orders, selectedMonthKey])

  const DEFAULT_COLUMN_PAGE_SIZE = 20
  const initialVisibleCounts = useMemo(() => {
    return columns.reduce((acc, col) => {
      acc[col.id] = DEFAULT_COLUMN_PAGE_SIZE
      return acc
    }, {} as Record<OrderStatus, number>)
  }, [])

  const [visibleCounts, setVisibleCounts] = useState<Record<OrderStatus, number>>(initialVisibleCounts)

  useEffect(() => {
    setVisibleCounts(initialVisibleCounts)
  }, [selectedMonthKey, initialVisibleCounts])

  // Setup sensors with delay for long press (250ms hold to drag)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

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

    // Optimistic update - instant UI change
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    )
    setOptimisticOrders(updatedOrders)
    
    // Show success immediately
    toast.success(`✓ Moved to ${columns.find(c => c.id === newStatus)?.title}`)

    // Update server in background
    const success = await updateOrder(orderId, { status: newStatus })
    
    if (!success) {
      // Revert on failure
      toast.error('Update failed, reverting...')
      setOptimisticOrders(serverOrders)
    } else {
      // Sync with server after 3 seconds
      setTimeout(() => {
        refetch().then(() => setOptimisticOrders([]))
      }, 3000)
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

  // Group (filtered) orders by status
  const ordersByStatus = columns.reduce((acc, col) => {
    acc[col.id] = filteredOrders.filter(o => o.status === col.id)
    return acc
  }, {} as Record<OrderStatus, typeof filteredOrders>)

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null

  return (
    <div className="space-y-6">
      {/* Month Switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">Bulan:</span>
          <span className="text-gray-900">{selectedMonth.format('MMMM YYYY')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth((m) => moment(m).subtract(1, 'month').startOf('month'))}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth(() => moment().startOf('month'))}
          >
            This month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth((m) => moment(m).add(1, 'month').startOf('month'))}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <span className="font-medium">💡 Tip:</span> Click card untuk view detail • Hold card 0.3 detik untuk drag & drop ke kolom lain
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-6 gap-3">
        {columns.map(col => (
          <Card key={col.id} className={col.color}>
            <CardContent className="p-3">
              <div className="text-2xl font-bold">{ordersByStatus[col.id].length}</div>
              <div className="text-sm font-medium text-gray-700">{col.title}</div>
              <div className="text-xs text-gray-500 mt-1">{col.description}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCorners}
        autoScroll={{ threshold: { x: 0.2, y: 0.2 } }}
      >
        <div className="grid grid-cols-6 gap-3 overflow-x-auto">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={ordersByStatus[column.id].length}
              color={column.color}
              description={column.description}
            >
              {(() => {
                const allOrders = ordersByStatus[column.id]
                const visible = allOrders.slice(0, visibleCounts[column.id])
                const remaining = Math.max(0, allOrders.length - visible.length)

                return (
                  <>
              <SortableContext
                items={visible.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {visible.map(order => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      onClick={() => handleCardClick(order)}
                    />
                  ))}
                  {allOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No orders
                    </div>
                  )}

                  {remaining > 0 && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setVisibleCounts((prev) => ({
                            ...prev,
                            [column.id]: prev[column.id] + DEFAULT_COLUMN_PAGE_SIZE,
                          }))
                        }
                      >
                        Load more ({remaining})
                      </Button>
                    </div>
                  )}
                </div>
              </SortableContext>
                  </>
                )
              })()}
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
