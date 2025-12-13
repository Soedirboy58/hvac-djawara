'use client';

import { useState } from 'react';
import { KanbanSquare, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/domain/operations/orders/hooks/useOrders';
import { useUpdateOrderStatus } from '@/domain/operations/orders/hooks/useUpdateOrderStatus';
import { KanbanBoard } from '@/domain/operations/kanban/components/KanbanBoard';
import { ServiceOrder, OrderStatus } from '@/domain/operations/orders/types/order.types';

export default function KanbanPage() {
  const { data: orders, isLoading, error } = useOrders();
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateStatus({ orderId, status });
  };

  const handleSelectOrder = (order: ServiceOrder) => {
    setSelectedOrder(order);
    // TODO: Open order detail modal
    console.log('Selected order:', order);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-80 h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading kanban: {error.message}</p>
        </div>
      </div>
    );
  }

  const stats = {
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    scheduled: orders?.filter(o => o.status === 'scheduled').length || 0,
    inProgress: orders?.filter(o => o.status === 'in_progress').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-muted-foreground mt-1">
            Drag & drop untuk memindahkan status order
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-2">
            <KanbanSquare className="h-4 w-4" />
            {orders?.length || 0} Total Orders
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700 font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">Scheduled</p>
          <p className="text-2xl font-bold text-blue-900">{stats.scheduled}</p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-700 font-medium">In Progress</p>
          <p className="text-2xl font-bold text-purple-900">{stats.inProgress}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-gray-50 rounded-lg border p-6">
        <KanbanBoard
          orders={orders || []}
          onUpdateStatus={handleUpdateStatus}
          onSelectOrder={handleSelectOrder}
        />
      </div>
    </div>
  );
}

