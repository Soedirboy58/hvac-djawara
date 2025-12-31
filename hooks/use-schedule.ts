// ============================================
// useSchedule Hook
// Schedule management with conflict detection
// ============================================

'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { ServiceOrder } from './use-orders'

export interface ScheduleEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource: ServiceOrder
  technician?: {
    id: string
    full_name: string
  }
}

export interface TechnicianWorkload {
  technician_id: string
  technician_name: string
  date: string
  order_count: number
  total_duration: number
}

export function useSchedule(startDate?: Date, endDate?: Date) {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) throw new Error('No active tenant')

      let query = supabase
        .from('service_orders')
        .select(`
          *,
          client:clients!client_id(id, name, phone)
        `)
        .eq('tenant_id', profile.active_tenant_id)
        .not('scheduled_date', 'is', null)

      if (startDate) {
        query = query.gte('scheduled_date', startDate.toISOString().split('T')[0])
      }

      if (endDate) {
        query = query.lte('scheduled_date', endDate.toISOString().split('T')[0])
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Fetch technician assignments separately
      const orderIds = (data || []).map((o: any) => o.id)
      
      let techniciansData: any[] = []
      if (orderIds.length > 0) {
        const { data: assignments } = await supabase
          .from('work_order_assignments')
          .select(`
            service_order_id,
            technician:technicians!technician_id(id, full_name)
          `)
          .in('service_order_id', orderIds)
        
        techniciansData = assignments || []
      }

      // Create a map of order_id -> technician names
      const techMap = new Map<string, string>()
      const techIdMap = new Map<string, string>()
      techniciansData.forEach((assignment: any) => {
        const orderId = assignment.service_order_id
        const techName = assignment.technician?.full_name
        const techId = assignment.technician?.id
        
        if (techMap.has(orderId)) {
          techMap.set(orderId, `${techMap.get(orderId)}, ${techName}`)
        } else {
          techMap.set(orderId, techName || 'Unassigned')
          techIdMap.set(orderId, techId)
        }
      })

      // Transform to calendar events
      const calendarEvents: ScheduleEvent[] = (data || []).map((order: any) => {
        const startDateTime = new Date(`${order.scheduled_date}T00:00:00`)
        if (order.scheduled_time) {
          const [hours, minutes] = order.scheduled_time.split(':')
          startDateTime.setHours(parseInt(hours), parseInt(minutes))
        } else {
          startDateTime.setHours(9, 0) // Default 9 AM
        }

        // If estimated_end_date exists, use it to create a multi-day range.
        // Otherwise fall back to estimated_duration (minutes).
        let endDateTime: Date
        let allDay = false

        if (order.estimated_end_date) {
          const endInclusive = new Date(`${order.estimated_end_date}T00:00:00`)
          // If an end time exists, use it; else treat as all-day range.
          if (order.estimated_end_time) {
            const [endHours, endMinutes] = order.estimated_end_time.split(':')
            endInclusive.setHours(parseInt(endHours), parseInt(endMinutes))
          } else {
            endInclusive.setHours(23, 59, 0, 0)
          }

          const startYMD = `${startDateTime.getFullYear()}-${startDateTime.getMonth()}-${startDateTime.getDate()}`
          const endYMD = `${endInclusive.getFullYear()}-${endInclusive.getMonth()}-${endInclusive.getDate()}`

          if (startYMD !== endYMD) {
            allDay = true
            // react-big-calendar treats all-day end as exclusive.
            const endExclusive = new Date(endInclusive)
            endExclusive.setHours(0, 0, 0, 0)
            endExclusive.setDate(endExclusive.getDate() + 1)

            endDateTime = endExclusive
            // Ensure start is aligned to day start for all-day blocks.
            startDateTime.setHours(0, 0, 0, 0)
          } else {
            endDateTime = endInclusive
          }
        } else {
          endDateTime = new Date(startDateTime)
          const duration = order.estimated_duration || 120 // Default 2 hours
          endDateTime.setMinutes(endDateTime.getMinutes() + duration)
        }

        const technicianName = techMap.get(order.id) || 'Unassigned'
        const technicianId = techIdMap.get(order.id)

        return {
          id: order.id,
          title: `${order.order_number} - ${order.client?.name || 'Unknown'} (${technicianName})`,
          start: startDateTime,
          end: endDateTime,
          allDay,
          resource: {
            ...order,
            assigned_technician_names: technicianName,
            technician: technicianId ? { id: technicianId, full_name: technicianName } : null
          },
          technician: technicianId ? { id: technicianId, full_name: technicianName } : undefined,
        }
      })

      setEvents(calendarEvents)
    } catch (err) {
      console.error('Error fetching schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, supabase])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  return {
    events,
    loading,
    error,
    refetch: fetchSchedule,
  }
}

// Hook to update order schedule
export function useUpdateSchedule() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const updateSchedule = useCallback(async (
    orderId: string,
    scheduledDate: Date,
    scheduledTime?: string,
    assignedTo?: string,
    estimatedEndDate?: Date,
    estimatedEndTime?: string
  ) => {
    try {
      setLoading(true)
      setError(null)

      const updates: any = {
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }

      if (scheduledTime) {
        updates.scheduled_time = scheduledTime
      }

      if (assignedTo) {
        updates.assigned_to = assignedTo
        updates.status = 'scheduled'
      }

      if (estimatedEndDate) {
        updates.estimated_end_date = estimatedEndDate.toISOString().split('T')[0]
      }

      if (estimatedEndTime) {
        updates.estimated_end_time = estimatedEndTime
      }

      const { error: updateError } = await supabase
        .from('service_orders')
        .update(updates)
        .eq('id', orderId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error('Error updating schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to update schedule')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    updateSchedule,
    loading,
    error,
  }
}

// Hook to check schedule conflicts
export function useCheckConflicts() {
  const supabase = createClient()

  const checkConflicts = useCallback(async (
    technicianId: string,
    scheduledDate: Date,
    startTime: string,
    duration: number,
    excludeOrderId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) throw new Error('No active tenant')

      // Get all orders for this technician on this date
      let query = supabase
        .from('service_orders')
        .select('id, scheduled_time, estimated_duration, order_number, service_title')
        .eq('tenant_id', profile.active_tenant_id)
        .eq('assigned_to', technicianId)
        .eq('scheduled_date', scheduledDate.toISOString().split('T')[0])
        .in('status', ['scheduled', 'in_progress'])

      if (excludeOrderId) {
        query = query.neq('id', excludeOrderId)
      }

      const { data, error } = await query

      if (error) throw error

      // Check for time conflicts
      const [newStartHour, newStartMin] = startTime.split(':').map(Number)
      const newStart = newStartHour * 60 + newStartMin
      const newEnd = newStart + duration

      const conflicts = (data || []).filter((order: any) => {
        if (!order.scheduled_time) return false

        const [existingHour, existingMin] = order.scheduled_time.split(':').map(Number)
        const existingStart = existingHour * 60 + existingMin
        const existingDuration = order.estimated_duration || 120
        const existingEnd = existingStart + existingDuration

        // Check if times overlap
        return (newStart < existingEnd && newEnd > existingStart)
      })

      return {
        hasConflict: conflicts.length > 0,
        conflicts: conflicts.map((c: any) => ({
          id: c.id,
          order_number: c.order_number,
          service_title: c.service_title,
          scheduled_time: c.scheduled_time,
        })),
      }
    } catch (err) {
      console.error('Error checking conflicts:', err)
      return { hasConflict: false, conflicts: [], error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }, [supabase])

  return { checkConflicts }
}

// Hook to get technician workload
export function useTechnicianWorkload(startDate: Date, endDate: Date) {
  const [workload, setWorkload] = useState<TechnicianWorkload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchWorkload = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: profile } = await supabase
          .from('profiles')
          .select('active_tenant_id')
          .eq('id', user.id)
          .single()

        if (!profile?.active_tenant_id) throw new Error('No active tenant')

        const { data, error: fetchError } = await supabase
          .from('service_orders')
          .select(`
            scheduled_date,
            estimated_duration,
            assigned_to,
            technician:profiles!assigned_to(id, full_name)
          `)
          .eq('tenant_id', profile.active_tenant_id)
          .gte('scheduled_date', startDate.toISOString().split('T')[0])
          .lte('scheduled_date', endDate.toISOString().split('T')[0])
          .in('status', ['scheduled', 'in_progress'])
          .not('assigned_to', 'is', null)

        if (fetchError) throw fetchError

        // Aggregate by technician and date
        const workloadMap = new Map<string, TechnicianWorkload>()

        data?.forEach((order: any) => {
          const key = `${order.assigned_to}-${order.scheduled_date}`
          const existing = workloadMap.get(key)

          if (existing) {
            existing.order_count++
            existing.total_duration += order.estimated_duration || 120
          } else {
            workloadMap.set(key, {
              technician_id: order.assigned_to,
              technician_name: order.technician?.full_name || 'Unknown',
              date: order.scheduled_date,
              order_count: 1,
              total_duration: order.estimated_duration || 120,
            })
          }
        })

        setWorkload(Array.from(workloadMap.values()))
      } catch (err) {
        console.error('Error fetching workload:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch workload')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkload()
  }, [startDate, endDate, supabase])

  return {
    workload,
    loading,
    error,
  }
}
