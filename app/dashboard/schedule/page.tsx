'use client'

import { useState, useCallback } from 'react'
import { Calendar, momentLocalizer, View, SlotInfo } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSchedule, ScheduleEvent } from '@/hooks/use-schedule'
import { useTechnicians } from '@/hooks/use-orders'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const localizer = momentLocalizer(moment)

function SchedulePageContent() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>('month')
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all')
  
  const { events, loading, error, refetch } = useSchedule()
  const { technicians } = useTechnicians()

  // Filter events by selected technician
  const filteredEvents = selectedTechnician === 'all' 
    ? events 
    : events.filter(e => e.technician?.id === selectedTechnician)

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView)
  }, [])

  const handleSelectEvent = useCallback((event: ScheduleEvent) => {
    try {
      if (event?.resource?.id) {
        router.push(`/dashboard/orders/${event.resource.id}`)
      }
    } catch (err) {
      console.error('Error navigating to order:', err)
    }
  }, [router])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    try {
      if (slotInfo?.start) {
        const dateStr = moment(slotInfo.start).format('YYYY-MM-DD')
        router.push(`/dashboard/orders/new?date=${dateStr}`)
      }
    } catch (err) {
      console.error('Error creating order:', err)
    }
  }, [router])

  // Custom event styling
  const eventStyleGetter = useCallback((event: ScheduleEvent) => {
    const status = event.resource.status
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
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const scheduledCount = filteredEvents.length
  const todayEvents = filteredEvents.filter(e => {
    const today = moment().format('YYYY-MM-DD')
    const eventDate = moment(e.start).format('YYYY-MM-DD')
    return eventDate === today
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Calendar</h1>
          <p className="text-gray-500 mt-1">Manage service schedule and technician assignments</p>
        </div>
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
                const techEvents = events.filter(e => e.technician?.id === tech.id)
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
              <Calendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                view={currentView}
                date={currentDate}
                selectable
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
                  showMore: (total) => `+${total} more`,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <ErrorBoundary>
      <SchedulePageContent />
    </ErrorBoundary>
  )
}

