import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '../services/orderService'
import type { CreateOrderDto, UpdateOrderDto } from '../types/order.types'

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getOrders,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderService.getOrderById(id),
    enabled: !!id,
  })
}

export function useOrdersByStatus(status: string) {
  return useQuery({
    queryKey: ['orders', 'status', status],
    queryFn: () => orderService.getOrdersByStatus(status),
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (dto: CreateOrderDto) => orderService.createOrder(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrderDto }) =>
      orderService.updateOrder(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useAssignTechnician() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ orderId, technicianId }: { orderId: string; technicianId: string }) =>
      orderService.assignTechnician(orderId, technicianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      orderService.updateStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
