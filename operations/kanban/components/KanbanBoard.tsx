'use client';

import { useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ServiceOrder, OrderStatus } from '@/domain/operations/orders/types/order.types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useState } from 'react';

interface KanbanBoardProps {
  orders: ServiceOrder[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onSelectOrder: (order: ServiceOrder) => void;
}

const columns: { id: OrderStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'Pending', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-blue-100 border-blue-300' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-purple-100 border-purple-300' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100 border-green-300' },
  { id: 'approved', title: 'BAST Approved', color: 'bg-teal-100 border-teal-300' },
  { id: 'invoiced', title: 'Invoiced', color: 'bg-indigo-100 border-indigo-300' },
];

export function KanbanBoard({ orders, onUpdateStatus, onSelectOrder }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, ServiceOrder[]> = {
      pending: [],
      scheduled: [],
      in_progress: [],
      completed: [],
      approved: [],
      complaint: [],
      invoiced: [],
      paid: [],
      cancelled: [],
    };

    orders.forEach((order) => {
      if (grouped[order.status]) {
        grouped[order.status].push(order);
      }
    });

    return grouped;
  }, [orders]);

  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return orders.find((order) => order.id === activeId) || null;
  }, [activeId, orders]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeOrder = orders.find((o) => o.id === active.id);
    const newStatus = over.id as OrderStatus;

    if (activeOrder && activeOrder.status !== newStatus) {
      onUpdateStatus(activeOrder.id, newStatus);
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            orders={ordersByStatus[column.id] || []}
            onSelectOrder={onSelectOrder}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOrder ? (
          <KanbanCard order={activeOrder} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
