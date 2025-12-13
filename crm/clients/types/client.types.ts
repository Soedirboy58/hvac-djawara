export interface Client {
  id: string
  tenant_id: string
  name: string
  email: string
  phone: string
  address: string
  client_type: 'household' | 'corporate'
  created_at: string
}

export interface CreateClientDto {
  name: string
  email: string
  phone: string
  address: string
  client_type: 'household' | 'corporate'
}
