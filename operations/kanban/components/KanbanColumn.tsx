'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ServiceOrder, OrderStatus } from '@/domain/operations/orders/types/order.types';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';

interface KanbanColumnProps {
  id: OrderStatus;
  title: string;
  color: string;
  orders: ServiceOrder[];
  onSelectOrder: (order: ServiceOrder) => void;
}

export function KanbanColumn({ id, title, color, orders, onSelectOrder }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <Badge variant="secondary" className="rounded-full">
          {orders.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[500px] rounded-lg border-2 border-dashed p-3 space-y-3 transition-colors ${color} ${
          isOver ? 'ring-2 ring-offset-2 ring-blue-500' : ''
        }`}
      >
        <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <KanbanCard
              key={order.id}
              order={order}
              onClick={() => onSelectOrder(order)}
            />
          ))}
        </SortableContext>

        {orders.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Tidak ada order
          </div>
        )}
      </div>
    </div>
  );
}
