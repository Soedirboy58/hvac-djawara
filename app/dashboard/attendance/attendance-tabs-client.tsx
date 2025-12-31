'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AttendanceRosterCard } from './attendance-roster-card'
import { AttendanceConfigCard } from './attendance-config-card'
import { AttendanceMonthlyCard } from './attendance-monthly-card'

export function AttendanceTabsClient() {
  return (
    <Tabs defaultValue="monitoring">
      <TabsList>
        <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        <TabsTrigger value="monthly">Rekap Bulanan</TabsTrigger>
        <TabsTrigger value="settings">Pengaturan</TabsTrigger>
      </TabsList>

      <TabsContent value="monitoring" className="space-y-6">
        <AttendanceRosterCard />
      </TabsContent>

      <TabsContent value="monthly" className="space-y-6">
        <AttendanceMonthlyCard />
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
        <AttendanceConfigCard />
      </TabsContent>
    </Tabs>
  )
}
