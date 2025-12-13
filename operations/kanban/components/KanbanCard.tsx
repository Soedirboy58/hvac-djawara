'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ServiceOrder } from '@/domain/operations/orders/types/order.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Clock, Wrench } from 'lucide-react';
import { format } from 'date-fns';

interface KanbanCardProps {
  order: ServiceOrder;
  onClick?: () => void;
  isDragging?: boolean;
}

const typeConfig = {
  maintenance: { label: 'Maintenance', icon: Wrench, color: 'bg-blue-100 text-blue-800' },
  repair: { label: 'Repair', icon: Wrench, color: 'bg-red-100 text-red-800' },
  installation: { label: 'Installation', icon: Wrench, color: 'bg-green-100 text-green-800' },
  survey: { label: 'Survey', icon: Wrench, color: 'bg-yellow-100 text-yellow-800' },
  troubleshooting: { label: 'Troubleshooting', icon: Wrench, color: 'bg-purple-100 text-purple-800' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

export function KanbanCard({ order, onClick, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeInfo = typeConfig[order.orderType];
  const priorityInfo = priorityConfig[order.priority];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white"
      onClick={onClick}
    >
      {/* Order Number */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-gray-500">{order.orderNumber}</span>
        <Badge className={`text-xs ${priorityInfo.color}`}>
          {priorityInfo.label}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm mb-2 line-clamp-2">{order.serviceTitle}</h4>

      {/* Client */}
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
        <User className="h-3 w-3" />
        <span className="truncate">{order.client?.name || 'No client'}</span>
      </div>

      {/* Location */}
      <div className="flex items-start gap-1 text-xs text-gray-600 mb-2">
        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-1">{order.locationAddress}</span>
      </div>

      {/* Schedule */}
      {order.scheduledDate && (
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(order.scheduledDate), 'dd MMM yyyy')}
            {order.scheduledTime && ` • ${order.scheduledTime.slice(0, 5)}`}
          </span>
        </div>
      )}

      {/* Type Badge */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <Badge className={`text-xs ${typeInfo.color}`}>
          <typeInfo.icon className="h-3 w-3 mr-1" />
          {typeInfo.label}
        </Badge>
        
        {order.estimatedDuration && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {order.estimatedDuration}m
          </div>
        )}
      </div>
    </Card>
  );
}
