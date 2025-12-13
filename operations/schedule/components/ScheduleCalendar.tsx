'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ServiceOrder } from '@/domain/operations/orders/types/order.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User } from 'lucide-react';

const locales = {
  'id': localeId,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: localeId }),
  getDay,
  locales,
});

interface CalendarEvent extends Event {
  resource: ServiceOrder;
}

interface ScheduleCalendarProps {
  orders: ServiceOrder[];
  onSelectEvent?: (order: ServiceOrder) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
}

const getEventStyle = (status: string) => {
  const styles: Record<string, { backgroundColor: string; borderColor: string }> = {
    pending: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
    scheduled: { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
    in_progress: { backgroundColor: '#DDD6FE', borderColor: '#8B5CF6' },
    completed: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  };
  return styles[status] || styles.pending;
};

export function ScheduleCalendar({ orders, onSelectEvent, onSelectSlot }: ScheduleCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  const events: CalendarEvent[] = useMemo(() => {
    return orders
      .filter(order => order.scheduledDate)
      .map(order => {
        const startDate = new Date(order.scheduledDate!);
        if (order.scheduledTime) {
          const [hours, minutes] = order.scheduledTime.split(':');
          startDate.setHours(parseInt(hours), parseInt(minutes));
        }
        
        const endDate = new Date(startDate);
        if (order.estimatedDuration) {
          endDate.setMinutes(endDate.getMinutes() + order.estimatedDuration);
        } else {
          endDate.setHours(endDate.getHours() + 2); // Default 2 hours
        }

        return {
          title: order.serviceTitle,
          start: startDate,
          end: endDate,
          resource: order,
        };
      });
  }, [orders]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const style = getEventStyle(event.resource.status);
    return {
      style: {
        backgroundColor: style.backgroundColor,
        borderLeft: `4px solid ${style.borderColor}`,
        borderRadius: '4px',
        opacity: 0.9,
        color: '#1F2937',
        border: 'none',
        display: 'block',
      },
    };
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    onSelectEvent?.(event.resource);
  }, [onSelectEvent]);

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    onSelectSlot?.(slotInfo);
  }, [onSelectSlot]);

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const order = event.resource;
    return (
      <div className="p-1 text-xs">
        <div className="font-semibold truncate">{order.serviceTitle}</div>
        <div className="flex items-center gap-1 mt-0.5 text-gray-600">
          <User className="h-3 w-3" />
          <span className="truncate">{order.client?.name}</span>
        </div>
        {order.scheduledTime && (
          <div className="flex items-center gap-1 mt-0.5 text-gray-600">
            <Clock className="h-3 w-3" />
            <span>{order.scheduledTime.slice(0, 5)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-200px)]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        components={{
          event: CustomEvent,
        }}
        messages={{
          next: 'Berikutnya',
          previous: 'Sebelumnya',
          today: 'Hari Ini',
          month: 'Bulan',
          week: 'Minggu',
          day: 'Hari',
          agenda: 'Agenda',
          date: 'Tanggal',
          time: 'Waktu',
          event: 'Event',
          noEventsInRange: 'Tidak ada jadwal dalam rentang waktu ini.',
          showMore: (total) => `+${total} lagi`,
        }}
        style={{ height: '100%' }}
      />
    </div>
  );
}
