import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderStatus } from '../types/order.types'

export function useUpdateOrderStatus() {
  const supabase = createClient()

  const mutate = useCallback(
    async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      try {
        const { error } = await supabase
          .from('service_orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', orderId)

        if (error) throw error
        return true
      } catch (err) {
        console.error(err)
        return false
      }
    },
    [supabase]
  )

  return { mutate }
}
