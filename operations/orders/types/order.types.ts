// Service Order types
export type OrderType = 'maintenance' | 'repair' | 'installation' | 'survey' | 'troubleshooting'
export type OrderStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'approved' | 'complaint' | 'invoiced' | 'paid' | 'cancelled'
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ServiceOrder {
  id: string
  tenant_id: string
  client_id: string
  order_number: string
  order_type: OrderType
  status: OrderStatus
  priority: JobPriority
  
  // Service details
  service_title: string
  service_description?: string
  location_address: string
  location_lat?: number
  location_lng?: number
  
  // Scheduling
  requested_date?: string
  scheduled_date?: string
  scheduled_time?: string
  estimated_duration?: number
  
  // Assignment
  assigned_to?: string
  
  // Metadata
  notes?: string
  is_survey: boolean
  created_by?: string
  created_at: string
  updated_at: string
  
  // Relations (joined data)
  client?: {
    id: string
    name: string
    phone: string
    email?: string
  }
  assigned_technician?: {
    id: string
    full_name: string
  }
}

export interface CreateOrderDto {
  client_id: string
  order_type: OrderType
  priority?: JobPriority
  service_title: string
  service_description?: string
  location_address: string
  requested_date?: string
  notes?: string
  is_survey?: boolean
}

export interface UpdateOrderDto {
  service_title?: string
  service_description?: string
  status?: OrderStatus
  priority?: JobPriority
  scheduled_date?: string
  scheduled_time?: string
  estimated_duration?: number
  assigned_to?: string
  notes?: string
}
