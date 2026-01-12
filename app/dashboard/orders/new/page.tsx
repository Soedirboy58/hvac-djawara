'use client'

import { ArrowLeft, Loader2, Plus, Clock } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClientForm } from '@/app/dashboard/clients/client-form'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  client_type?: string
}

type ClientProperty = {
  id: string
  property_name: string
  address: string
  city: string | null
}

interface Technician {
  full_name: string
  user_id?: string
  role?: string
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

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${String(hours).padStart(2, '0')}:${minutes}`
})

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [availableTechnicians, setAvailableTechnicians] = useState<Technician[]>([])
  const [availableHelpers, setAvailableHelpers] = useState<Technician[]>([])
  const [salesTeam, setSalesTeam] = useState<SalesPerson[]>([])
  const [error, setError] = useState<string | null>(null)
  const [supportsUnitFields, setSupportsUnitFields] = useState(false)
  const [supportsServiceCategoryFields, setSupportsServiceCategoryFields] = useState(false)
  const [supportsPropertyFields, setSupportsPropertyFields] = useState(false)
  const [supportsClientProperties, setSupportsClientProperties] = useState(false)
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [newWorkInitialStatus, setNewWorkInitialStatus] = useState<'listing' | 'scheduled'>('listing')
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([])
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([])

  const [clientSearch, setClientSearch] = useState('')
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [properties, setProperties] = useState<ClientProperty[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [newPropertyName, setNewPropertyName] = useState('')
  const [newPropertyAddress, setNewPropertyAddress] = useState('')
  const [newPropertyCity, setNewPropertyCity] = useState('')
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_phone: '',
    order_type: '',
    service_category_planned: '',
    service_title: '',
    service_description: '',
    unit_count: '',
    unit_category: '',
    location_address: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    priority: 'medium',
    assigned_to: '',
    sales_referral_id: '',
    order_source: 'admin_manual',
    notes: '',
    is_historical: 'false', // New field: false = new work, true = historical record
  })

  // Load clients and technicians
  useEffect(() => {
    loadData()
  }, [])

  // Keep selected client in sync
  useEffect(() => {
    if (!formData.client_id) {
      setSelectedClient(null)
      return
    }
    if (selectedClient?.id === formData.client_id) return
    const found = clients.find((c) => c.id === formData.client_id) || null
    if (found) setSelectedClient(found)
  }, [formData.client_id, clients, selectedClient?.id])

  // Load properties when client changes
  useEffect(() => {
    if (!tenantId || !formData.client_id) {
      setProperties([])
      setSelectedPropertyId('')
      setNewPropertyName('')
      setNewPropertyAddress('')
      setNewPropertyCity('')
      return
    }
    void loadProperties(formData.client_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, formData.client_id])

  // Auto-fill client phone and location (prefer property address if selected)
  useEffect(() => {
    if (!selectedClient) return
    const prop = selectedPropertyId ? properties.find((p) => p.id === selectedPropertyId) : null
    const nextAddress = prop?.address || selectedClient.address || ''

    setFormData((prev) => ({
      ...prev,
      client_phone: selectedClient.phone,
      location_address: nextAddress || prev.location_address,
    }))
  }, [selectedClient, selectedPropertyId, properties])

  // Debounced client search
  useEffect(() => {
    if (!tenantId) return
    const t = setTimeout(() => {
      void searchClients(clientSearch)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch, tenantId, viewerRole])

  const searchClients = async (term: string) => {
    if (!tenantId) return
    const supabase = createClient()
    setClientSearchLoading(true)
    try {
      let q = supabase
        .from('clients')
        .select('id, name, phone, email, address, client_type')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)

      if (viewerRole === 'sales_partner') {
        const { data: u } = await supabase.auth.getUser()
        const userId = u?.user?.id
        if (userId) q = q.eq('referred_by_id', userId)
      }

      const normalized = term.trim()
      if (normalized.length >= 2) {
        q = q.ilike('name', `%${normalized}%`)
      }

      const { data, error } = await q.order('name').limit(30)
      if (error) throw error
      setClients((data || []) as Client[])
    } catch (err) {
      console.error('Error searching clients:', err)
    } finally {
      setClientSearchLoading(false)
    }
  }

  const loadProperties = async (clientId: string) => {
    const supabase = createClient()
    setPropertiesLoading(true)
    try {
      const { data, error } = await supabase
        .from('client_properties')
        .select('id, property_name, address, city')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('property_name', { ascending: true })

      if (error) throw error
      setProperties((data || []) as ClientProperty[])
      setSelectedPropertyId('')
      setNewPropertyName('')
      setNewPropertyAddress('')
      setNewPropertyCity('')
    } catch (err) {
      console.error('Error loading properties:', err)
      setProperties([])
    } finally {
      setPropertiesLoading(false)
    }
  }

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

      setTenantId(profile.active_tenant_id)

      const { data: roleRow, error: roleError } = await supabase
        .from('user_tenant_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', profile.active_tenant_id)
        .eq('is_active', true)
        .maybeSingle()

      if (roleError) {
        console.error('Role error:', roleError)
      }

      const role = (roleRow as any)?.role ?? null
      setViewerRole(role)

      // Detect whether unit fields exist on service_orders (avoid breaking if DB migration not applied)
      const { error: unitFieldProbeError } = await supabase
        .from('service_orders')
        .select('id, unit_count, unit_category')
        .eq('tenant_id', profile.active_tenant_id)
        .limit(1)

      if (unitFieldProbeError) {
        console.warn('ℹ️ unit_count/unit_category not available yet:', unitFieldProbeError.message)
        setSupportsUnitFields(false)
      } else {
        setSupportsUnitFields(true)
      }

      // Detect whether service category fields exist on service_orders
      const { error: categoryProbeError } = await supabase
        .from('service_orders')
        .select('id, service_category_planned')
        .eq('tenant_id', profile.active_tenant_id)
        .limit(1)

      if (categoryProbeError) {
        console.warn('ℹ️ service_category_planned not available yet:', categoryProbeError.message)
        setSupportsServiceCategoryFields(false)
      } else {
        setSupportsServiceCategoryFields(true)
      }

      // Detect whether property_id exists on service_orders
      const { error: propertyProbeError } = await supabase
        .from('service_orders')
        .select('id, property_id')
        .eq('tenant_id', profile.active_tenant_id)
        .limit(1)

      if (propertyProbeError) {
        console.warn('ℹ️ property_id not available yet:', propertyProbeError.message)
        setSupportsPropertyFields(false)
      } else {
        setSupportsPropertyFields(true)
      }

      // Detect whether client_properties table is available (for property selection/creation UI)
      const { error: clientPropsProbeError } = await supabase
        .from('client_properties')
        .select('id')
        .eq('tenant_id', profile.active_tenant_id)
        .limit(1)

      if (clientPropsProbeError) {
        console.warn('ℹ️ client_properties not available yet:', clientPropsProbeError.message)
        setSupportsClientProperties(false)
      } else {
        setSupportsClientProperties(true)
      }

      // Load clients (sales_partner sees only referred clients)
      let clientsQuery = supabase
        .from('clients')
        .select('id, name, phone, email, address, client_type')
        .eq('tenant_id', profile.active_tenant_id)
        .eq('is_active', true)

      if (role === 'sales_partner') {
        clientsQuery = clientsQuery.eq('referred_by_id', user.id)
      }

      const { data: clientsData, error: clientsError } = await clientsQuery.order('name').limit(30)

      if (clientsError) {
        console.error('Clients error:', clientsError)
      } else {
        setClients(clientsData || [])
      }

      // Load team members from technicians table + include user_tenant_roles for display only.
      // For order assignment, we pick exactly 1 PIC (primary) and optional assistants (assistant),
      // independent from the user's global role.
      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('id, full_name, user_id, status')
        .eq('tenant_id', profile.active_tenant_id)
        .in('status', ['verified', 'active'])
        .order('full_name')

      if (techError) {
        console.error('❌ Technicians table error:', techError)
        setAvailableTechnicians([])
        setAvailableHelpers([])
      } else if (techData && techData.length > 0) {
        const userIds = techData.map((t: any) => t.user_id).filter(Boolean)

        const { data: rolesData, error: rolesError } = await supabase
          .from('user_tenant_roles')
          .select('user_id, role')
          .eq('tenant_id', profile.active_tenant_id)
          .in('user_id', userIds)
          .eq('is_active', true)

        if (rolesError) {
          console.error('❌ user_tenant_roles error:', rolesError)
        }

        const roleByUserId = new Map<string, string>()
        for (const row of rolesData || []) {
          roleByUserId.set((row as any).user_id, (row as any).role)
        }

        const withRoles: Technician[] = (techData as any[]).map((t) => ({
          id: t.id,
          full_name: t.full_name,
          user_id: t.user_id,
          role: t.user_id ? roleByUserId.get(t.user_id) : undefined,
        }))

        console.log('✅ Loaded team members:', { total: withRoles.length })
        // Keep both arrays populated for backward-compatible UI layout,
        // but assistants list will be rendered from the merged list.
        setAvailableTechnicians(withRoles)
        setAvailableHelpers(withRoles)
      } else {
        console.log('⚠️ No verified technicians found in database')
        setAvailableTechnicians([])
        setAvailableHelpers([])
      }

      // Load sales/marketing team - COMMENTED OUT (Coming Soon)
      // TODO: Uncomment when sales roles are ready
      // const { data: salesData, error: salesError } = await supabase
      //   .from('user_tenant_roles')
      //   .select('user_id, role, profiles!inner(id, full_name)')
      //   .eq('tenant_id', profile.active_tenant_id)
      //   .in('role', ['sales', 'marketing', 'business_dev'])
      //   .eq('is_active', true)
      //   .order('profiles(full_name)')

      // if (salesError) {
      //   console.error('Sales team error:', salesError)
      // } else {
      //   const mappedSales = (salesData || []).map((s: any) => ({
      //     id: s.profiles.id,
      //     full_name: s.profiles.full_name,
      //     role: s.role
      //   }))
      //   console.log('Loaded sales team:', mappedSales)
      //   setSalesTeam(mappedSales)
      // }
      
      console.log('ℹ️ Sales team feature: Coming soon')
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
      toast.error(err.message || 'Failed to load form data')
    } finally {
      setDataLoading(false)
    }
  }

  // File upload and document management - Coming Soon
  // TODO: Uncomment after running 04_CREATE_DOCUMENT_STORAGE.sql

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const needsProperty = supportsClientProperties
    const hasSelectedProperty = !!selectedPropertyId
    const hasNewPropertyInputs = !!newPropertyName.trim() && !!newPropertyAddress.trim()

    if (!formData.client_id || !formData.order_type || !formData.service_title || !formData.location_address) {
      toast.error('Please fill in all required fields')
      return
    }

    if (needsProperty && properties.length > 0 && !hasSelectedProperty) {
      toast.error('Pilih properti client terlebih dulu')
      return
    }

    if (needsProperty && properties.length === 0 && !hasNewPropertyInputs) {
      toast.error('Client baru harus punya data properti (nama & alamat)')
      return
    }

    const isSalesPartner = viewerRole === 'sales_partner'
    const isHistorical = formData.is_historical === 'true'
    const isScheduledNewWork = !isHistorical && !isSalesPartner && newWorkInitialStatus === 'scheduled'

    if (isScheduledNewWork && !formData.start_date) {
      toast.error('Untuk Scheduled, pilih Start Date terlebih dulu')
      return
    }

    if ((isHistorical || isScheduledNewWork) && selectedTechnicianIds.length < 1) {
      toast.error('Minimal pilih 1 teknisi (helper optional)')
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

      const mapPropertyCategory = (propertyType: string | null | undefined) => {
        const t = (propertyType || '').toLowerCase()
        if (t === 'pabrik_industri') return 'industri'
        if (t === 'rumah_tangga') return 'rumah_tangga'
        if (!t) return 'rumah_tangga'
        return 'layanan_publik'
      }

      let propertyIdToUse: string | null = needsProperty ? (selectedPropertyId || null) : null

      // If client has no properties yet, create one as part of the first order
      if (needsProperty && !propertyIdToUse && properties.length === 0) {
        const propertyType = (selectedClient?.client_type || 'rumah_tangga') as string
        const propertyCategory = mapPropertyCategory(propertyType)

        const { data: createdProp, error: propErr } = await supabase
          .from('client_properties')
          .insert({
            tenant_id: profile.active_tenant_id,
            client_id: formData.client_id,
            property_name: newPropertyName.trim(),
            address: newPropertyAddress.trim(),
            city: newPropertyCity.trim() || null,
            property_type: propertyType,
            property_category: propertyCategory,
            is_primary: true,
            is_active: true,
            created_by: user.id,
            updated_by: user.id,
          })
          .select('id')
          .single()

        if (propErr) throw propErr
        propertyIdToUse = (createdProp as any)?.id || null
      }

      // Determine status based on historical flag and assignment
      let orderStatus = 'listing'
      
      if (formData.is_historical === 'true') {
        // Historical record - pekerjaan yang sudah selesai
        orderStatus = 'completed'
      } else {
        // New work
        if (isSalesPartner) {
          // Sales partner flow: always listing; scheduling handled by admin
          orderStatus = 'listing'
        } else if (newWorkInitialStatus === 'scheduled') {
          orderStatus = 'scheduled'
        } else {
          orderStatus = 'listing'
        }
      }

      // Create order
      const notesWithUnitFallback = (() => {
        const base = formData.notes?.trim() || ''
        if (supportsUnitFields) return base || null

        const unitCountText = formData.unit_count ? `Jumlah Unit: ${formData.unit_count}` : ''
        const unitCategoryText = formData.unit_category ? `Kategori Unit: ${formData.unit_category}` : ''
        const unitInfo = [unitCountText, unitCategoryText].filter(Boolean).join(' • ')

        if (!unitInfo) return base || null
        if (!base) return unitInfo
        return `${base}\n\n${unitInfo}`
      })()

      const { data: newOrder, error: orderError } = await supabase
        .from('service_orders')
        .insert({
          tenant_id: profile.active_tenant_id,
          client_id: formData.client_id,
          ...(supportsPropertyFields ? { property_id: propertyIdToUse } : {}),
          order_type: formData.order_type,
          ...(supportsServiceCategoryFields
            ? { service_category_planned: formData.service_category_planned || null }
            : {}),
          service_title: formData.service_title,
          service_description: formData.service_description || null,
          ...(supportsUnitFields
            ? {
                unit_count: formData.unit_count ? parseInt(formData.unit_count) : null,
                unit_category: formData.unit_category || null,
              }
            : {}),
          location_address: formData.location_address,
          ...((isHistorical || isScheduledNewWork)
            ? {
                scheduled_date: formData.start_date || null,
                scheduled_time: formData.start_time || null,
                estimated_end_date: formData.end_date || null,
                estimated_end_time: formData.end_time || null,
              }
            : {
                scheduled_date: null,
                scheduled_time: null,
                estimated_end_date: null,
                estimated_end_time: null,
              }),
          priority: formData.priority,
          // sales_referral_id: formData.sales_referral_id || null,
          // order_source: formData.order_source,
          // approval_documents: approvalDocuments,
          notes: notesWithUnitFallback,
          status: orderStatus,
          created_by: user.id,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create work order assignments (only when scheduled/historical; sales partner new work stays listing)
      if ((isHistorical || isScheduledNewWork) && (selectedTechnicianIds.length > 0 || selectedHelperIds.length > 0) && newOrder.id) {
        const picId = selectedTechnicianIds[0] || null
        const assistantIds = Array.from(
          new Set(selectedHelperIds.filter((id) => id && id !== picId))
        )

        const assignments = [
          ...(picId
            ? [
                {
                  service_order_id: newOrder.id,
                  technician_id: picId,
                  assigned_by: user.id,
                  status: 'assigned',
                  role_in_order: 'primary',
                },
              ]
            : []),
          ...assistantIds.map((techId) => ({
            service_order_id: newOrder.id,
            technician_id: techId,
            assigned_by: user.id,
            status: 'assigned',
            role_in_order: 'assistant',
          })),
        ]

        const { error: assignError } = await supabase
          .from('work_order_assignments')
          .insert(assignments)

        if (assignError) {
          console.error('Error assigning technicians:', assignError)
          toast.error('Order created but failed to assign some technicians')
        } else {
          toast.success(`Assigned: ${picId ? 1 : 0} PIC, ${assistantIds.length} assistant(s)`) 
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClientDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Client
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                  </DialogHeader>

                  {tenantId ? (
                    <ClientForm
                      tenantId={tenantId}
                      redirectTo={null}
                      onSaved={(savedClient) => {
                        const mapped: Client = {
                          id: savedClient.id,
                          name: savedClient.name,
                          phone: savedClient.phone,
                          email: savedClient.email ?? undefined,
                          address: savedClient.address ?? undefined,
                          client_type: (savedClient as any).client_type ?? undefined,
                        }

                        setClients((prev) => {
                          const next = [...prev.filter((c) => c.id !== mapped.id), mapped]
                          next.sort((a, b) => a.name.localeCompare(b.name))
                          return next
                        })

                        setFormData((prev) => ({
                          ...prev,
                          client_id: mapped.id,
                          client_phone: mapped.phone,
                          location_address: mapped.address || prev.location_address,
                        }))

                        setSelectedClient(mapped)
                        setClientSearch(mapped.name)

                        setClientDialogOpen(false)
                        toast.success(`Client "${mapped.name}" created and selected`)
                      }}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Loading tenant context...
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <div className="space-y-2">
                <Label htmlFor="client_search">Cari Client *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="client_search"
                    placeholder="Ketik nama client (min 2 huruf)"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  {clientSearchLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Menampilkan maksimal 30 hasil. Jika kosong, coba ketik minimal 2 huruf.
                </p>

                <Select
                  value={formData.client_id}
                  onValueChange={(value) => {
                    const picked = clients.find((c) => c.id === value) || null
                    setSelectedClient(picked)
                    setFormData((prev) => ({ ...prev, client_id: value }))
                  }}
                  disabled={clients.length === 0}
                >
                  <SelectTrigger id="client">
                    <SelectValue
                      placeholder={clients.length > 0 ? 'Pilih client dari hasil pencarian' : 'Client tidak ditemukan'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Tidak ada client
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
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

              {supportsClientProperties && formData.client_id && (
                <div className="space-y-3">
                  <Separator />
                  <div className="space-y-1">
                    <Label>Properti Client *</Label>
                    <p className="text-xs text-muted-foreground">
                      Order harus terkait dengan properti. Jika client belum punya properti, buat properti saat ini.
                    </p>
                  </div>

                  {propertiesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading properties...
                    </div>
                  ) : properties.length > 0 ? (
                    <div className="space-y-2">
                      <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                        <SelectTrigger id="property_id">
                          <SelectValue placeholder="Pilih properti" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.property_name}
                              {p.city ? ` - ${p.city}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Alamat lokasi akan mengikuti alamat properti (bisa diedit).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="new_property_name">Nama Properti *</Label>
                        <Input
                          id="new_property_name"
                          placeholder="Contoh: Rumah Pak Budi / Kantor Cabang A"
                          value={newPropertyName}
                          onChange={(e) => setNewPropertyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_property_address">Alamat Properti *</Label>
                        <Textarea
                          id="new_property_address"
                          placeholder="Masukkan alamat lengkap properti..."
                          value={newPropertyAddress}
                          onChange={(e) => setNewPropertyAddress(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_property_city">Kota (optional)</Label>
                        <Input
                          id="new_property_city"
                          placeholder="Contoh: Jakarta"
                          value={newPropertyCity}
                          onChange={(e) => setNewPropertyCity(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
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

              <Separator />

              {/* Order Type - Historical or New Work */}
              <div className="space-y-2">
                <Label htmlFor="is_historical">Tipe Pencatatan *</Label>
                <Select 
                  value={formData.is_historical} 
                  onValueChange={(value) => setFormData({ ...formData, is_historical: value })}
                >
                  <SelectTrigger id="is_historical">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <div>
                          <p className="font-medium">Pekerjaan Baru</p>
                          <p className="text-xs text-gray-500">Order yang akan dikerjakan</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        <div>
                          <p className="font-medium">Riwayat / Sudah Selesai</p>
                          <p className="text-xs text-gray-500">Pekerjaan yang sudah dikerjakan (historical record)</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.is_historical === 'true' ? (
                    <span className="text-green-600">
                      ✅ Order ini akan tercatat sebagai <strong>Completed</strong> (riwayat pekerjaan yang sudah selesai)
                    </span>
                  ) : (
                    <span className="text-blue-600">
                      🔵 Order ini akan tercatat sebagai <strong>Listing/Scheduled</strong> (pekerjaan yang akan dikerjakan)
                    </span>
                  )}
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
                  onValueChange={(value) => setFormData({
                    ...formData,
                    order_type: value,
                    service_category_planned: value === 'survey' ? '' : formData.service_category_planned,
                  })}
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

              {formData.order_type === 'survey' ? (
                <div className="space-y-2">
                  <Label>Kategori Tindak Lanjut (A-D)</Label>
                  <p className="text-xs text-muted-foreground">
                    Untuk order <span className="font-medium">Survey</span>, kategori tindak lanjut ditentukan oleh admin setelah checking & penawaran.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="service_category_planned">Kategori Service (A-D)</Label>
                  <Select
                    value={formData.service_category_planned || undefined}
                    onValueChange={(value) => setFormData({ ...formData, service_category_planned: value })}
                    disabled={!supportsServiceCategoryFields}
                  >
                    <SelectTrigger id="service_category_planned">
                      <SelectValue placeholder={supportsServiceCategoryFields ? 'Pilih kategori (opsional)' : 'Belum tersedia (DB belum update)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Maintenance / Pemeliharaan</SelectItem>
                      <SelectItem value="B">B - Minor Repair (Electrical/Support)</SelectItem>
                      <SelectItem value="C">C - Major Repair (Part Utama Unit)</SelectItem>
                      <SelectItem value="D">D - Sistem Refrigerasi (Vacuum/Refrigerant/Leak)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.service_category_planned ? (
                    <p className="text-xs text-muted-foreground">
                      {formData.service_category_planned === 'A'
                        ? 'A: Maintenance / pemeliharaan rutin (ringan)'
                        : formData.service_category_planned === 'B'
                          ? 'B: Minor repair (electrical/support)'
                          : formData.service_category_planned === 'C'
                            ? 'C: Major repair (part utama unit)'
                            : 'D: Sistem refrigerasi (vacuum / refrigerant / leak)'}
                    </p>
                  ) : null}
                </div>
              )}

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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit_count">Jumlah Unit (Optional)</Label>
                  <Input
                    id="unit_count"
                    type="number"
                    min={1}
                    placeholder="e.g., 10"
                    value={formData.unit_count}
                    onChange={(e) => setFormData({ ...formData, unit_count: e.target.value })}
                  />
                  {!supportsUnitFields && (formData.unit_count || formData.unit_category) && (
                    <p className="text-xs text-muted-foreground">
                      Catatan: kolom database belum aktif; akan disimpan ke Notes.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_category">Kategori Unit (Optional)</Label>
                  <Select
                    value={formData.unit_category || undefined}
                    onValueChange={(value) => setFormData({ ...formData, unit_category: value })}
                  >
                    <SelectTrigger id="unit_category">
                      <SelectValue placeholder="Pilih kategori unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Split</SelectItem>
                      <SelectItem value="cassette">Cassette</SelectItem>
                      <SelectItem value="standing_floor">Standing Floor</SelectItem>
                      <SelectItem value="split_duct">Split Duct</SelectItem>
                      <SelectItem value="vrf_vrv">VRF / VRV</SelectItem>
                      <SelectItem value="cold_storage">Cold Storage</SelectItem>
                      <SelectItem value="refrigerator">Refrigerator</SelectItem>
                      <SelectItem value="other">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <SelectItem value="medium">🔵 Medium</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Source - HIDDEN (Coming Soon) */}
              {/* TODO: Uncomment after running 03_ADD_ORDER_SOURCE_TRACKING.sql
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
              */}

              {/* Sales/Marketing Referral - HIDDEN (Coming Soon) */}
              {/* TODO: Uncomment when sales team feature is ready
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
              */}

              {/* Approval Documents Upload - HIDDEN (Coming Soon) */}
              {/* TODO: Uncomment after running 04_CREATE_DOCUMENT_STORAGE.sql
              {(formData.order_source === 'approved_proposal' || formData.order_source === 'customer_request') && (
                <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label htmlFor="documents">📎 Upload Approval Documents</Label>
                  <p className="text-xs text-blue-700 mb-2">
                    Upload SPK (Surat Perintah Kerja), approval proofs, or proposals. Max 10MB per file.
                  </p>
                  ... document upload form ...
                </div>
              )}
              */}
            </CardContent>
          </Card>

          {/* Schedule & Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Project Schedule</CardTitle>
              <CardDescription>
                {formData.is_historical === 'true' ? (
                  <span className="text-green-700">
                    📋 <strong>Riwayat:</strong> Masukkan tanggal saat pekerjaan <strong>sebenarnya dikerjakan</strong> (tanggal masa lalu)
                  </span>
                ) : (
                  <span>
                    {viewerRole === 'sales_partner'
                      ? 'Order dari sales partner akan masuk Listing; penjadwalan dilakukan oleh admin.'
                      : 'Pilih apakah order langsung dijadwalkan atau masuk Listing.'}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.is_historical === 'false' && viewerRole !== 'sales_partner' && (
                <div className="space-y-2">
                  <Label htmlFor="new_work_initial_status">Pekerjaan Baru: Status Awal</Label>
                  <Select
                    value={newWorkInitialStatus}
                    onValueChange={(value) => {
                      const v = value as 'listing' | 'scheduled'
                      setNewWorkInitialStatus(v)
                      if (v === 'listing') {
                        setFormData((prev) => ({
                          ...prev,
                          start_date: '',
                          start_time: '',
                          end_date: '',
                          end_time: '',
                        }))
                        setSelectedTechnicianIds([])
                        setSelectedHelperIds([])
                      }
                    }}
                  >
                    <SelectTrigger id="new_work_initial_status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listing">Listing (admin jadwalkan)</SelectItem>
                      <SelectItem value="scheduled">Scheduled (isi jadwal + teknisi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(formData.is_historical === 'true' || (viewerRole !== 'sales_partner' && newWorkInitialStatus === 'scheduled')) && (
                <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">
                    Start Date {formData.is_historical === 'true' ? '(Tanggal Dikerjakan)' : ''}
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.is_historical === 'true' 
                      ? '📅 Pilih tanggal saat pekerjaan dikerjakan' 
                      : 'Can select any date (past or future)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time (24H)</Label>
                  <Select
                    value={formData.start_time || undefined}
                    onValueChange={(value) => setFormData({ ...formData, start_time: value })}
                  >
                    <SelectTrigger id="start_time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Pilih slot waktu (tanpa input manual)
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
                  <Select
                    value={formData.end_time || undefined}
                    onValueChange={(value) => setFormData({ ...formData, end_time: value })}
                  >
                    <SelectTrigger id="end_time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label>Assign PIC & Helper <span className="text-red-500">*</span></Label>
                <p className="text-xs text-muted-foreground mb-3">
                  PIC (1 orang) wajib. Helper/Assistant optional.
                </p>
                {availableTechnicians.length === 0 ? (
                  <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-500">No verified technicians available. Order will be unassigned.</p>
                  </div>
                ) : (
                  (() => {
                    const picId = selectedTechnicianIds[0] || ''
                    const allCandidates = [...availableTechnicians, ...availableHelpers]
                    const seen = new Set<string>()
                    const teamCandidates = allCandidates.filter((m) => {
                      if (!m?.id) return false
                      if (seen.has(m.id)) return false
                      seen.add(m.id)
                      return true
                    })
                    const assistantCandidates = teamCandidates.filter((m) => m.id !== picId)

                    return (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 p-4 border border-gray-200 rounded-lg bg-white">
                      <p className="text-sm font-semibold text-gray-900">🧑‍🔧 PIC (Wajib 1)</p>
                      {teamCandidates.map((tech) => (
                        <label
                          key={tech.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="order_pic"
                            checked={(selectedTechnicianIds[0] || '') === tech.id}
                            onChange={(e) => {
                              if (!e.target.checked) return
                              setSelectedTechnicianIds([tech.id])
                              // Prevent PIC also being selected as assistant
                              setSelectedHelperIds((prev) => prev.filter((id) => id !== tech.id))
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-900">{tech.full_name}</span>
                        </label>
                      ))}
                    </div>

                    <div className="space-y-2 p-4 border border-gray-200 rounded-lg bg-white">
                      <p className="text-sm font-semibold text-gray-900">🧰 Helper / Assistant (Optional)</p>
                      {assistantCandidates.length === 0 ? (
                        <p className="text-sm text-gray-500">Pilih PIC terlebih dahulu</p>
                      ) : (
                        assistantCandidates.map((tech) => (
                          <label
                            key={tech.id}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedHelperIds.includes(tech.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Do not allow selecting PIC as assistant
                                  if ((selectedTechnicianIds[0] || '') === tech.id) return
                                  setSelectedHelperIds([...selectedHelperIds, tech.id])
                                } else {
                                  setSelectedHelperIds(selectedHelperIds.filter((id) => id !== tech.id))
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-900">{tech.full_name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                    )
                  })()
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedTechnicianIds.length ? 1 : 0} PIC, {selectedHelperIds.length} assistant(s)
                </p>
              </div>
                </>
              )}

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
          {(formData.is_historical === 'true' || (viewerRole !== 'sales_partner' && newWorkInitialStatus === 'scheduled')) && formData.start_date && (
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
                      {(selectedTechnicianIds.length > 0 || selectedHelperIds.length > 0) && `✓ ${selectedTechnicianIds.length + selectedHelperIds.length} team member(s) will receive notification`}
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
