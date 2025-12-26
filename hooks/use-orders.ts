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
  assigned_helper_names?: string
  helper_count?: number
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

      const { data: roleRow, error: roleError } = await supabase
        .from('user_tenant_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', profile.active_tenant_id)
        .eq('is_active', true)
        .maybeSingle()

      if (roleError) {
        console.error('Error fetching role:', roleError)
      }

      const viewerRole = (roleRow as any)?.role ?? null

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

      // Sales partners should only see orders for clients referred by them
      if (viewerRole === 'sales_partner') {
        const { data: referredClients, error: referredError } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', profile.active_tenant_id)
          .eq('referred_by_id', user.id)

        if (referredError) {
          console.error('Error fetching referred clients:', referredError)
          throw new Error('Failed to fetch referred clients')
        }

        const clientIds = (referredClients || []).map((c: any) => c.id).filter(Boolean)
        if (clientIds.length === 0) {
          setOrders([])
          return
        }

        query = query.in('client_id', clientIds)
      }

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
        
        // Fetch assignments with technician data
        const { data: assignments, error: assignError } = await supabase
          .from('work_order_assignments')
          .select(`
            service_order_id,
            technician_id,
            role_in_order,
            technicians (
              id,
              full_name
            )
          `)
          .in('service_order_id', orderIds)

        if (assignError) {
          console.error('Error fetching assignments:', assignError)
        }

        console.log('Fetched assignments:', assignments?.length || 0)

        // Aggregate technician data per order
        const enrichedOrders = ordersData.map(order => {
          const orderAssignments = assignments?.filter(a => a.service_order_id === order.id) || []

          const nameForAssignment = (a: any) => {
            const tech = a.technicians
            if (Array.isArray(tech)) return tech[0]?.full_name
            return tech?.full_name
          }

          const primaries = orderAssignments.filter((a: any) => (a.role_in_order || 'primary') === 'primary')
          const assistants = orderAssignments.filter((a: any) => (a.role_in_order || '') === 'assistant')

          // Backward compatibility: if role_in_order is missing for all, treat as all primary
          const hasAnyRole = orderAssignments.some((a: any) => a.role_in_order)
          const effectivePrimaries = hasAnyRole ? primaries : orderAssignments
          const effectiveAssistants = hasAnyRole ? assistants : []

          const techNames = effectivePrimaries
            .map(nameForAssignment)
            .filter(Boolean)
            .join(', ')

          const helperNames = effectiveAssistants
            .map(nameForAssignment)
            .filter(Boolean)
            .join(', ')
          
          return {
            ...order,
            assigned_technician_names: techNames || undefined,
            technician_count: effectivePrimaries.length || 0,
            assigned_helper_names: helperNames || undefined,
            helper_count: effectiveAssistants.length || 0,
            client_name: order.client?.name,
            client_phone: order.client?.phone,
            service_location: order.location_address,
          }
        })

        console.log('Successfully fetched orders with technicians:', enrichedOrders.length)
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

      // Get current user and tenant context
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Not authenticated')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      if (!profile?.active_tenant_id) throw new Error('No active tenant')

      const { data: roleRow, error: roleError } = await supabase
        .from('user_tenant_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', profile.active_tenant_id)
        .eq('is_active', true)
        .maybeSingle()

      if (roleError) {
        console.error('Error fetching role:', roleError)
      }

      const viewerRole = (roleRow as any)?.role ?? null

      let allowedClientIds: string[] | null = null
      if (viewerRole === 'sales_partner') {
        const { data: referredClients, error: referredError } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', profile.active_tenant_id)
          .eq('referred_by_id', user.id)

        if (referredError) {
          console.error('Error fetching referred clients:', referredError)
          throw new Error('Failed to fetch referred clients')
        }

        allowedClientIds = (referredClients || []).map((c: any) => c.id).filter(Boolean)
        if (allowedClientIds.length === 0) {
          throw new Error('Order not found')
        }
      }

      // Fetch order with client and creator info
      let orderQuery = supabase
        .from('service_orders')
        .select(`
          *,
          client:clients!client_id(id, name, phone, email, address),
          creator:profiles!created_by(id, full_name)
        `)
        .eq('id', orderId)
        .eq('tenant_id', profile.active_tenant_id)

      if (viewerRole === 'sales_partner' && allowedClientIds) {
        orderQuery = orderQuery.in('client_id', allowedClientIds)
      }

      const { data: orderData, error: fetchError } = await orderQuery.single()

      if (fetchError) throw fetchError

      // Fetch technician assignments separately
      const { data: assignments } = await supabase
        .from('work_order_assignments')
        .select(`
          role_in_order,
          technician:technicians!technician_id(id, full_name)
        `)
        .eq('service_order_id', orderId)

      // Aggregate technician names
      let technicianNames = 'Unassigned'
      let technicianCount = 0
      let helperNames: string | undefined = undefined
      let helperCount = 0
      let firstTechnician = null

      if (assignments && assignments.length > 0) {
        const hasAnyRole = assignments.some((a: any) => a.role_in_order)
        const primaries = hasAnyRole
          ? assignments.filter((a: any) => (a.role_in_order || 'primary') === 'primary')
          : assignments
        const assistants = hasAnyRole
          ? assignments.filter((a: any) => (a.role_in_order || '') === 'assistant')
          : []

        const techNames = primaries
          .map((a: any) => a.technician?.full_name)
          .filter(Boolean)

        const assistantNames = assistants
          .map((a: any) => a.technician?.full_name)
          .filter(Boolean)

        technicianNames = techNames.length > 0 ? techNames.join(', ') : 'Unassigned'
        technicianCount = techNames.length
        helperNames = assistantNames.length > 0 ? assistantNames.join(', ') : undefined
        helperCount = assistantNames.length
        firstTechnician = primaries[0]?.technician || assignments[0]?.technician || null
      }

      // Merge data
      const enrichedOrder = {
        ...orderData,
        assigned_technician_names: technicianNames,
        technician_count: technicianCount,
        assigned_helper_names: helperNames,
        helper_count: helperCount,
        technician: firstTechnician, // For backward compatibility
      }

      setOrder(enrichedOrder)
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
