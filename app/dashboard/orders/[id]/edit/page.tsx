'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
]

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [supportsUnitFields, setSupportsUnitFields] = useState(false)
  const [availableTechnicians, setAvailableTechnicians] = useState<Array<{ id: string; full_name: string; role?: string }>>([])
  const [availableHelpers, setAvailableHelpers] = useState<Array<{ id: string; full_name: string; role?: string }>>([])
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([])
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    service_title: '',
    service_description: '',
    order_type: '',
    unit_count: '',
    unit_category: '',
    priority: 'medium',
    status: '',
    location_address: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    notes: '',
  })

  useEffect(() => {
    fetchOrder()
    loadAssignmentData()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)

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
        console.error('Role error:', roleError)
      }

      const viewerRole = (roleRow as any)?.role ?? null
      
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error

      if (viewerRole === 'sales_partner') {
        const { data: allowedClient } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', profile.active_tenant_id)
          .eq('id', data.client_id)
          .eq('referred_by_id', user.id)
          .maybeSingle()

        if (!allowedClient) {
          toast.error('Anda tidak punya akses untuk mengedit order ini')
          router.replace('/dashboard/orders')
          return
        }
      }

      const { error: unitFieldProbeError } = await supabase
        .from('service_orders')
        .select('id, unit_count, unit_category')
        .eq('tenant_id', data.tenant_id)
        .limit(1)

      setSupportsUnitFields(!unitFieldProbeError)

      setFormData({
        service_title: data.service_title || '',
        service_description: data.service_description || '',
        order_type: data.order_type || '',
        unit_count: data.unit_count ? String(data.unit_count) : '',
        unit_category: data.unit_category || '',
        priority: data.priority || 'medium',
        status: data.status || '',
        location_address: data.location_address || '',
        start_date: data.scheduled_date || '',
        start_time: data.scheduled_time || '',
        end_date: data.estimated_end_date || '',
        end_time: data.estimated_end_time || '',
        notes: data.notes || '',
      })
    } catch (error: any) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order data')
    } finally {
      setLoading(false)
    }
  }

  const loadAssignmentData = async () => {
    try {
      setDataLoading(true)

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
        console.error('Role error:', roleError)
      }

      const viewerRole = (roleRow as any)?.role ?? null

      const { data: orderData, error: orderError } = await supabase
        .from('service_orders')
        .select('tenant_id, client_id')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      if (viewerRole === 'sales_partner') {
        const { data: allowedClient } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', profile.active_tenant_id)
          .eq('id', (orderData as any).client_id)
          .eq('referred_by_id', user.id)
          .maybeSingle()

        if (!allowedClient) {
          toast.error('Anda tidak punya akses untuk mengedit order ini')
          router.replace('/dashboard/orders')
          return
        }
      }

      const { data: techData, error: techError } = await supabase
        .from('technicians')
        .select('id, full_name, user_id, status')
        .eq('tenant_id', orderData.tenant_id)
        .in('status', ['verified', 'active'])
        .order('full_name')

      if (techError) throw techError

      const userIds = (techData || []).map((t: any) => t.user_id).filter(Boolean)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_tenant_roles')
        .select('user_id, role')
        .eq('tenant_id', orderData.tenant_id)
        .in('user_id', userIds)
        .eq('is_active', true)

      if (rolesError) {
        console.error('Error loading roles:', rolesError)
      }

      const roleByUserId = new Map<string, string>()
      for (const row of rolesData || []) {
        roleByUserId.set((row as any).user_id, (row as any).role)
      }

      const team = (techData || []).map((t: any) => ({
        id: t.id,
        full_name: t.full_name,
        role: t.user_id ? roleByUserId.get(t.user_id) : undefined,
      }))

      const helpers = team.filter((t: any) => (t.role || '').toLowerCase() === 'helper' || (t.role || '').toLowerCase() === 'magang')
      const techniciansOnly = team.filter((t: any) => !helpers.some((h: any) => h.id === t.id))

      setAvailableTechnicians(techniciansOnly)
      setAvailableHelpers(helpers)

      const { data: assignments, error: assignError } = await supabase
        .from('work_order_assignments')
        .select('technician_id, role_in_order')
        .eq('service_order_id', orderId)

      if (assignError) throw assignError

      const primaries = (assignments || [])
        .filter((a: any) => (a.role_in_order || 'primary') === 'primary')
        .map((a: any) => a.technician_id)

      const assistants = (assignments || [])
        .filter((a: any) => (a.role_in_order || '') === 'assistant')
        .map((a: any) => a.technician_id)

      // Backward compatibility: if role_in_order is null for all, treat as primary
      const hasAnyRole = (assignments || []).some((a: any) => a.role_in_order)
      setSelectedTechnicianIds(hasAnyRole ? primaries : (assignments || []).map((a: any) => a.technician_id))
      setSelectedHelperIds(hasAnyRole ? assistants : [])
    } catch (err: any) {
      console.error('Error loading assignment data:', err)
      toast.error('Failed to load assignment data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)

      if (selectedTechnicianIds.length < 1) {
        toast.error('Minimal pilih 1 teknisi (helper optional)')
        return
      }

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

      const { error } = await supabase
        .from('service_orders')
        .update({
          service_title: formData.service_title,
          service_description: formData.service_description || null,
          order_type: formData.order_type,
          ...(supportsUnitFields
            ? {
                unit_count: formData.unit_count ? parseInt(formData.unit_count) : null,
                unit_category: formData.unit_category || null,
              }
            : {}),
          priority: formData.priority,
          status: formData.status,
          location_address: formData.location_address,
          scheduled_date: formData.start_date || null,
          scheduled_time: formData.start_time || null,
          estimated_end_date: formData.end_date || null,
          estimated_end_time: formData.end_time || null,
          notes: notesWithUnitFallback,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) throw error

      // Sync assignments: replace existing with current selection
      const { data: auth } = await supabase.auth.getUser()
      const assignedBy = auth?.user?.id || null

      const { error: deleteError } = await supabase
        .from('work_order_assignments')
        .delete()
        .eq('service_order_id', orderId)

      if (deleteError) throw deleteError

      const assignmentsPayload = [
        ...selectedTechnicianIds.map((techId) => ({
          service_order_id: orderId,
          technician_id: techId,
          assigned_by: assignedBy,
          status: 'assigned',
          role_in_order: 'primary',
        })),
        ...selectedHelperIds.map((techId) => ({
          service_order_id: orderId,
          technician_id: techId,
          assigned_by: assignedBy,
          status: 'assigned',
          role_in_order: 'assistant',
        })),
      ]

      const { error: insertError } = await supabase
        .from('work_order_assignments')
        .insert(assignmentsPayload)

      if (insertError) throw insertError

      toast.success('Order updated successfully!')
      router.push(`/dashboard/orders/${orderId}`)
    } catch (error: any) {
      console.error('Error updating order:', error)
      toast.error(error.message || 'Failed to update order')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/orders/${orderId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Order</h1>
            <p className="text-muted-foreground">Update order details</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service_title">Service Title *</Label>
              <Input
                id="service_title"
                value={formData.service_title}
                onChange={(e) => setFormData({ ...formData, service_title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
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
                {!supportsUnitFields && (formData.unit_count || formData.unit_category) && (
                  <p className="text-xs text-muted-foreground">
                    Catatan: kolom database belum aktif; akan disimpan ke Notes.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order_type">Service Type *</Label>
                <Select 
                  value={formData.order_type} 
                  onValueChange={(value) => setFormData({ ...formData, order_type: value })}
                >
                  <SelectTrigger id="order_type">
                    <SelectValue placeholder="Select type" />
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
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="location">Service Location *</Label>
              <Textarea
                id="location"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Project Schedule</CardTitle>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
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
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Minimal 1 teknisi wajib. Helper/magang optional.</p>
            {dataLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading team...
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 p-4 border rounded-lg">
                  <p className="text-sm font-semibold">👷 Technicians</p>
                  {availableTechnicians.map((tech) => (
                    <label key={tech.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTechnicianIds([...selectedTechnicianIds, tech.id])
                          else setSelectedTechnicianIds(selectedTechnicianIds.filter((id) => id !== tech.id))
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium">{tech.full_name}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 p-4 border rounded-lg">
                  <p className="text-sm font-semibold">🧰 Helpers (Optional)</p>
                  {availableHelpers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No helpers available</p>
                  ) : (
                    availableHelpers.map((tech) => (
                      <label key={tech.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedHelperIds.includes(tech.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedHelperIds([...selectedHelperIds, tech.id])
                            else setSelectedHelperIds(selectedHelperIds.filter((id) => id !== tech.id))
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium">{tech.full_name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Selected: {selectedTechnicianIds.length} technician(s), {selectedHelperIds.length} helper(s)</p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Any additional information..."
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/orders/${orderId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
