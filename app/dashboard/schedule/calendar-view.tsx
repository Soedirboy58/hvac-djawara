'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { Calendar as CalendarIcon, Users, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSchedule, ScheduleEvent, useUpdateSchedule, useCheckConflicts, useTechnicianWorkload } from '@/hooks/use-schedule'
import { useTechnicians } from '@/hooks/use-orders'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const localizer = momentLocalizer(moment)
const DragAndDropCalendar = withDragAndDrop(Calendar)

type HolidayResource = {
  __type: 'holiday'
  name: string
  date: string
}

type CalendarResource = ScheduleEvent['resource'] | HolidayResource

type CalendarEvent = Omit<ScheduleEvent, 'resource'> & {
  resource: CalendarResource
}

function isHolidayEvent(event: CalendarEvent) {
  return (event.resource as any)?.__type === 'holiday'
}

export default function ScheduleCalendarView() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>('month')
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all')
  const [holidayEvents, setHolidayEvents] = useState<CalendarEvent[]>([])
  const holidayCacheRef = useRef<Map<number, CalendarEvent[]>>(new Map())
  
  const { events, loading, error, refetch, viewerRole, viewerUserId } = useSchedule()
  const { updateSchedule } = useUpdateSchedule()
  const { checkConflicts } = useCheckConflicts()
  const { technicians } = useTechnicians()
  
  // Calculate date range for workload
  const startOfMonth = useMemo(() => moment(currentDate).startOf('month').toDate(), [currentDate])
  const endOfMonth = useMemo(() => moment(currentDate).endOf('month').toDate(), [currentDate])
  const { workload } = useTechnicianWorkload(startOfMonth, endOfMonth)

  // Sync Indonesian public holidays (via Nager.Date)
  useEffect(() => {
    const year = currentDate.getFullYear()

    const cached = holidayCacheRef.current.get(year)
    if (cached) {
      setHolidayEvents(cached)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`)
        if (!res.ok) throw new Error(`Failed to fetch holidays (${res.status})`)
        const data = (await res.json()) as Array<{
          date: string
          localName?: string
          name?: string
        }>

        const mapped: CalendarEvent[] = data.map((h) => {
          const start = new Date(`${h.date}T00:00:00`)
          const end = new Date(start)
          end.setDate(end.getDate() + 1)

          return {
            id: `holiday-${h.date}`,
            title: `Libur Nasional: ${h.localName || h.name || h.date}`,
            start,
            end,
            allDay: true,
            resource: {
              __type: 'holiday',
              name: h.localName || h.name || 'Libur Nasional',
              date: h.date,
            },
          }
        })

        holidayCacheRef.current.set(year, mapped)
        if (!cancelled) setHolidayEvents(mapped)
      } catch (err) {
        console.warn('Holiday sync failed:', err)
        if (!cancelled) setHolidayEvents([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentDate])

  const isSalesPartner = viewerRole === 'sales_partner'

  const isOwnPartnerOrder = useCallback((event: CalendarEvent) => {
    if (!isSalesPartner) return true
    if (!viewerUserId) return false
    const client = (event.resource as any)?.client
    return String(client?.referred_by_id || '') === String(viewerUserId)
  }, [isSalesPartner, viewerUserId])

  // Filter events by selected technician
  const filteredEvents: CalendarEvent[] = useMemo(() => {
    const scheduleEvents = (selectedTechnician === 'all'
      ? events
      : events.filter(e => (e.resource as any)?.technician?.id === selectedTechnician)) as CalendarEvent[]

    const maskedScheduleEvents = isSalesPartner
      ? scheduleEvents.map((e) => {
          const owned = isOwnPartnerOrder(e)
          if (owned) return e
          return {
            ...e,
            title: 'Terjadwal (order lain)',
          }
        })
      : scheduleEvents

    // Always show holidays regardless of technician filter
    return [...holidayEvents, ...maskedScheduleEvents]
  }, [events, holidayEvents, selectedTechnician, isSalesPartner, isOwnPartnerOrder])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView)
  }, [])

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    try {
      if (isHolidayEvent(event)) return

      // Sales partner: only allow opening own orders.
      if (isSalesPartner && !isOwnPartnerOrder(event)) return

      const orderId = (event.resource as any)?.id
      if (orderId) {
        router.push(`/dashboard/orders/${orderId}`)
      }
    } catch (err) {
      console.error('Error navigating to order:', err)
    }
  }, [router, isSalesPartner, isOwnPartnerOrder])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    try {
      if (isSalesPartner) return
      if (slotInfo?.start) {
        const dateStr = moment(slotInfo.start).format('YYYY-MM-DD')
        router.push(`/dashboard/orders/new?date=${dateStr}`)
      }
    } catch (err) {
      console.error('Error creating order:', err)
    }
  }, [router, isSalesPartner])

  // Handle drag and drop events
  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      if (isHolidayEvent(event)) return
      if (isSalesPartner) return

      // For multi-day all-day blocks, shift the whole range (end date) and skip time-based conflict logic.
      if (event?.allDay) {
        await moveEvent(event, start, end)
        return
      }

      const technicianId = event.resource?.technician?.id
      if (!technicianId) {
        toast.error('Teknisi tidak ditemukan')
        return
      }

      // Existing conflict checker expects (technicianId, date, startTime, duration, excludeOrderId)
      const startTime = moment(start).format('HH:mm')
      const duration = Math.max(0, moment(end).diff(moment(start), 'minutes'))
      const result = await checkConflicts(technicianId, start, startTime, duration, event.resource.id)

      if (result.hasConflict) {
        toast.error(`⚠️ Konflik terdeteksi! Teknisi sudah memiliki ${result.conflicts.length} pekerjaan pada waktu ini.`)
        return
      }

      await moveEvent(event.resource.id, start, end)
    } catch (err) {
      console.error('Error dropping event:', err)
      toast.error('Gagal memindahkan jadwal')
    }
  }

  const moveEvent = async (eventOrOrderId: any, start: Date, end: Date) => {
    const orderId = typeof eventOrOrderId === 'string' ? eventOrOrderId : eventOrOrderId?.resource?.id
    if (!orderId) return

    const scheduledDate = start
    const scheduledTime = moment(start).format('HH:mm:ss')

    let shiftedEstimatedEndDate: Date | undefined
    let estimatedEndTime: string | undefined

    const resource = typeof eventOrOrderId === 'string' ? null : eventOrOrderId?.resource
    const oldStart = typeof eventOrOrderId === 'string' ? null : eventOrOrderId?.start

    if (resource?.estimated_end_date && oldStart) {
      const deltaDays = moment(start).startOf('day').diff(moment(oldStart).startOf('day'), 'days')
      if (deltaDays !== 0) {
        shiftedEstimatedEndDate = moment(resource.estimated_end_date).add(deltaDays, 'days').toDate()
        if (resource.estimated_end_time) estimatedEndTime = resource.estimated_end_time
      }
    }
    
    await updateSchedule(orderId, scheduledDate, scheduledTime, undefined, shiftedEstimatedEndDate, estimatedEndTime)

    toast.success('✅ Jadwal berhasil dipindahkan!')
    refetch()
  }

  // Custom event styling
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (isHolidayEvent(event)) {
      return {
        style: {
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          opacity: 0.9,
          color: '#374151',
          border: '1px solid #e5e7eb',
          display: 'block',
        },
      }
    }

    // Sales partner: mask non-owned orders
    if (isSalesPartner && !isOwnPartnerOrder(event)) {
      return {
        style: {
          backgroundColor: '#9ca3af',
          borderRadius: '4px',
          opacity: 0.7,
          color: '#111827',
          border: 'none',
          display: 'block',
        },
      }
    }

    const status = (event.resource as any).status
    let backgroundColor = '#3b82f6' // blue for scheduled
    
    if (status === 'in_progress') backgroundColor = '#8b5cf6' // purple
    if (status === 'completed') backgroundColor = '#10b981' // green
    if (status === 'cancelled') backgroundColor = '#ef4444' // red

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }, [isSalesPartner, isOwnPartnerOrder])

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

  const scheduledCount = filteredEvents.filter(e => !isHolidayEvent(e)).length
  const todayEvents = filteredEvents.filter(e => {
    const today = moment().format('YYYY-MM-DD')
    const eventDate = moment(e.start).format('YYYY-MM-DD')
    return eventDate === today
  })

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {scheduledCount} Scheduled
        </Badge>
        <Badge variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200">
          <Users className="h-4 w-4" />
          {todayEvents.length} Today
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Filter by Technician
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians ({events.length})</SelectItem>
              {technicians.map((tech) => {
                const techEvents = events.filter(e => e.resource?.technician?.id === tech.id)
                return (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name} ({techEvents.length})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Technician Workload Panel */}
      {workload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Technician Workload ({moment(currentDate).format('MMMM YYYY')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workload.map((tech) => {
                const workDays = 22 // Assume 22 working days per month
                const utilizationPercent = (tech.total_duration / (workDays * 8)) * 100
                let statusColor = 'bg-green-100 text-green-700 border-green-200'
                let statusText = 'Available'
                
                if (utilizationPercent > 90) {
                  statusColor = 'bg-red-100 text-red-700 border-red-200'
                  statusText = 'Overloaded'
                } else if (utilizationPercent > 70) {
                  statusColor = 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  statusText = 'Busy'
                }

                return (
                  <div key={tech.technician_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{tech.technician_name}</span>
                      <Badge variant="outline" className={statusColor}>
                        {statusText}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Orders:</span>
                        <span className="font-medium">{tech.order_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hours:</span>
                        <span className="font-medium">{tech.total_duration.toFixed(1)}h / {workDays * 8}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Utilization:</span>
                        <span className="font-medium">{utilizationPercent.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          utilizationPercent > 90 ? 'bg-red-500' : 
                          utilizationPercent > 70 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg border">
        <span className="text-sm font-medium text-gray-700">Status Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500"></div>
          <span className="text-sm">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span className="text-sm">Cancelled</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <CalendarIcon className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No scheduled orders</p>
              <p className="text-sm mt-2">Orders with scheduled dates will appear here</p>
              <Button
                onClick={() => router.push('/dashboard/orders')}
                className="mt-4"
              >
                View All Orders
              </Button>
            </div>
          ) : (
            <div style={{ height: '700px' }}>
              <DragAndDropCalendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                onEventDrop={handleEventDrop}
                view={currentView}
                date={currentDate}
                selectable
                draggableAccessor={(event: any) => !isHolidayEvent(event)}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
                step={30}
                showMultiDayTimes
                defaultDate={new Date()}
                popup
                messages={{
                  next: 'Next',
                  previous: 'Previous',
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day',
                  agenda: 'Agenda',
                  date: 'Date',
                  time: 'Time',
                  event: 'Event',
                  noEventsInRange: 'No scheduled orders in this range',
                  showMore: (total: number) => `+${total} more`,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
