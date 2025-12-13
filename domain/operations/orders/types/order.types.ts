// Service Order Types
export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type OrderType = 'installation' | 'maintenance' | 'repair' | 'survey' | 'troubleshooting' | 'konsultasi' | 'pengadaan'

export interface ServiceOrder {
  id: string
  tenant_id: string
  client_id: string
  order_number: string
  order_type: OrderType
  service_title: string
  service_description?: string
  location_address: string
  requested_date?: string
  scheduled_date?: string
  scheduled_time?: string
  status: OrderStatus
  assigned_to?: string
  estimated_duration?: number
  notes?: string
  source?: string
  created_at: string
  updated_at: string
}

export interface ServiceOrderWithClient extends ServiceOrder {
  client?: {
    id: string
    name: string
    phone: string
    email?: string
    address?: string
  }
  technician?: {
    id: string
    name: string
    email: string
  }
}
