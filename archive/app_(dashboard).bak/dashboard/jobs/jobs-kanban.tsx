// ============================================
// Jobs Kanban Component
// Drag-and-drop job board
// ============================================

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, MapPin } from 'lucide-react'

// Placeholder data
const MOCK_JOBS = {
  assigned: [
    {
      id: '1',
      order_number: 'ORD-2025-001',
      client_name: 'ABC Corporation',
      service_type: 'AC Installation',
      technician: 'Budi Santoso',
      scheduled_date: '2025-01-20',
      location: 'Jakarta Selatan',
    },
  ],
  in_progress: [
    {
      id: '2',
      order_number: 'ORD-2025-002',
      client_name: 'John Doe',
      service_type: 'AC Maintenance',
      technician: 'Ahmad Wijaya',
      scheduled_date: '2025-01-18',
      location: 'Tangerang',
    },
  ],
  completed: [
    {
      id: '3',
      order_number: 'ORD-2025-003',
      client_name: 'XYZ Industries',
      service_type: 'AC Repair',
      technician: 'Siti Nurhaliza',
      scheduled_date: '2025-01-15',
      location: 'Jakarta Pusat',
    },
  ],
}

interface JobsKanbanProps {
  tenantId: string
}

export function JobsKanban({ tenantId }: JobsKanbanProps) {
  const columns = [
    { id: 'assigned', title: 'Assigned', jobs: MOCK_JOBS.assigned, color: 'bg-blue-50' },
    { id: 'in_progress', title: 'In Progress', jobs: MOCK_JOBS.in_progress, color: 'bg-yellow-50' },
    { id: 'completed', title: 'Completed', jobs: MOCK_JOBS.completed, color: 'bg-green-50' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => (
        <div key={column.id} className="space-y-4">
          {/* Column Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <Badge variant="secondary">{column.jobs.length}</Badge>
          </div>

          {/* Column Cards */}
          <div className={`rounded-lg p-4 space-y-3 min-h-[400px] ${column.color}`}>
            {column.jobs.map((job) => (
              <Card key={job.id} className="cursor-move hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {job.order_number}
                  </CardTitle>
                  <p className="text-xs text-gray-600">{job.service_type}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-2" />
                    <span className="font-medium">{job.client_name}</span>
                  </div>
                  <div className="flex items-center">
                    <User className="w-3 h-3 mr-2 text-blue-600" />
                    <span>Tech: {job.technician}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-2" />
                    {new Date(job.scheduled_date).toLocaleDateString('id-ID')}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-2" />
                    {job.location}
                  </div>
                </CardContent>
              </Card>
            ))}

            {column.jobs.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No jobs in this stage
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
