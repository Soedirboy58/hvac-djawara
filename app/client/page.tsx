// ============================================
// Enhanced Client Dashboard with Maintenance Info
// Shows upcoming maintenance, service history, stats
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Building,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Star
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface MaintenanceSchedule {
  id: string
  property_name: string
  property_address: string
  frequency: string
  next_scheduled_date: string
  days_until: number
  is_active: boolean
}

interface ServiceOrder {
  id: string
  order_number: string
  service_title: string
  status: string
  scheduled_date: string
  scheduled_time?: string | null
  estimated_end_time?: string | null
  completed_date: string
  property_name: string
}

interface DashboardStats {
  total_properties: number
  total_units: number
  total_orders: number
  completed_orders: number
  active_schedules: number
}

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_properties: 0,
    total_units: 0,
    total_orders: 0,
    completed_orders: 0,
    active_schedules: 0
  })
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceSchedule[]>([])
  const [recentOrders, setRecentOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [clientInfo, setClientInfo] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get client info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: client } = await supabase
        .from('clients')
        .select('*, type:client_type')
        .eq('user_id', user.id)
        .single()

      if (!client) return
      setClientInfo(client)

      // Load stats
      await loadStats(client.id)
      
      // Load upcoming maintenance
      await loadUpcomingMaintenance(client.id)
      
      // Load recent orders
      await loadRecentOrders(client.id)
      
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (clientId: string) => {
    try {
      // Count properties
      const { count: propertiesCount } = await supabase
        .from('client_properties')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)

      // Count AC units
      const { count: unitsCount } = await supabase
        .from('ac_units')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)

      // Count orders
      const { count: ordersCount } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)

      // Count completed orders
      const { count: completedCount } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'completed')

      // Count active schedules
      const { count: schedulesCount } = await supabase
        .from('property_maintenance_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)

      setStats({
        total_properties: propertiesCount || 0,
        total_units: unitsCount || 0,
        total_orders: (ordersCount || 0) + (schedulesCount || 0),
        completed_orders: completedCount || 0,
        active_schedules: schedulesCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadUpcomingMaintenance = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('property_maintenance_schedules')
        .select(`
          id,
          frequency,
          next_scheduled_date,
          is_active,
          property:client_properties(
            property_name,
            address
          )
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('next_scheduled_date', { ascending: true })
        .limit(5)

      if (error) throw error

      const schedules = (data || []).map(sched => ({
        id: sched.id,
        property_name: sched.property?.property_name || 'Unknown',
        property_address: sched.property?.address || '',
        frequency: sched.frequency,
        next_scheduled_date: sched.next_scheduled_date,
        days_until: sched.next_scheduled_date 
          ? Math.floor((new Date(sched.next_scheduled_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 999,
        is_active: sched.is_active
      }))

      setUpcomingMaintenance(schedules)
    } catch (error) {
      console.error('Error loading maintenance:', error)
    }
  }

  const loadRecentOrders = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          service_title,
          status,
          scheduled_date,
          scheduled_time,
          estimated_end_time,
          completed_date,
          property:client_properties(property_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setRecentOrders((data || []).map(order => ({
        ...order,
        property_name: order.property?.property_name || 'N/A'
      })))
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'}>
      {status}
    </Badge>
  }

  const formatTime = (time?: string | null) => {
    if (!time) return null
    const parts = String(time).split(':')
    if (parts.length < 2) return time
    return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}`
  }

  const formatScheduleDateTime = (order: ServiceOrder) => {
    if (order.completed_date) {
      return new Date(order.completed_date).toLocaleDateString('id-ID')
    }
    if (!order.scheduled_date) return 'Not scheduled'

    const dateLabel = new Date(order.scheduled_date).toLocaleDateString('id-ID')
    const start = formatTime(order.scheduled_time)
    const end = formatTime(order.estimated_end_time)
    if (start && end) return `${dateLabel} ${start} - ${end}`
    if (start) return `${dateLabel} ${start}`
    return dateLabel
  }

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-600 bg-red-50 border-red-200'
    if (daysUntil <= 3) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (daysUntil <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-blue-600 bg-blue-50 border-blue-200'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {clientInfo?.name}!
        </h1>
        <p className="text-blue-100">
          Your Personal Service Dashboard
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-sm">
              {clientInfo?.type === 'perkantoran' ? 'Perkantoran' : 'Regular'}
            </span>
          </div>
          <Badge className="bg-green-500 text-white">Active</Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Properties</p>
                <p className="text-3xl font-bold mt-1">{stats.total_properties}</p>
              </div>
              <Building className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AC Units</p>
                <p className="text-3xl font-bold mt-1">{stats.total_units}</p>
              </div>
              <Package className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Service Orders</p>
                <p className="text-3xl font-bold mt-1">{stats.total_orders}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.completed_orders} completed • termasuk jadwal aktif
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Maintenance
            </div>
            {stats.active_schedules > 0 && (
              <Badge variant="outline">{stats.active_schedules} active schedules</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMaintenance.length === 0 ? (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                No maintenance scheduled yet. 
                <Link href="/client/maintenance-schedule" className="text-blue-600 underline ml-1">
                  Set up maintenance schedule
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {upcomingMaintenance.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`border rounded-lg p-4 ${
                    schedule.days_until < 0 ? 'border-red-300 bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{schedule.property_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {schedule.property_address}
                      </p>
                    </div>
                    
                    <div className={`text-right px-3 py-2 rounded-lg border ${getUrgencyColor(schedule.days_until)}`}>
                      {schedule.days_until < 0 ? (
                        <>
                          <p className="text-xs font-medium">OVERDUE</p>
                          <p className="text-sm font-bold">{Math.abs(schedule.days_until)} days ago</p>
                        </>
                      ) : schedule.days_until === 0 ? (
                        <>
                          <p className="text-xs font-medium">DUE TODAY</p>
                          <p className="text-sm font-bold">
                            {new Date(schedule.next_scheduled_date).toLocaleDateString('id-ID')}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium">IN {schedule.days_until} DAYS</p>
                          <p className="text-sm font-bold">
                            {new Date(schedule.next_scheduled_date).toLocaleDateString('id-ID')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {schedule.frequency === 'monthly' ? 'Monthly' :
                       schedule.frequency === 'quarterly' ? 'Quarterly' :
                       schedule.frequency === 'semi_annual' ? 'Semi-Annual' :
                       schedule.frequency === 'annual' ? 'Annual' : schedule.frequency}
                    </Badge>
                    
                    {schedule.days_until < 0 && (
                      <Button size="sm" variant="destructive" asChild>
                        <Link href="/client/request-service">
                          Schedule Now
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Service Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No service orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{order.order_number}</p>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600">{order.service_title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Property: {order.property_name}
                      </p>
                    </div>
                    
                    <div className="text-right text-sm">
                      <p className="text-gray-500">
                        {formatScheduleDateTime(order)}
                      </p>
                      {order.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
