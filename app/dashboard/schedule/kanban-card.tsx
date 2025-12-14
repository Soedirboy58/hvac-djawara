import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, User, MapPin, Calendar } from 'lucide-react'
import moment from 'moment'
import { useState, useEffect } from 'react'

interface KanbanCardProps {
  order: any
  onClick?: () => void
  isDragging?: boolean
}

export default function KanbanCard({ order, onClick, isDragging }: KanbanCardProps) {
  const [isHolding, setIsHolding] = useState(false)
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id: order.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }

  const handleMouseDown = () => {
    const timer = setTimeout(() => setIsHolding(true), 200)
    setHoldTimer(timer)
  }

  const handleMouseUp = () => {
    if (holdTimer) clearTimeout(holdTimer)
    setIsHolding(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if not dragging or holding
    if (!isSortableDragging && !isHolding) {
      e.stopPropagation()
      onClick?.()
    }
  }

  useEffect(() => {
    return () => {
      if (holdTimer) clearTimeout(holdTimer)
    }
  }, [holdTimer])

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`
        transition-all bg-white relative
        ${isSortableDragging ? 'cursor-grabbing shadow-lg ring-2 ring-blue-400 scale-105' : 
          isHolding ? 'shadow-md ring-2 ring-blue-300 scale-102' :
          'cursor-pointer hover:shadow-sm hover:ring-1 hover:ring-gray-300'
        }
      `}
      title="Click to view details • Hold 0.3s to drag"
    >
      <CardContent className="p-3 space-y-2">
        {/* Visual hint when holding */}
        {isHolding && (
          <div className="absolute inset-0 bg-blue-50 opacity-20 pointer-events-none rounded-lg" />
        )}
        
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{order.service_title}</p>
            <p className="text-xs text-gray-500 truncate">{order.order_number}</p>
          </div>
          <Badge className={`text-xs ${priorityColors[order.priority as keyof typeof priorityColors]}`}>
            {order.priority}
          </Badge>
        </div>

        {order.client && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="h-3 w-3" />
            <span className="truncate">{order.client.name}</span>
          </div>
        )}

        {order.client?.address && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{order.client.address}</span>
          </div>
        )}

        {order.scheduled_date && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>{moment(order.scheduled_date).format('DD MMM YYYY')}</span>
            {order.scheduled_time && (
              <span className="ml-1">• {order.scheduled_time.slice(0, 5)}</span>
            )}
          </div>
        )}

        {order.technician && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <User className="h-3 w-3" />
            <span className="truncate">{order.technician.full_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
