// ============================================
// AC Units Inventory Management
// Manage AC units per property with detailed tracking
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Snowflake,
  Loader2,
  AlertCircle,
  Calendar,
  Wrench,
  Barcode,
  Image as ImageIcon,
  RefreshCw,
  Upload,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ACUnit {
  id: string
  unit_code: string
  property_id: string
  property_name?: string
  room_name?: string
  barcode_number?: string
  brand: string
  model: string
  ac_type: string
  capacity_pk: number
  capacity_btu: number
  unit_photo_url?: string
  model_photo_url?: string
  install_date?: string
  warranty_expires_at?: string
  last_service_date?: string
  next_service_due?: string
  condition_status: string
  notes?: string
  contract_id?: string
}

interface Property {
  id: string
  property_name: string
}

interface ACInventoryManagerProps {
  clientId: string
}

export function ACInventoryManager({ clientId }: ACInventoryManagerProps) {
  const [units, setUnits] = useState<ACUnit[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    property_id: '',
    room_name: '',
    barcode_number: '',
    brand: '',
    model: '',
    ac_type: 'split_wall',
    capacity_pk: 1,
    capacity_btu: 9000,
    unit_photo_url: '',
    model_photo_url: '',
    install_date: '',
    warranty_expires_at: '',
    last_service_date: '',
    condition_status: 'good',
    notes: ''
  })

  const [unitPhotoFile, setUnitPhotoFile] = useState<File | null>(null)
  const [modelPhotoFile, setModelPhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [clientId])

  async function uploadPhoto(file: File, folder: 'unit' | 'model'): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('ac-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ac-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      throw err
    }
  }

  async function fetchData() {
    try {
      // Fetch properties
      const { data: propsData } = await supabase
        .from('client_properties')
        .select('id, property_name')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })

      setProperties(propsData || [])

      // Fetch AC units with property names
      const { data: unitsData, error: fetchError } = await supabase
        .from('ac_units')
        .select(`
          *,
          client_properties!inner(property_name)
        `)
        .eq('client_id', clientId)
        .order('unit_code', { ascending: true })

      if (fetchError) throw fetchError

      const formatted = unitsData?.map(u => ({
        ...u,
        property_name: u.client_properties?.property_name
      })) || []

      setUnits(formatted)
    } catch (err) {
      console.error('Error fetching AC units:', err)
      setError('Failed to load AC units')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploading(true)

    try {
      // Upload photos if selected
      let unitPhotoUrl = formData.unit_photo_url
      let modelPhotoUrl = formData.model_photo_url

      if (unitPhotoFile) {
        unitPhotoUrl = await uploadPhoto(unitPhotoFile, 'unit') || ''
      }

      if (modelPhotoFile) {
        modelPhotoUrl = await uploadPhoto(modelPhotoFile, 'model') || ''
      }

      const dataToSave = {
        ...formData,
        client_id: clientId,
        capacity_btu: formData.capacity_pk * 9000, // Auto-calculate BTU
        unit_photo_url: unitPhotoUrl,
        model_photo_url: modelPhotoUrl,
        install_date: formData.install_date || null,
        warranty_expires_at: formData.warranty_expires_at || null,
        last_service_date: formData.last_service_date || null,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('ac_units')
          .update(dataToSave)
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        // Get tenant_id from current user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('active_tenant_id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single()

        const { error: insertError } = await supabase
          .from('ac_units')
          .insert({
            ...dataToSave,
            tenant_id: profile?.active_tenant_id
          })

        if (insertError) throw insertError
      }

      // Success notification
      toast.success(editingId ? 'AC Unit updated successfully!' : 'AC Unit added successfully!', {
        description: `${dataToSave.brand} ${dataToSave.model} has been ${editingId ? 'updated' : 'saved'}.`,
      })

      // Reset form but keep it open for adding more units
      const wasEditing = !!editingId
      setFormData({
        property_id: formData.property_id, // Keep same property selected
        room_name: '',
        barcode_number: '',
        brand: '',
        model: '',
        ac_type: 'split_wall',
        capacity_pk: 1,
        capacity_btu: 9000,
        unit_photo_url: '',
        model_photo_url: '',
        install_date: '',
        warranty_expires_at: '',
        last_service_date: '',
        condition_status: 'good',
        notes: ''
      })
      setUnitPhotoFile(null)
      setModelPhotoFile(null)
      setEditingId(null)
      setError(null)
      
      // Close form only if it was editing, keep open for adding multiple units
      if (wasEditing) {
        setShowForm(false)
      }

      fetchData()
    } catch (err: any) {
      console.error('Error saving AC unit:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save AC unit'
      setError(errorMessage)
      toast.error('Failed to save AC unit', {
        description: errorMessage,
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this AC unit?')) return

    try {
      const { error: deleteError } = await supabase
        .from('ac_units')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchData()
    } catch (err) {
      console.error('Error deleting AC unit:', err)
      const message = err instanceof Error ? err.message : 'Failed to delete AC unit'
      setError(message)
      toast.error('Failed to delete AC unit', { description: message })
    }
  }

  function startEdit(unit: ACUnit) {
    setFormData({
      property_id: unit.property_id,
      room_name: unit.room_name || '',
      barcode_number: unit.barcode_number || '',
      brand: unit.brand,
      model: unit.model,
      ac_type: unit.ac_type,
      capacity_pk: unit.capacity_pk,
      capacity_btu: unit.capacity_btu,
      unit_photo_url: unit.unit_photo_url || '',
      model_photo_url: unit.model_photo_url || '',
      install_date: unit.install_date || '',
      warranty_expires_at: unit.warranty_expires_at || '',
      last_service_date: unit.last_service_date || '',
      condition_status: unit.condition_status,
      notes: unit.notes || ''
    })
    setEditingId(unit.id)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      property_id: '',
      room_name: '',
      barcode_number: '',
      brand: '',
      model: '',
      ac_type: 'split_wall',
      capacity_pk: 1,
      capacity_btu: 9000,
      unit_photo_url: '',
      model_photo_url: '',
      install_date: '',
      warranty_expires_at: '',
      last_service_date: '',
      condition_status: 'good',
      notes: ''
    })
    setUnitPhotoFile(null)
    setModelPhotoFile(null)
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  const conditionColors = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-yellow-100 text-yellow-700',
    poor: 'bg-orange-100 text-orange-700',
    broken: 'bg-red-100 text-red-700'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Add properties first before adding AC units</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AC Units Inventory</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Track all AC units across properties
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add AC Unit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Location *
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Property</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.property_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Name
                    </label>
                    <Input
                      value={formData.room_name}
                      onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                      placeholder="e.g., Meeting Room 1, Lobby, Manager Office"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AC Type *
                    </label>
                    <select
                      value={formData.ac_type}
                      onChange={(e) => setFormData({ ...formData, ac_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="split_wall">Split Wall</option>
                      <option value="split_floor">Split Floor</option>
                      <option value="cassette">Cassette</option>
                      <option value="ducted">Ducted</option>
                      <option value="vrv">VRV/VRF</option>
                      <option value="chiller">Chiller</option>
                      <option value="window">Window</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand *
                    </label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g., Daikin, Panasonic"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model *
                    </label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g., CS-CU12VKP"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode Number
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.barcode_number}
                        onChange={(e) => setFormData({ ...formData, barcode_number: e.target.value })}
                        placeholder="Auto-generated or manual"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!formData.property_id) {
                            alert('Please select a property first')
                            return
                          }
                          const { data: property } = await supabase
                            .from('client_properties')
                            .select('client_id')
                            .eq('id', formData.property_id)
                            .single()
                          
                          if (property) {
                            const { data: barcode } = await supabase
                              .rpc('generate_ac_barcode', {
                                p_client_id: property.client_id,
                                p_property_id: formData.property_id
                              })
                            if (barcode) {
                              setFormData({ ...formData, barcode_number: barcode })
                            }
                          }
                        }}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Format: CLT-PRO-0001</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Capacity (PK) *
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.capacity_pk}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        capacity_pk: parseFloat(e.target.value),
                        capacity_btu: parseFloat(e.target.value) * 9000
                      })}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ {formData.capacity_pk * 9000} BTU/h
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition Status *
                    </label>
                    <select
                      value={formData.condition_status}
                      onChange={(e) => setFormData({ ...formData, condition_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="broken">Broken</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Installation Date
                    </label>
                    <Input
                      type="date"
                      value={formData.install_date}
                      onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warranty Until
                    </label>
                    <Input
                      type="date"
                      value={formData.warranty_expires_at}
                      onChange={(e) => setFormData({ ...formData, warranty_expires_at: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Service Date
                    </label>
                    <Input
                      type="date"
                      value={formData.last_service_date}
                      onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Next service will be auto-scheduled based on maintenance contract</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Unit Photo
                    </label>
                    {!unitPhotoFile && !formData.unit_photo_url ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => setUnitPhotoFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="unit-photo"
                        />
                        <label htmlFor="unit-photo" className="cursor-pointer">
                          <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to upload unit photo</p>
                          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (max 5MB)</p>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="border rounded-md p-2 flex items-center gap-2 bg-gray-50">
                          <ImageIcon className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700 flex-1 truncate">
                            {unitPhotoFile?.name || 'Photo uploaded'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUnitPhotoFile(null)
                              setFormData({ ...formData, unit_photo_url: '' })
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Photo of the actual AC unit installed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Upload className="w-4 h-4 inline mr-1" />
                      Model Photo
                    </label>
                    {!modelPhotoFile && !formData.model_photo_url ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => setModelPhotoFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="model-photo"
                        />
                        <label htmlFor="model-photo" className="cursor-pointer">
                          <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to upload model photo</p>
                          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (max 5MB)</p>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="border rounded-md p-2 flex items-center gap-2 bg-gray-50">
                          <ImageIcon className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700 flex-1 truncate">
                            {modelPhotoFile?.name || 'Photo uploaded'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setModelPhotoFile(null)
                              setFormData({ ...formData, model_photo_url: '' })
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Photo of model nameplate/specifications</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Additional notes about this unit..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      editingId ? 'Update AC Unit' : 'Add AC Unit'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={uploading}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* AC Units List */}
        {units.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Snowflake className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No AC units added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {units.map((unit) => (
              <Card key={unit.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Photos */}
                    {(unit.unit_photo_url || unit.model_photo_url) && (
                      <div className="flex gap-2">
                        {unit.unit_photo_url && (
                          <img
                            src={unit.unit_photo_url}
                            alt="Unit"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        )}
                        {unit.model_photo_url && (
                          <img
                            src={unit.model_photo_url}
                            alt="Model"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        )}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Snowflake className="w-4 h-4 text-blue-500" />
                        <h4 className="font-semibold text-gray-900">
                          {unit.unit_code}
                        </h4>
                        {unit.barcode_number && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                            <Barcode className="w-3 h-3" />
                            {unit.barcode_number}
                          </div>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded ${conditionColors[unit.condition_status as keyof typeof conditionColors]}`}>
                          {unit.condition_status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Property</p>
                          <p className="font-medium">{unit.property_name}</p>
                          {unit.room_name && (
                            <p className="text-xs text-gray-400">{unit.room_name}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500">Brand & Model</p>
                          <p className="font-medium">{unit.brand} {unit.model}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium">{unit.ac_type.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Capacity</p>
                          <p className="font-medium">{unit.capacity_pk} PK ({unit.capacity_btu} BTU)</p>
                        </div>
                      </div>

                      {(unit.last_service_date || unit.next_service_due) && (
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          {unit.last_service_date && (
                            <div className="flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              Last: {new Date(unit.last_service_date).toLocaleDateString()}
                            </div>
                          )}
                          {unit.next_service_due && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Next: {new Date(unit.next_service_due).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}

                      {unit.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">{unit.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(unit)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(unit.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {units.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total AC Units</span>
              <span className="font-semibold text-gray-900">{units.length} units</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
