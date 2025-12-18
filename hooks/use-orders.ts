// ============================================
// useOrders Hook
// Order management and CRUD operations
// ============================================

'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'

export type OrderStatus = 'listing' | 'scheduled' | 'in_progress' | 'pending' | 'completed' | 'cancelled'
export type OrderType = 'installation' | 'maintenance' | 'repair' | 'survey' | 'troubleshooting' | 'konsultasi' | 'pengadaan'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface ServiceOrder {
  id: string
  tenant_id: string
  client_id: string
  order_number: string
  order_type: OrderType
  status: OrderStatus
  priority?: Priority
  service_title: string
  service_description?: string
  location_address: string
  location_lat?: number
  location_lng?: number
  requested_date?: string
  scheduled_date?: string
  scheduled_time?: string
  estimated_duration?: number
  assigned_to?: string
  notes?: string
  is_survey?: boolean
  created_by?: string
  created_at: string
  updated_at: string
  estimated_end_date?: string
  estimated_end_time?: string
  // Aggregated fields from view
  assigned_technician_names?: string
  assigned_technician_ids?: string
  technician_count?: number
  client_name?: string
  client_phone?: string
  client_email?: string
  client_address?: string
  client_type?: string
  creator_name?: string
  service_location?: string
  completion_date?: string
  // Legacy join fields (kept for backward compatibility)
  client?: {
    id: string
    name: string
    phone: string
    email?: string
    address?: string
  }
  technician?: {
    id: string
    full_name: string
  }
  creator?: {
    id: string
    full_name: string
  }
}

interface UseOrdersOptions {
  status?: OrderStatus
  search?: string
  limit?: number
}

export function useOrders(options: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user and tenant
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting user:', userError)
        throw new Error('Authentication error')
      }
      
      if (!user) {
        throw new Error('Not authenticated')
      }

      console.log('Fetching orders for user:', user.email)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        throw new Error('Failed to fetch user profile')
      }

      if (!profile?.active_tenant_id) {
        console.error('User has no active_tenant_id:', user.email)
        throw new Error('No active tenant set. Please contact administrator.')
      }

      console.log('Active tenant ID:', profile.active_tenant_id)

      // Fetch service orders with basic joins
      let query = supabase
        .from('service_orders')
        .select(`
          *,
          client:clients(id, name, phone, email, address),
          creator:profiles!created_by(id, full_name)
        `)
        .eq('tenant_id', profile.active_tenant_id)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (options.status) {
        query = query.eq('status', options.status)
      }

      // Apply search filter
      if (options.search) {
        query = query.or(`order_number.ilike.%${options.search}%,service_title.ilike.%${options.search}%`)
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data: ordersData, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching orders from database:', fetchError)
        throw new Error(`Database error: ${fetchError.message}`)
      }

      // Fetch technician assignments for all orders
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id)
        
        const { data: assignments } = await supabase
          .from('work_order_assignments')
          .select('service_order_id, technician_id, technicians(id, full_name)')
          .in('service_order_id', orderIds)

        // Aggregate technician data per order
        const enrichedOrders = ordersData.map(order => {
          const orderAssignments = assignments?.filter(a => a.service_order_id === order.id) || []
          const techNames = orderAssignments
            .map(a => a.technicians?.full_name)
            .filter(Boolean)
            .join(', ')
          
          return {
            ...order,
            assigned_technician_names: techNames || undefined,
            technician_count: orderAssignments.length,
            client_name: order.client?.name,
            client_phone: order.client?.phone,
            service_location: order.location_address,
          }
        })

        console.log('Successfully fetched orders:', enrichedOrders.length)
        setOrders(enrichedOrders)
      } else {
        console.log('No orders found')
        setOrders([])
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [options.status, options.search, options.limit, supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const refetch = useCallback(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    loading,
    error,
    refetch,
  }
}

// Hook to get single order by ID
export function useOrder(orderId: string | null) {
  const [order, setOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients!client_id(id, name, phone, email, address),
          technician:profiles!assigned_to(id, full_name),
          creator:profiles!created_by(id, full_name)
        `)
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      setOrder(data)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch order')
    } finally {
      setLoading(false)
    }
  }, [orderId, supabase])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const refetch = useCallback(() => {
    fetchOrder()
  }, [fetchOrder])

  return {
    order,
    loading,
    error,
    refetch,
  }
}

// Hook to update order
export function useUpdateOrder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const updateOrder = useCallback(async (orderId: string, updates: Partial<ServiceOrder>) => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error('Error updating order:', err)
      setError(err instanceof Error ? err.message : 'Failed to update order')
      return false
    } finally {
      setLoading(false)
    }
  }, [supabase])

  return {
    updateOrder,
    loading,
    error,
  }
}

// Hook to get technicians for assignment
export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Array<{ id: string; full_name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current user's active tenant
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: profile } = await supabase
          .from('profiles')
          .select('active_tenant_id')
          .eq('id', user.id)
          .single()

        if (!profile?.active_tenant_id) throw new Error('No active tenant')

        // Get technicians and helpers
        const { data, error: fetchError } = await supabase
          .from('user_tenant_roles')
          .select(`
            user_id,
            profiles!user_tenant_roles_user_id_fkey(id, full_name)
          `)
          .eq('tenant_id', profile.active_tenant_id)
          .in('role', ['technician', 'tech_head', 'helper'])
          .eq('is_active', true)

        if (fetchError) throw fetchError

        // Transform data
        const techniciansList = (data || []).map((item: any) => ({
          id: item.profiles.id,
          full_name: item.profiles.full_name,
        }))

        setTechnicians(techniciansList)
      } catch (err) {
        console.error('Error fetching technicians:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch technicians')
      } finally {
        setLoading(false)
      }
    }

    fetchTechnicians()
  }, [supabase])

  return {
    technicians,
    loading,
    error,
  }
}
