// ============================================
// Client Properties Management
// Manage multiple locations per client
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  Building,
  Home,
  Loader2,
  AlertCircle,
  Star,
  Calendar,
  CalendarPlus,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getActiveTenantId } from '@/lib/supabase/active-tenant'
import Image from 'next/image'

interface Property {
  id: string
  property_name: string
  property_type: string
  property_category: string
  address: string
  city: string
  postal_code: string
  coordinates?: string
  is_primary: boolean
  ac_unit_count?: number
  photos?: string[]
  schedule?: {
    frequency: string
    next_scheduled_date: string | null
  } | null
}

interface PropertyManagementProps {
  clientId: string
}

export function PropertyManagement({ clientId }: PropertyManagementProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [schedulePropertyId, setSchedulePropertyId] = useState<string | null>(null)
  const [scheduleData, setScheduleData] = useState({
    frequency: 'monthly',
    start_date: '',
    notes: ''
  })
  const [savingSchedule, setSavingSchedule] = useState(false)
  const supabase = createClient()

  function getPropertyTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      rumah_tangga: 'Rumah Tangga',
      perkantoran: 'Perkantoran',
      komersial: 'Komersial',
      perhotelan: 'Perhotelan',
      sekolah_universitas: 'Sekolah/Universitas',
      gedung_pertemuan: 'Gedung Pertemuan/Aula',
      kantor_pemerintah: 'Kantor Pemerintah',
      pabrik_industri: 'Pabrik/Industri'
    }
    return labels[type] || type
  }

  const [formData, setFormData] = useState({
    property_name: '',
    property_type: 'rumah_tangga',
    property_category: 'rumah_tangga',
    address: '',
    city: '',
    postal_code: '',
    coordinates: '',
    is_primary: false,
    photos: [] as string[] // Array of Supabase Storage URLs
  })
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreview, setPhotoPreview] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  useEffect(() => {
    fetchProperties()
  }, [clientId])

  async function fetchProperties() {
    try {
      // Fetch properties with AC unit count and maintenance schedules
      const { data, error: fetchError } = await supabase
        .from('client_properties')
        .select(`
          *,
          ac_units(count)
        `)
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Fetch maintenance schedules for these properties
      const propertyIds = data?.map(p => p.id) || []
      const { data: schedules } = await supabase
        .from('property_maintenance_schedules')
        .select('property_id, frequency, next_scheduled_date')
        .in('property_id', propertyIds)
        .eq('is_active', true)

      const scheduleMap = new Map(
        schedules?.map(s => [s.property_id, s]) || []
      )

      const formatted = data?.map(p => ({
        ...p,
        ac_unit_count: p.ac_units?.[0]?.count || 0,
        schedule: scheduleMap.get(p.id) || null
      })) || []

      setProperties(formatted)
    } catch (err) {
      console.error('Error fetching properties:', err)
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      // Upload photos first if any
      let photoUrls = [...formData.photos] // Keep existing photos
      if (photoFiles.length > 0) {
        setUploadingPhotos(true)
        const newUrls = await uploadPhotos()
        photoUrls = [...photoUrls, ...newUrls]
      }

      const dataToSave = {
        ...formData,
        photos: photoUrls
      }

      if (editingId) {
        // Update existing property
        const { error: updateError } = await supabase
          .from('client_properties')
          .update(dataToSave)
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        // Add new property - get tenant_id from current user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('active_tenant_id')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single()

        const { error: insertError } = await supabase
          .from('client_properties')
          .insert({
            client_id: clientId,
            tenant_id: profile?.active_tenant_id,
            ...dataToSave
          })

        if (insertError) throw insertError
      }

      resetForm()
      fetchProperties()
    } catch (err) {
      console.error('Error saving property:', err)
      setError(err instanceof Error ? err.message : 'Failed to save property')
    } finally {
      setUploadingPhotos(false)
    }
  }

  async function uploadPhotos(): Promise<string[]> {
    const uploadedUrls: string[] = []

    for (const file of photoFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('property-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Error uploading photo:', error)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-photos')
        .getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const maxSize = 5 * 1024 * 1024 // 5MB
      
      if (!validTypes.includes(file.type)) {
        setError('Only JPG, PNG, and WebP images are allowed')
        return false
      }
      
      if (file.size > maxSize) {
        setError('File size must be less than 5MB')
        return false
      }
      
      return true
    })

    if (validFiles.length === 0) return

    setPhotoFiles(prev => [...prev, ...validFiles])

    // Generate preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  function removePhotoPreview(index: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    setPhotoPreview(prev => prev.filter((_, i) => i !== index))
  }

  async function removeExistingPhoto(url: string) {
    if (!confirm('Delete this photo?')) return

    try {
      // Extract path from URL
      const urlParts = url.split('/property-photos/')
      if (urlParts.length > 1) {
        const path = urlParts[1]
        await supabase.storage.from('property-photos').remove([path])
      }

      // Update formData
      setFormData(prev => ({
        ...prev,
        photos: prev.photos.filter(p => p !== url)
      }))
    } catch (err) {
      console.error('Error deleting photo:', err)
      setError('Failed to delete photo')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this property? All AC units will also be removed.')) return

    try {
      const { error: deleteError } = await supabase
        .from('client_properties')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchProperties()
    } catch (err) {
      console.error('Error deleting property:', err)
      setError('Failed to delete property')
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      // Remove primary from all properties
      await supabase
        .from('client_properties')
        .update({ is_primary: false })
        .eq('client_id', clientId)

      // Set new primary
      const { error: updateError } = await supabase
        .from('client_properties')
        .update({ is_primary: true })
        .eq('id', id)

      if (updateError) throw updateError
      fetchProperties()
    } catch (err) {
      console.error('Error setting primary:', err)
      setError('Failed to set primary property')
    }
  }

  function startEdit(property: Property) {
    setFormData({
      property_name: property.property_name,
      property_type: property.property_type,
      property_category: property.property_category || 'rumah_tangga',
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      coordinates: property.coordinates || '',
      is_primary: property.is_primary,
      photos: (property as any).photos || [] // Load existing photos
    })
    setPhotoFiles([])
    setPhotoPreview([])
    setEditingId(property.id)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      property_name: '',
      property_type: 'rumah_tangga',
      property_category: 'rumah_tangga',
      address: '',
      city: '',
      postal_code: '',
      coordinates: '',
      is_primary: false,
      photos: []
    })
    setPhotoFiles([])
    setPhotoPreview([])
    setEditingId(null)
    setShowForm(false)
  }

  async function handleScheduleSave() {
    if (!schedulePropertyId) return

    setSavingSchedule(true)
    setError(null)

    try {
      const tenantId = await getActiveTenantId(supabase)
      if (!tenantId) throw new Error('No active tenant found')

      const { error: saveError } = await supabase
        .from('property_maintenance_schedules')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          property_id: schedulePropertyId,
          frequency: scheduleData.frequency,
          start_date: scheduleData.start_date,
          maintenance_type: 'cleaning_inspection',
          notes: scheduleData.notes,
          apply_to_all_units: true,
          is_active: true
        })

      if (saveError) throw saveError

      alert('Schedule created successfully!')
      setShowScheduleModal(false)
      setSchedulePropertyId(null)
      setScheduleData({ frequency: 'monthly', start_date: '', notes: '' })
      fetchProperties() // Reload to show new schedule
    } catch (err) {
      console.error('Error saving schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setSavingSchedule(false)
    }
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Property Management</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Manage client locations and properties
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
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
                      Property Name *
                    </label>
                    <Input
                      value={formData.property_name}
                      onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                      placeholder="e.g., Main Office, Home Address"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Category *
                    </label>
                    <select
                      value={formData.property_category}
                      onChange={(e) => {
                        const category = e.target.value
                        setFormData({ 
                          ...formData, 
                          property_category: category,
                          // Auto-set first property type based on category
                          property_type: category === 'rumah_tangga' ? 'rumah_tangga' : 
                                       category === 'layanan_publik' ? 'perkantoran' : 'pabrik_industri'
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="rumah_tangga">Rumah Tangga (Residential)</option>
                      <option value="layanan_publik">Layanan Publik (Public Services)</option>
                      <option value="industri">Industri (Industrial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Property Type *
                    </label>
                    <select
                      value={formData.property_type}
                      onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      {formData.property_category === 'rumah_tangga' && (
                        <option value="rumah_tangga">Rumah Tangga</option>
                      )}
                      {formData.property_category === 'layanan_publik' && (
                        <>
                          <option value="perkantoran">Perkantoran</option>
                          <option value="komersial">Komersial</option>
                          <option value="perhotelan">Perhotelan</option>
                          <option value="sekolah_universitas">Sekolah/Universitas</option>
                          <option value="gedung_pertemuan">Gedung Pertemuan/Aula</option>
                          <option value="kantor_pemerintah">Kantor Pemerintah</option>
                        </>
                      )}
                      {formData.property_category === 'industri' && (
                        <option value="pabrik_industri">Pabrik/Industri</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinates (Optional)
                  </label>
                  <Input
                    value={formData.coordinates}
                    onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                    placeholder="-6.200000, 106.816666"
                  />
                </div>

                {/* Photo Upload Section */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Location Photos
                  </label>
                  
                  {/* Existing Photos */}
                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {formData.photos.map((url, index) => (
                        <div key={url} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                            <Image
                              src={url}
                              alt={`Property photo ${index + 1}`}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(url)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Photo Previews */}
                  {photoPreview.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {photoPreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-blue-300 bg-blue-50">
                            <Image
                              src={preview}
                              alt={`New photo ${index + 1}`}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhotoPreview(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                            New
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {photoPreview.length > 0 ? 'Add More Photos' : 'Upload Photos'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, or WebP • Max 5MB per file • Multiple files allowed
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">
                    Set as primary property
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="flex-1" disabled={uploadingPhotos}>
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading Photos...
                      </>
                    ) : (
                      editingId ? 'Update Property' : 'Add Property'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} disabled={uploadingPhotos}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Property List */}
        {properties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No properties added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((property) => (
              <Card key={property.id} className={property.is_primary ? 'border-blue-300 bg-blue-50' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {property.property_type === 'rumah_tangga' ? (
                          <Home className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Building className="w-4 h-4 text-gray-400" />
                        )}
                        <h4 className="font-semibold text-gray-900">
                          {property.property_name}
                        </h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {getPropertyTypeLabel(property.property_type)}
                        </span>
                        {property.is_primary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            <Star className="w-3 h-3" />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{property.address}</p>
                      <p className="text-sm text-gray-500">{property.city} {property.postal_code}</p>
                      
                      {/* Photo Gallery */}
                      {(property as any).photos?.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                          {(property as any).photos.slice(0, 4).map((url: string, idx: number) => (
                            <div key={idx} className="relative flex-shrink-0">
                              <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                <Image
                                  src={url}
                                  alt={`${property.property_name} photo ${idx + 1}`}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {idx === 3 && (property as any).photos.length > 4 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                  <span className="text-white text-xs font-semibold">
                                    +{(property as any).photos.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-gray-400">
                          {property.ac_unit_count} AC Unit(s)
                        </p>
                        {property.schedule ? (
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            <Calendar className="w-3 h-3 mr-1" />
                            {property.schedule.frequency === 'monthly' ? 'Monthly' :
                             property.schedule.frequency === 'quarterly' ? 'Quarterly' :
                             property.schedule.frequency === 'semi_annual' ? 'Semi-Annual' :
                             property.schedule.frequency === 'annual' ? 'Annual' :
                             'Custom'}
                            {property.schedule.next_scheduled_date && (
                              <span className="ml-1">
                                • Next: {new Date(property.schedule.next_scheduled_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 text-gray-500">
                            No schedule
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!property.schedule && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSchedulePropertyId(property.id)
                            setShowScheduleModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 border-blue-300"
                          title="Setup maintenance schedule"
                        >
                          <CalendarPlus className="w-4 h-4 mr-1" />
                          Setup Schedule
                        </Button>
                      )}
                      {!property.is_primary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSetPrimary(property.id)}
                          title="Set as primary"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(property)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(property.id)}
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

        {/* Schedule Setup Modal */}
        {showScheduleModal && schedulePropertyId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md m-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Setup Maintenance Schedule
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Configure recurring maintenance for{' '}
                  {properties.find(p => p.id === schedulePropertyId)?.property_name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={scheduleData.frequency}
                    onChange={(e) => setScheduleData({ ...scheduleData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="monthly">Monthly (Every month)</option>
                    <option value="quarterly">Quarterly (Every 3 months)</option>
                    <option value="semi_annual">Semi-Annual (Every 6 months)</option>
                    <option value="annual">Annual (Every year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Maintenance Date *
                  </label>
                  <Input
                    type="date"
                    value={scheduleData.start_date}
                    onChange={(e) => setScheduleData({ ...scheduleData, start_date: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    System will auto-schedule next visits based on frequency
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={scheduleData.notes}
                    onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Special instructions..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleScheduleSave}
                    disabled={savingSchedule || !scheduleData.start_date}
                    className="flex-1"
                  >
                    {savingSchedule ? 'Saving...' : 'Save Schedule'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowScheduleModal(false)
                      setSchedulePropertyId(null)
                      setScheduleData({ frequency: 'monthly', start_date: '', notes: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
