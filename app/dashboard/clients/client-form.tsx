// ============================================
// Client Form Component
// Reusable form for creating/editing clients
// ============================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  type: z.enum(['rumah_tangga', 'perkantoran', 'komersial', 'perhotelan', 'sekolah_universitas', 'gedung_pertemuan', 'kantor_pemerintah', 'pabrik_industri']),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  notes: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  tenantId: string
  initialData?: Partial<ClientFormData> & { avatar_url?: string }
  clientId?: string
}

export function ClientForm({ tenantId, initialData, clientId }: ClientFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData || {
      type: 'rumah_tangga'
    },
  })

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validTypes.includes(file.type)) {
      alert('Only JPG, PNG, and WebP images are allowed')
      return
    }

    if (file.size > maxSize) {
      alert('File size must be less than 5MB')
      return
    }

    setAvatarFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function removeAvatar() {
    if (avatarPreview && !avatarFile) {
      // Delete from storage if existing avatar
      const urlParts = avatarPreview.split('/client-avatars/')
      if (urlParts.length > 1) {
        await supabase.storage.from('client-avatars').remove([urlParts[1]])
      }
    }
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  async function uploadAvatar(clientId: string): Promise<string | null> {
    if (!avatarFile) return avatarPreview

    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${clientId}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('client-avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('client-avatars')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true)
    
    try {
      let savedClientId = clientId
      let avatarUrl = avatarPreview

      if (clientId) {
        // Update existing client
        if (avatarFile) {
          avatarUrl = await uploadAvatar(clientId)
        }

        const { error: updateError } = await supabase
          .from('clients')
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            client_type: data.type,
            address: data.address,
            city: data.city,
            notes_internal: data.notes,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)

        if (updateError) throw updateError
      } else {
        // Create new client
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert({
            tenant_id: tenantId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            client_type: data.type,
            address: data.address,
            city: data.city,
            notes_internal: data.notes,
          })
          .select()
          .single()

        if (insertError) throw insertError
        savedClientId = newClient.id

        // Upload avatar after client created
        if (avatarFile && savedClientId) {
          avatarUrl = await uploadAvatar(savedClientId)
          await supabase
            .from('clients')
            .update({ avatar_url: avatarUrl })
            .eq('id', savedClientId)
        }
      }
      
      toast.success('Client saved successfully!', {
        description: `${data.name} has been ${client ? 'updated' : 'added'} to your client list.`,
      })
      router.push('/dashboard/clients')
    } catch (error: any) {
      console.error('Error saving client:', error)
      toast.error('Failed to save client', {
        description: error.message || 'Please check your permissions and try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6 pb-6 border-b">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                    <Image
                      src={avatarPreview}
                      alt="Client avatar"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-4 border-gray-200">
                  <Upload className="w-10 h-10 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block">
                <div className="cursor-pointer">
                  <Button type="button" variant="outline" className="mb-2" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, or WebP • Max 5MB • Recommended 512x512px
              </p>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="text-xs text-red-600 hover:text-red-700 mt-2"
                >
                  Remove avatar
                </button>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Basic Information</h3>
            
            <div>
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter client name"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Client Type *</Label>
              <select
                id="type"
                {...register('type')}
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rumah_tangga">Rumah Tangga</option>
                <option value="perkantoran">Perkantoran</option>
                <option value="komersial">Komersial</option>
                <option value="perhotelan">Perhotelan</option>
                <option value="sekolah_universitas">Sekolah/Universitas</option>
                <option value="gedung_pertemuan">Gedung Pertemuan/Aula</option>
                <option value="kantor_pemerintah">Kantor Pemerintah</option>
                <option value="pabrik_industri">Pabrik/Industri</option>
              </select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Contact Information</h3>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="client@example.com"
                className="mt-1"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+62-xxx-xxxx-xxxx"
                className="mt-1"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Address</h3>
            
            <div>
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="Enter street address"
                className="mt-1"
              />
              {errors.address && (
                <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Enter city"
                className="mt-1"
              />
              {errors.city && (
                <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              {...register('notes')}
              placeholder="Add any additional notes..."
              rows={4}
              className="mt-1 flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button type="submit" disabled={isSubmitting || uploadingAvatar}>
              {uploadingAvatar ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading Avatar...
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                clientId ? 'Update Client' : 'Create Client'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
