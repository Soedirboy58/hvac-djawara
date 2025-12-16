'use client'

import { ArrowLeft, Loader2, Plus, X, Clock } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
}

interface Technician {
  id: string
  full_name: string
}

interface SalesPerson {
  id: string
  full_name: string
  role: string
}

interface ApprovalDocument {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: string
  uploadedBy: string
  category: 'spk' | 'approval' | 'proposal' | 'other'
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
]

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [salesTeam, setSalesTeam] = useState<SalesPerson[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [creatingClient, setCreatingClient] = useState(false)
  const [approvalDocuments, setApprovalDocuments] = useState<ApprovalDocument[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_phone: '',
    order_type: '',
    service_title: '',
    service_description: '',
    location_address: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    priority: 'normal',
    assigned_to: '',
    sales_referral_id: '',
    order_source: 'admin_manual',
    notes: '',
  })

  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })

  // Load clients and technicians
  useEffect(() => {
    loadData()
  }, [])

  // Auto-fill client data when client selected
  useEffect(() => {
    if (formData.client_id && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === formData.client_id)
      if (selectedClient) {
        setFormData(prev => ({
          ...prev,
          client_phone: selectedClient.phone,
          location_address: selectedClient.address || ''
        }))
      }
    }
  }, [formData.client_id, clients])

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
        .select('id, name, phone, email, address')
        .eq('tenant_id', profile.active_tenant_id)
        .eq('is_active', true)
        .order('name')

      if (clientsError) {
        console.error('Clients error:', clientsError)
      } else {
        setClients(clientsData || [])
      }

      // Load technicians - try from technicians table first (Team Management uses this)
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('id, full_name, status, phone, email')
        .eq('tenant_id', profile.active_tenant_id)
        .in('status', ['verified', 'active'])
        .order('full_name')

      if (techError) {
        console.error('❌ Technicians table error:', techError)
        
        // Fallback: try user_tenant_roles
        const { data: roleData, error: roleError } = await supabase
          .from('user_tenant_roles')
          .select(`
            user_id,
            role,
            profiles!inner(
              id,
              full_name
            )
          `)
          .eq('tenant_id', profile.active_tenant_id)
          .in('role', ['technician', 'tech_head'])
          .eq('is_active', true)
        
        if (!roleError && roleData && roleData.length > 0) {
          const mappedTechs = roleData.map((t: any) => ({
            id: t.profiles.id,
            full_name: t.profiles.full_name
          }))
          console.log('✅ Loaded technicians from user_tenant_roles:', mappedTechs)
          setTechnicians(mappedTechs)
        } else {
          console.error('❌ Both queries failed')
          setTechnicians([])
        }
      } else if (techData && techData.length > 0) {
        console.log('✅ Loaded technicians from technicians table:', techData)
        setTechnicians(techData)
      } else {
        console.log('⚠️ No verified technicians found in database')
        setTechnicians([])
      }

      // Load sales/marketing team
      const { data: salesData, error: salesError } = await supabase
        .from('user_tenant_roles')
        .select('user_id, role, profiles!inner(id, full_name)')
        .eq('tenant_id', profile.active_tenant_id)
        .in('role', ['sales', 'marketing', 'business_dev'])
        .eq('is_active', true)
        .order('profiles(full_name)')

      if (salesError) {
        console.error('Sales team error:', salesError)
      } else {
        const mappedSales = (salesData || []).map((s: any) => ({
          id: s.profiles.id,
          full_name: s.profiles.full_name,
          role: s.role
        }))
        console.log('Loaded sales team:', mappedSales)
        setSalesTeam(mappedSales)
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
      toast.error(err.message || 'Failed to load form data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientData.name || !newClientData.phone) {
      toast.error('Name and phone are required')
      return
    }

    setCreatingClient(true)

    try {
      const supabase = createClient()
      
      // Get current user and tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) throw new Error('No active tenant')

      // Create client
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          tenant_id: profile.active_tenant_id,
          name: newClientData.name,
          phone: newClientData.phone,
          email: newClientData.email || null,
          address: newClientData.address || null,
          is_active: true,
        })
        .select()
        .single()

      if (createError) throw createError

      toast.success(`Client "${newClientData.name}" created successfully!`)
      
      // Add to clients list and select it
      setClients([...clients, newClient])
      setFormData({ ...formData, client_id: newClient.id })
      
      // Reset and hide form
      setNewClientData({ name: '', phone: '', email: '', address: '' })
      setShowNewClientForm(false)
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error(error.message || 'Failed to create client')
    } finally {
      setCreatingClient(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFiles(true)
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const uploadedDocs: ApprovalDocument[] = []

      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 10MB)`)
          continue
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-documents')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('order-documents')
          .getPublicUrl(filePath)

        // Create document metadata
        const doc: ApprovalDocument = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id,
          category: 'approval' // Default category
        }

        uploadedDocs.push(doc)
      }

      if (uploadedDocs.length > 0) {
        setApprovalDocuments([...approvalDocuments, ...uploadedDocs])
        toast.success(`${uploadedDocs.length} document(s) uploaded successfully!`)
      }
    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error(error.message || 'Failed to upload files')
    } finally {
      setUploadingFiles(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const removeDocument = (docId: string) => {
    setApprovalDocuments(approvalDocuments.filter(doc => doc.id !== docId))
    toast.success('Document removed')
  }

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
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.active_tenant_id) throw new Error('No active tenant')

      // Determine status based on assignment and schedule
      let orderStatus = 'listing'
      if (formData.start_date) {
        orderStatus = formData.assigned_to ? 'scheduled' : 'pending'
      }

      // Create order
      const { data: newOrder, error: orderError } = await supabase
        .from('service_orders')
        .insert({
          tenant_id: profile.active_tenant_id,
          client_id: formData.client_id,
          order_type: formData.order_type,
          service_title: formData.service_title,
          service_description: formData.service_description || null,
          location_address: formData.location_address,
          scheduled_date: formData.start_date || null,
          scheduled_time: formData.start_time || null,
          estimated_end_date: formData.end_date || null,
          estimated_end_time: formData.end_time || null,
          priority: formData.priority,
          sales_referral_id: formData.sales_referral_id || null,
          order_source: formData.order_source,
          approval_documents: approvalDocuments,
          notes: formData.notes || null,
          status: orderStatus,
          created_by: user.id,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // If technician assigned, create work order assignment
      if (formData.assigned_to && newOrder.id) {
        const { error: assignError } = await supabase
          .from('work_order_assignments')
          .insert({
            order_id: newOrder.id,
            technician_id: formData.assigned_to,
            assigned_by: user.id,
            assignment_date: new Date().toISOString(),
            status: 'assigned',
          })

        if (assignError) {
          console.error('Error assigning technician:', assignError)
          toast.error('Order created but failed to assign technician')
        }
      }

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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Client Information</CardTitle>
                  <CardDescription>Select an existing client or add a new one</CardDescription>
                </div>
                {!showNewClientForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewClientForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Client
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewClientForm ? (
                <>
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-blue-900">New Client Form</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewClientForm(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="new_client_name">Client Name *</Label>
                        <Input
                          id="new_client_name"
                          placeholder="e.g., PT Jaya Abadi"
                          value={newClientData.name}
                          onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                          disabled={creatingClient}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_client_phone">Phone *</Label>
                        <Input
                          id="new_client_phone"
                          type="tel"
                          placeholder="e.g., 08123456789"
                          value={newClientData.phone}
                          onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                          disabled={creatingClient}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_client_email">Email</Label>
                      <Input
                        id="new_client_email"
                        type="email"
                        placeholder="client@email.com"
                        value={newClientData.email}
                        onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                        disabled={creatingClient}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_client_address">Address</Label>
                      <Textarea
                        id="new_client_address"
                        placeholder="Complete address..."
                        value={newClientData.address}
                        onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                        rows={2}
                        disabled={creatingClient}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={creatingClient}
                      className="w-full"
                    >
                      {creatingClient ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Client...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create & Select Client
                        </>
                      )}
                    </Button>
                  </div>
                  <Separator />
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="client">Select Client *</Label>
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
                {clients.length === 0 && !showNewClientForm && (
                  <p className="text-sm text-amber-600">
                    ⚠️ No clients available. Click "Add New Client" button above.
                  </p>
                )}
              </div>

              {formData.client_id && (
                <div className="space-y-2">
                  <Label htmlFor="client_phone">Client Phone</Label>
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    📞 Auto-filled from client data
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Service Location *</Label>
                <Textarea
                  id="location"
                  placeholder="Enter complete service address..."
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  📍 {formData.client_id ? 'Auto-filled from client address (you can edit)' : 'Enter complete service address'}
                </p>
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
                    <SelectItem value="installation">🔧 Installation</SelectItem>
                    <SelectItem value="maintenance">🛠️ Maintenance</SelectItem>
                    <SelectItem value="repair">⚙️ Repair</SelectItem>
                    <SelectItem value="survey">📋 Survey</SelectItem>
                    <SelectItem value="troubleshooting">🔍 Troubleshooting</SelectItem>
                    <SelectItem value="konsultasi">💬 Consultation</SelectItem>
                    <SelectItem value="pengadaan">📦 Procurement</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="order_source">Order Source <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.order_source} 
                  onValueChange={(value) => setFormData({ ...formData, order_source: value })}
                >
                  <SelectTrigger id="order_source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landing_page">🌐 Landing Page (Auto)</SelectItem>
                    <SelectItem value="customer_request">📞 Customer Request</SelectItem>
                    <SelectItem value="approved_proposal">✅ Approved Proposal</SelectItem>
                    <SelectItem value="admin_manual">✏️ Admin Manual Entry</SelectItem>
                    <SelectItem value="phone_call">☎️ Phone Call</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="walk_in">🚶 Walk-in Customer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Track how this order was created. Helps with analytics and technician verification.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sales_referral">Sales/Marketing Referral (Optional)</Label>
                <Select 
                  value={formData.sales_referral_id || undefined} 
                  onValueChange={(value) => setFormData({ ...formData, sales_referral_id: value })}
                >
                  <SelectTrigger id="sales_referral">
                    <SelectValue placeholder="Select referral source" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesTeam.length > 0 ? (
                      salesTeam.map((sales) => (
                        <SelectItem key={sales.id} value={sales.id}>
                          💼 {sales.full_name} ({sales.role})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No sales team available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Track who brought this job for commission/performance tracking
                </p>
              </div>

              {/* Approval Documents Upload */}
              {(formData.order_source === 'approved_proposal' || formData.order_source === 'customer_request') && (
                <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label htmlFor="documents">📎 Upload Approval Documents</Label>
                  <p className="text-xs text-blue-700 mb-2">
                    Upload SPK (Surat Perintah Kerja), approval proofs, or proposals. Max 10MB per file.
                  </p>
                  <Input
                    id="documents"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    disabled={uploadingFiles}
                    className="cursor-pointer"
                  />
                  {uploadingFiles && (
                    <p className="text-xs text-blue-600 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading files...
                    </p>
                  )}
                  
                  {/* Document List */}
                  {approvalDocuments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-blue-900">Uploaded Documents:</p>
                      {approvalDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-white border border-blue-100 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-lg">📄</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-blue-600 mt-2">
                    💡 These documents help technicians verify the work scope and authorization
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Project Schedule</CardTitle>
              <CardDescription>
                Set start and end date/time for project estimation. Schedule will sync to client portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Can select any date (past or future)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time (24H)</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: 00:00 - 23:59
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date (Estimated)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time (24H)</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estimated completion time
                  </p>
                </div>
              </div>

              {formData.start_date && formData.end_date && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    📅 <strong>Project Duration:</strong> {
                      Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                    } day(s)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="technician">Assign Technician (Optional)</Label>
                <Select 
                  value={formData.assigned_to || undefined} 
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger id="technician">
                    <SelectValue placeholder="Leave unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        👤 {tech.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {technicians.length === 0 
                    ? "No verified technicians available. Order will be unassigned." 
                    : "Technician will receive notification and see this in their work queue"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes (not visible to client)..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Info */}
          {formData.start_date && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-green-900">Project Schedule Confirmation</h4>
                    <p className="text-sm text-green-700">
                      <strong>Start:</strong> {new Date(formData.start_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      {formData.start_time && ` at ${formData.start_time}`}
                      <br />
                      {formData.end_date && (
                        <>
                          <strong>End (Est):</strong> {new Date(formData.end_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          {formData.end_time && ` at ${formData.end_time}`}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Client will see this schedule in their portal<br />
                      ✓ Supports 24-hour format for flexible scheduling<br />
                      {formData.assigned_to && '✓ Assigned technician will receive notification'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || clients.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Order...
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
