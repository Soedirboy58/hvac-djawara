'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/domain/operations/orders/hooks/useOrders';
import { ScheduleCalendar } from '@/domain/operations/schedule/components/ScheduleCalendar';
import { ScheduleOrderModal } from '@/domain/operations/schedule/components/ScheduleOrderModal';
import { ServiceOrder } from '@/domain/operations/orders/types/order.types';
import { Badge } from '@/components/ui/badge';

export default function SchedulePage() {
  const { data: orders, isLoading, error } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const handleSelectEvent = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setScheduleModalOpen(true);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    // Find pending orders to schedule
    const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
    if (pendingOrders.length > 0) {
      setSelectedOrder(pendingOrders[0]);
      setSelectedDate(slotInfo.start);
      setScheduleModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading schedule: {error.message}</p>
        </div>
      </div>
    );
  }

  const scheduledCount = orders?.filter(o => o.scheduled_date).length || 0;
  const todayCount = orders?.filter(o => {
    if (!o.scheduled_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return o.scheduled_date.toString().split('T')[0] === today;
  }).length || 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Kelola jadwal service dan teknisi
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            {scheduledCount} Terjadwal
          </Badge>
          <Badge variant="outline" className="gap-2">
            <Clock className="h-4 w-4" />
            {todayCount} Hari Ini
          </Badge>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FEF3C7' }}></div>
          <span className="text-sm">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DBEAFE' }}></div>
          <span className="text-sm">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DDD6FE' }}></div>
          <span className="text-sm">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#D1FAE5' }}></div>
          <span className="text-sm">Completed</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg border p-4">
        <ScheduleCalendar
          orders={orders || []}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
        />
      </div>

      {/* Schedule Order Modal */}
      <ScheduleOrderModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        order={selectedOrder}
        selectedDate={selectedDate}
      />
    </div>
  );
}

