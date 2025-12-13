import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ServiceOrder, ServiceOrderWithClient, OrderStatus } from '../types/order.types'
import { useAuth } from '@/hooks/use-auth'

interface UseOrdersOptions {
  status?: OrderStatus
  limit?: number
  offset?: number
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<ServiceOrderWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    if (!user?.user_metadata?.tenant_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('service_orders')
        .select(
          `*,
          clients:client_id (id, name, phone, email, address),
          assigned_to_user:assigned_to (id, full_name, email)`
        )
        .eq('tenant_id', user.user_metadata.tenant_id)
        .order('created_at', { ascending: false })

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform data to match ServiceOrderWithClient interface
      const transformedData = (data || []).map((order: any) => ({
        ...order,
        client: order.clients,
        technician: order.assigned_to_user,
      }))

      setOrders(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [user?.user_metadata?.tenant_id, options.status, options.limit, options.offset, supabase])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', orderId)

        if (updateError) throw updateError

        // Update local state
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status } : order
          )
        )

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update order')
        return false
      }
    },
    [supabase]
  )

  const assignOrderToTechnician = useCallback(
    async (orderId: string, technicianId: string) => {
      try {
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({
            assigned_to: technicianId,
            status: 'assigned' as const,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)

        if (updateError) throw updateError

        // Update local state
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, assigned_to: technicianId, status: 'assigned' }
              : order
          )
        )

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to assign order')
        return false
      }
    },
    [supabase]
  )

  const deleteOrder = useCallback(
    async (orderId: string) => {
      try {
        const { error: deleteError } = await supabase
          .from('service_orders')
          .delete()
          .eq('id', orderId)

        if (deleteError) throw deleteError

        setOrders((prev) => prev.filter((order) => order.id !== orderId))
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete order')
        return false
      }
    },
    [supabase]
  )

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    assignOrderToTechnician,
    deleteOrder,
  }
}

export function useOrderDetail(orderId: string) {
  const [order, setOrder] = useState<ServiceOrderWithClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('service_orders')
          .select(
            `*,
            clients:client_id (id, name, phone, email, address),
            assigned_to_user:assigned_to (id, full_name, email)`
          )
          .eq('id', orderId)
          .single()

        if (fetchError) throw fetchError

        const transformedData = {
          ...data,
          client: data.clients,
          technician: data.assigned_to_user,
        }

        setOrder(transformedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch order detail')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrderDetail()
    }
  }, [orderId, supabase])

  return { order, loading, error }
}
