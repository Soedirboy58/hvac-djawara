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

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${String(hours).padStart(2, '0')}:${minutes}`
})

type EditSection = 'service-details' | 'location' | 'schedule' | 'assignment' | 'notes' | 'status' | null

const SECTION_IDS = new Set<Exclude<EditSection, null>>([
  'service-details',
  'location',
  'schedule',
  'assignment',
  'notes',
  'status',
])

const normalizeDateInput = (value: any): string => {
  if (!value) return ''
  const str = String(value)
  // Support ISO datetime (YYYY-MM-DDTHH:mm:ss...) and date-only.
  return str.length >= 10 ? str.slice(0, 10) : str
}

const normalizeTimeInput = (value: any): string => {
  if (!value) return ''
  const str = String(value)
  // Support HH:MM:SS and HH:MM.
  return str.length >= 5 ? str.slice(0, 5) : str
}

const extractUnitInfoFromNotes = (notes: string): { unit_count: string; unit_category: string } => {
  const unitCountMatch = notes.match(/Jumlah\s*Unit\s*:\s*(\d+)/i)
  const unitCategoryMatch = notes.match(/Kategori\s*Unit\s*:\s*([^\n•]+)/i)
  return {
    unit_count: unitCountMatch?.[1] ? String(parseInt(unitCountMatch[1], 10)) : '',
    unit_category: unitCategoryMatch?.[1] ? unitCategoryMatch[1].trim() : '',
  }
}

const stripUnitInfoFromNotes = (notes: string): string => {
  return (notes || '')
    .replace(/\s*•\s*Kategori\s*Unit\s*:\s*[^\n•]+/gi, '')
    .replace(/Kategori\s*Unit\s*:\s*[^\n]+\n?/gi, '')
    .replace(/Jumlah\s*Unit\s*:\s*\d+\n?/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [supportsUnitFields, setSupportsUnitFields] = useState(false)
  const [supportsServiceCategoryFields, setSupportsServiceCategoryFields] = useState(false)
  const [activeSection, setActiveSection] = useState<EditSection>(null)
  const [availableTechnicians, setAvailableTechnicians] = useState<Array<{ id: string; full_name: string; role?: string }>>([])
  const [availableHelpers, setAvailableHelpers] = useState<Array<{ id: string; full_name: string; role?: string }>>([])
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([])
  const [selectedHelperIds, setSelectedHelperIds] = useState<string[]>([])
  const [formData, setFormData] = useState({
    service_title: '',
    service_description: '',
    order_type: '',
    service_category_planned: '',
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

  useEffect(() => {
    if (loading) return

    const syncFromHash = () => {
      const hash = window.location.hash
      const id = (hash || '').replace('#', '')

      if (!id) {
        setActiveSection(null)
        return
      }

      const section = SECTION_IDS.has(id as any) ? (id as Exclude<EditSection, null>) : null
      setActiveSection(section)
      if (!section) return
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // Try immediately and again shortly after to handle slower renders.
    syncFromHash()
    const t = window.setTimeout(syncFromHash, 100)
    window.addEventListener('hashchange', syncFromHash)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('hashchange', syncFromHash)
    }
  }, [loading])

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
      setViewerRole(viewerRole)

      if (viewerRole === 'sales_partner') {
        toast.message('Akses mitra sales: hanya lihat detail order')
        router.replace(`/dashboard/orders/${orderId}`)
        return
      }
      
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

      const unitFieldsEnabled = !unitFieldProbeError
      setSupportsUnitFields(unitFieldsEnabled)

      const { error: categoryProbeError } = await supabase
        .from('service_orders')
        .select('id, service_category_planned')
        .eq('tenant_id', data.tenant_id)
        .limit(1)

      setSupportsServiceCategoryFields(!categoryProbeError)

      const rawNotes = (data.notes as string) || ''
      const extractedUnitInfo = !unitFieldsEnabled ? extractUnitInfoFromNotes(rawNotes) : { unit_count: '', unit_category: '' }
      const cleanedNotes = !unitFieldsEnabled ? stripUnitInfoFromNotes(rawNotes) : rawNotes

      setFormData({
        service_title: data.service_title || '',
        service_description: data.service_description || '',
        order_type: data.order_type || '',
        service_category_planned: data.service_category_planned || '',
        unit_count: unitFieldsEnabled ? (data.unit_count ? String(data.unit_count) : '') : extractedUnitInfo.unit_count,
        unit_category: unitFieldsEnabled ? (data.unit_category || '') : extractedUnitInfo.unit_category,
        priority: data.priority || 'medium',
        status: data.status || '',
        location_address: data.location_address || '',
        start_date: normalizeDateInput(data.scheduled_date),
        start_time: normalizeTimeInput(data.scheduled_time),
        end_date: normalizeDateInput(data.estimated_end_date),
        end_time: normalizeTimeInput(data.estimated_end_time),
        notes: cleanedNotes || '',
      })
    } catch (error: any) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order data')
    } finally {
      setLoading(false)
    }
  }

  const buildNotesWithUnitFallback = () => {
    const base = stripUnitInfoFromNotes(formData.notes?.trim() || '')
    if (supportsUnitFields) return base || null

    const unitCountText = formData.unit_count ? `Jumlah Unit: ${formData.unit_count}` : ''
    const unitCategoryText = formData.unit_category ? `Kategori Unit: ${formData.unit_category}` : ''
    const unitInfo = [unitCountText, unitCategoryText].filter(Boolean).join(' • ')

    if (!unitInfo) return base || null
    if (!base) return unitInfo
    return `${base}\n\n${unitInfo}`
  }

  const buildUpdatePayloadForSection = (section: EditSection, isSalesPartner: boolean) => {
    const updated_at = new Date().toISOString()

    if (!section) {
      const notesWithUnitFallback = buildNotesWithUnitFallback()
      const updatePayload: any = {
        service_title: formData.service_title,
        service_description: formData.service_description || null,
        order_type: formData.order_type,
        ...(supportsServiceCategoryFields
          ? { service_category_planned: formData.service_category_planned || null }
          : {}),
        ...(supportsUnitFields
          ? {
              unit_count: formData.unit_count ? parseInt(formData.unit_count) : null,
              unit_category: formData.unit_category || null,
            }
          : {}),
        priority: formData.priority,
        location_address: formData.location_address,
        notes: notesWithUnitFallback,
        updated_at,
      }

      if (!isSalesPartner) {
        updatePayload.status = formData.status
        updatePayload.scheduled_date = formData.start_date || null
        updatePayload.scheduled_time = formData.start_time || null
        updatePayload.estimated_end_date = formData.end_date || null
        updatePayload.estimated_end_time = formData.end_time || null
      }

      return updatePayload
    }

    if (section === 'service-details') {
      const updatePayload: any = {
        service_title: formData.service_title,
        service_description: formData.service_description || null,
        order_type: formData.order_type,
        ...(supportsServiceCategoryFields
          ? { service_category_planned: formData.service_category_planned || null }
          : {}),
        ...(supportsUnitFields
          ? {
              unit_count: formData.unit_count ? parseInt(formData.unit_count) : null,
              unit_category: formData.unit_category || null,
            }
          : { notes: buildNotesWithUnitFallback() }),
        priority: formData.priority,
        updated_at,
      }
      return updatePayload
    }

    if (section === 'status') {
      if (isSalesPartner) return null
      return { status: formData.status, updated_at }
    }

    if (section === 'location') {
      return { location_address: formData.location_address, updated_at }
    }

    if (section === 'schedule') {
      if (isSalesPartner) return null
      return {
        scheduled_date: formData.start_date || null,
        scheduled_time: formData.start_time || null,
        estimated_end_date: formData.end_date || null,
        estimated_end_time: formData.end_time || null,
        updated_at,
      }
    }

    if (section === 'notes') {
      return { notes: buildNotesWithUnitFallback(), updated_at }
    }

    // assignment is handled separately
    return null
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
      setViewerRole(viewerRole)

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

        // Sales partner cannot change assignment; no need to load full roster
        setAvailableTechnicians([])
        setAvailableHelpers([])
        setSelectedTechnicianIds([])
        setSelectedHelperIds([])
        return
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

      // Assignment is per-order PIC vs assistant; allow any technician record to be PIC/assistant.
      // Keep both arrays populated for backward-compatible UI layout.
      setAvailableTechnicians(team)
      setAvailableHelpers(team)

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

      // Backward compatibility: if role_in_order is null for all, treat first as PIC and the rest as assistants.
      const hasAnyRole = (assignments || []).some((a: any) => a.role_in_order)
      const allAssigned = (assignments || []).map((a: any) => a.technician_id).filter(Boolean)

      const picId = (hasAnyRole ? primaries[0] : allAssigned[0]) || null
      const assistantIds = Array.from(
        new Set(
          [
            ...(hasAnyRole ? assistants : allAssigned.slice(1)),
            // If old data has multiple primaries, demote extras to assistants in UI
            ...(hasAnyRole ? primaries.slice(1) : []),
          ].filter((id) => id && id !== picId)
        )
      )

      setSelectedTechnicianIds(picId ? [picId] : [])
      setSelectedHelperIds(assistantIds)
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

      const isSalesPartner = viewerRole === 'sales_partner'

      // In per-section edit mode, only validate/apply the chosen section.
      if (activeSection === 'assignment') {
        if (selectedTechnicianIds.length < 1) {
          toast.error('Minimal pilih 1 teknisi (helper optional)')
          return
        }

        const { data: auth } = await supabase.auth.getUser()
        const assignedBy = auth?.user?.id || null

        const { error: deleteError } = await supabase
          .from('work_order_assignments')
          .delete()
          .eq('service_order_id', orderId)

        if (deleteError) throw deleteError

        const picId = selectedTechnicianIds[0] ?? null
        const assistantIds = Array.from(new Set(selectedHelperIds)).filter(
          (id) => Boolean(id) && id !== picId
        )

        const assignmentsPayload: any[] = []
        if (picId) {
          assignmentsPayload.push({
            service_order_id: orderId,
            technician_id: picId,
            assigned_by: assignedBy,
            status: 'assigned',
            role_in_order: 'primary',
          })
        }

        for (const techId of assistantIds) {
          assignmentsPayload.push({
            service_order_id: orderId,
            technician_id: techId,
            assigned_by: assignedBy,
            status: 'assigned',
            role_in_order: 'assistant',
          })
        }

        const { error: insertError } = await supabase
          .from('work_order_assignments')
          .insert(assignmentsPayload)

        if (insertError) throw insertError

        // Touch the order so it shows as updated.
        const { error: touchError } = await supabase
          .from('service_orders')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', orderId)

        if (touchError) {
          // best-effort
          console.warn('Unable to touch service_orders.updated_at:', touchError)
        }

        toast.success('Assignment updated successfully!')
        router.push(`/dashboard/orders/${orderId}`)
        return
      }

      const updatePayload = buildUpdatePayloadForSection(activeSection, isSalesPartner)
      if (activeSection && updatePayload === null) {
        toast.error('Anda tidak punya akses untuk mengedit bagian ini')
        return
      }

      // In full edit mode, assignment is also synced.
      if (!activeSection && !isSalesPartner && selectedTechnicianIds.length < 1) {
        toast.error('Minimal pilih 1 teknisi (helper optional)')
        return
      }

      const { error } = await supabase
        .from('service_orders')
        .update(updatePayload)
        .eq('id', orderId)

      if (error) throw error

      if (!activeSection && !isSalesPartner) {
        // Sync assignments: replace existing with current selection
        const { data: auth } = await supabase.auth.getUser()
        const assignedBy = auth?.user?.id || null

        const { error: deleteError } = await supabase
          .from('work_order_assignments')
          .delete()
          .eq('service_order_id', orderId)

        if (deleteError) throw deleteError

        const picId = selectedTechnicianIds[0] ?? null
        const assistantIds = Array.from(new Set(selectedHelperIds)).filter(
          (id) => Boolean(id) && id !== picId
        )

        const assignmentsPayload: any[] = []
        if (picId) {
          assignmentsPayload.push({
            service_order_id: orderId,
            technician_id: picId,
            assigned_by: assignedBy,
            status: 'assigned',
            role_in_order: 'primary',
          })
        }

        for (const techId of assistantIds) {
          assignmentsPayload.push({
            service_order_id: orderId,
            technician_id: techId,
            assigned_by: assignedBy,
            status: 'assigned',
            role_in_order: 'assistant',
          })
        }

        const { error: insertError } = await supabase
          .from('work_order_assignments')
          .insert(assignmentsPayload)

        if (insertError) throw insertError
      }

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
        {(!activeSection || activeSection === 'service-details') && (
        <div id="service-details" className="scroll-mt-24">
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
                  onValueChange={(value) => setFormData({
                    ...formData,
                    order_type: value,
                    service_category_planned: value === 'survey' ? '' : formData.service_category_planned,
                  })}
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
                <Label htmlFor="service_category_planned">
                  {formData.order_type === 'survey' ? 'Kategori Tindak Lanjut (A-D)' : 'Kategori Service (A-D)'}
                </Label>
                <Select
                  value={formData.service_category_planned || undefined}
                  onValueChange={(value) => setFormData({ ...formData, service_category_planned: value })}
                  disabled={!supportsServiceCategoryFields}
                >
                  <SelectTrigger id="service_category_planned">
                    <SelectValue
                      placeholder={
                        supportsServiceCategoryFields
                          ? 'Pilih kategori (opsional)'
                          : 'Belum tersedia (DB belum update)'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Maintenance / Pemeliharaan</SelectItem>
                    <SelectItem value="B">B - Minor Repair (Electrical/Support)</SelectItem>
                    <SelectItem value="C">C - Major Repair (Part Utama Unit)</SelectItem>
                    <SelectItem value="D">D - Sistem Refrigerasi (Vacuum/Refrigerant/Leak)</SelectItem>
                  </SelectContent>
                </Select>

                {formData.order_type === 'survey' ? (
                  <p className="text-xs text-muted-foreground">
                    Gunakan kategori ini untuk perbaikan/tindak lanjut setelah checking & penawaran disetujui.
                  </p>
                ) : null}

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
            </CardContent>
          </Card>
        </div>
        )}

        {/* Status (separate section so hash edit can be specific) */}
        {(!activeSection || activeSection === 'status') && (
        <div id="status" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="status_select">Status</Label>
              <Select 
                disabled={viewerRole === 'sales_partner'}
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status_select">
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
            </CardContent>
          </Card>
        </div>
        )}

        {/* Location */}
        {(!activeSection || activeSection === 'location') && (
        <div id="location" className="scroll-mt-24">
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
        </div>
        )}

        {/* Schedule */}
        {(!activeSection || activeSection === 'schedule') && (
        <div id="schedule" className="scroll-mt-24">
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
                  disabled={viewerRole === 'sales_partner'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Select
                  disabled={viewerRole === 'sales_partner'}
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
                  disabled={viewerRole === 'sales_partner'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Select
                  disabled={viewerRole === 'sales_partner'}
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
        </div>
        )}

        {/* Assignment */}
        {viewerRole !== 'sales_partner' && (!activeSection || activeSection === 'assignment') && (
          <div id="assignment" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">PIC (1 orang) wajib. Helper/Assistant optional.</p>
              {dataLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading team...
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
                  <div className="space-y-2 p-4 border rounded-lg">
                    <p className="text-sm font-semibold">🧑‍🔧 PIC (Wajib 1)</p>
                    {teamCandidates.map((tech) => (
                      <label key={tech.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="radio"
                          name="order_pic"
                          checked={(selectedTechnicianIds[0] || '') === tech.id}
                          onChange={(e) => {
                            if (!e.target.checked) return
                            setSelectedTechnicianIds([tech.id])
                            setSelectedHelperIds((prev) => prev.filter((id) => id !== tech.id))
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium">{tech.full_name}</span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2 p-4 border rounded-lg">
                    <p className="text-sm font-semibold">🧰 Helper / Assistant (Optional)</p>
                    {assistantCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Pilih PIC terlebih dahulu</p>
                    ) : (
                      assistantCandidates.map((tech) => (
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
                  )
                })()
              )}
              <p className="text-xs text-muted-foreground">Selected: {selectedTechnicianIds.length ? 1 : 0} PIC, {selectedHelperIds.length} assistant(s)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notes */}
        {(!activeSection || activeSection === 'notes') && (
        <div id="notes" className="scroll-mt-24">
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
        </div>
        )}

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
