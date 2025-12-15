'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar as CalendarIcon, Kanban, Clock } from 'lucide-react'
import ScheduleCalendarView from './calendar-view'
import ScheduleKanbanView from './kanban-view'
import UpcomingMaintenanceWidget from '@/components/maintenance/UpcomingMaintenanceWidget'

export default function SchedulePageWithTabs() {
  const [activeTab, setActiveTab] = useState('calendar')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
        <p className="text-gray-500 mt-1">Manage service schedule with calendar or kanban view</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Maintenance Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <ScheduleCalendarView />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <ScheduleKanbanView />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <UpcomingMaintenanceWidget />
        </TabsContent>
      </Tabs>
    </div>
  )
}
