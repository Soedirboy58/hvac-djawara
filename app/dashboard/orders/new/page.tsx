'use client'

import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  phone: string
}

interface Technician {
  id: string
  full_name: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    client_id: '',
    order_type: '',
    service_title: '',
    service_description: '',
    location_address: '',
    scheduled_date: '',
    scheduled_time: '',
    priority: 'normal',
    assigned_to: '',
    notes: '',
  })

  // Load clients and technicians
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true)
        setError(null)
        const supabase = createClient()

        // Get current user and tenant
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Not authenticated')
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('active_tenant_id')
          .eq('id', user.id)
          .single()

        if (!profile?.active_tenant_id) {
          throw new Error('No active tenant')
        }

        // Load clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone')
          .eq('tenant_id', profile.active_tenant_id)
          .eq('is_active', true)
          .order('name')

        if (clientsError) {
          console.error('Clients error:', clientsError)
        } else {
          setClients(clientsData || [])
        }

        // Load technicians from user_tenant_roles
        const { data: techData, error: techError } = await supabase
          .from('user_tenant_roles')
          .select(`
            user_id,
            profiles!user_tenant_roles_user_id_fkey(id, full_name)
          `)
          .eq('tenant_id', profile.active_tenant_id)
          .in('role', ['technician', 'tech_head', 'helper'])
          .eq('is_active', true)

        if (techError) {
          console.error('Technicians error:', techError)
        } else {
          const techList = (techData || []).map((item: any) => ({
            id: item.profiles?.id || '',
            full_name: item.profiles?.full_name || 'Unknown',
          })).filter(t => t.id)
          
          setTechnicians(techList)
        }
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message)
        toast.error(err.message || 'Failed to load form data')
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.client_id || !formData.order_type || !formData.service_title || !formData.location_address) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) {
        throw new Error('No active tenant')
      }

      // Create order
      const { data, error } = await supabase
        .from('service_orders')
        .insert({
          tenant_id: profile.active_tenant_id,
          client_id: formData.client_id,
          order_type: formData.order_type,
          service_title: formData.service_title,
          service_description: formData.service_description || null,
          location_address: formData.location_address,
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          priority: formData.priority,
          assigned_to: formData.assigned_to || null,
          notes: formData.notes || null,
          status: formData.assigned_to ? 'scheduled' : 'listing',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Order created successfully!')
      router.push(`/dashboard/orders`)
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error(error.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-muted-foreground">Loading form data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Error Loading Form</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
            <p className="text-gray-500">Add a new service order for a client</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Select an existing client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  disabled={clients.length === 0}
                >
                  <SelectTrigger id="client">
                    <SelectValue placeholder={clients.length > 0 ? "Select a client" : "No clients available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No clients found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-sm text-amber-600">
                    ⚠️ You need to create a client first. Go to Clients menu.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Service Location *</Label>
                <Textarea
                  id="location"
                  placeholder="Enter complete address..."
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order_type">Service Type *</Label>
                <Select 
                  value={formData.order_type} 
                  onValueChange={(value) => setFormData({ ...formData, order_type: value })}
                >
                  <SelectTrigger id="order_type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="survey">Survey</SelectItem>
                    <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                    <SelectItem value="konsultasi">Consultation</SelectItem>
                    <SelectItem value="pengadaan">Procurement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Service Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., AC Installation - Split 1 PK"
                  value={formData.service_title}
                  onChange={(e) => setFormData({ ...formData, service_title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about the service..."
                  value={formData.service_description}
                  onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="normal">🔵 Normal</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Scheduled Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Scheduled Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician">Assign Technician</Label>
                <Select 
                  value={formData.assigned_to} 
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger id="technician">
                    <SelectValue placeholder="Leave unassigned or select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {technicians.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No technicians available. Order will be unassigned.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || clients.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Order'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
