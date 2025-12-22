// ============================================
// People Management Client Component
// Interactive UI for managing team members with card-based layout
// ============================================

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Star,
  Award,
  TrendingUp,
  Upload,
  QrCode,
  Link as LinkIcon,
  Copy,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface Profile {
  id: string
  full_name: string
  email?: string
  phone?: string | null
  avatar_url?: string | null
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  is_active: boolean
  created_at: string
  profiles: Profile | any
}

interface RoleHierarchy {
  role_name: string
  category: string
  display_name: string
  sort_order: number
}

interface PeopleManagementClientProps {
  tenantId: string
  initialTeamMembers: TeamMember[]
  roleHierarchy: RoleHierarchy[]
}

interface PartnerRecord {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  token: string
  expires_at: string
  status: string
  created_at: string
  user_id: string | null // null = not activated yet
}

interface TechnicianPerformanceRow {
  id: string
  full_name: string
  email: string
  phone: string | null
  level: string
  status: string
  availability_status: string
  last_login_at: string | null
  jobs_completed: number
  complaints_count: number
  average_rating: number
  attendance_30d_present: number
  attendance_30d_late: number
  overtime_30d_hours: number
}

interface TechnicianRosterRow {
  id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string | null
  role: string
  status: string
  availability_status: string
  is_verified: boolean
  last_login_at: string | null
  created_at: string
}

export function PeopleManagementClient({ 
  tenantId, 
  initialTeamMembers,
  roleHierarchy 
}: PeopleManagementClientProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [partnerRecords, setPartnerRecords] = useState<PartnerRecord[]>([])
  const [activeTab, setActiveTab] = useState<'people' | 'technicians'>('people')
  const [technicianRows, setTechnicianRows] = useState<TechnicianPerformanceRow[]>([])
  const [technicianRoster, setTechnicianRoster] = useState<TechnicianRosterRow[]>([])
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false)
  const [technicianError, setTechnicianError] = useState<string | null>(null)
  const [techPage, setTechPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isViewingMember, setIsViewingMember] = useState(false)
  const [tenantSlug, setTenantSlug] = useState<string>('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [newMember, setNewMember] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'sales_partner'
  })
  const supabase = createClient()

  const isTechnicianRole = (role: string) => ['technician', 'supervisor', 'team_lead'].includes(role)

  const fetchTechnicianPerformance = async () => {
    setIsLoadingTechnicians(true)
    setTechnicianError(null)
    try {
      const response = await fetch('/api/people/technician-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load technician performance')
      }

      const rows = (result.rows || []) as TechnicianPerformanceRow[]
      setTechnicianRows(rows)
      setTechPage(1)
    } catch (error: any) {
      setTechnicianError(error.message || 'Failed to load technician performance')
    } finally {
      setIsLoadingTechnicians(false)
    }
  }

  const fetchTechnicianRoster = async () => {
    try {
      const response = await fetch('/api/people/technicians-roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load technicians roster')
      }

      setTechnicianRoster((result.rows || []) as TechnicianRosterRow[])
    } catch (error: any) {
      console.error('Failed to fetch technicians roster:', error)
    }
  }

  const syncTechnicianJobs = async () => {
    setIsLoadingTechnicians(true)
    setTechnicianError(null)
    try {
      const response = await fetch('/api/people/sync-technician-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync job counts')
      }

      toast.success(`Sync selesai (${result.updated || 0} teknisi di-update)`)
      await fetchTechnicianPerformance()
    } catch (error: any) {
      setTechnicianError(error.message || 'Failed to sync job counts')
      toast.error(error.message || 'Failed to sync job counts')
    } finally {
      setIsLoadingTechnicians(false)
    }
  }

  // Fetch all partner records (both activated and not)
  const fetchPartnerRecords = async () => {
    try {
      console.log('Fetching partner records for tenant:', tenantId)
      
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('role', ['sales_partner', 'marketing', 'business_dev'])
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
      
      console.log('Partner records query result:', { data, error })
      
      if (error) {
        console.error('Error fetching partner records:', error)
        return
      }
      
      if (data) {
        console.log('Setting partner records:', data)
        setPartnerRecords(data)
      }
    } catch (error) {
      console.error('Exception in fetchPartnerRecords:', error)
    }
  }

  const fetchTenantInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .maybeSingle()

      if (!error && data?.slug) {
        setTenantSlug(String(data.slug))
      }
    } catch (error) {
      console.error('Failed to fetch tenant info:', error)
    }
  }

  // Load partner records + tenant info on mount
  useEffect(() => {
    fetchPartnerRecords()
    fetchTechnicianRoster()
    fetchTenantInfo()
    console.log('Fetching partner records...')
  }, [])

  useEffect(() => {
    if (!selectedMember) {
      setAvatarFile(null)
      setAvatarPreview(null)
      return
    }

    const profile = typeof selectedMember.profiles === 'object' ? selectedMember.profiles : {}
    setAvatarFile(null)
    setAvatarPreview(profile.avatar_url || null)
  }, [selectedMember])

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 2 * 1024 * 1024 // 2MB

    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed')
      return
    }

    if (file.size > maxSize) {
      toast.error('File size must be less than 2MB')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAndSaveAvatar = async () => {
    if (!selectedMember) return
    if (!avatarFile) {
      toast.error('Pilih file foto dulu')
      return
    }

    if (!isTechnicianRole(selectedMember.role)) {
      toast.error('Upload foto profil saat ini khusus untuk teknisi')
      return
    }

    setUploadingAvatar(true)
    try {
      const userId = selectedMember.user_id
      if (!userId) {
        toast.error('Akun belum terhubung. Selesaikan verifikasi dulu.')
        return
      }

      const fileExt = avatarFile.name.split('.').pop() || 'jpg'
      const filePath = `${userId}/avatar.${fileExt}`

      const { data, error } = await supabase.storage
        .from('technician-avatars')
        .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('technician-avatars')
        .getPublicUrl(data.path)

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (updateProfileError) throw updateProfileError

      setTeamMembers(members =>
        members.map(m => {
          if (m.user_id !== userId) return m
          const p = typeof m.profiles === 'object' ? m.profiles : {}
          return {
            ...m,
            profiles: {
              ...p,
              avatar_url: publicUrl,
            }
          }
        })
      )

      toast.success('Foto profil berhasil diupdate')
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      toast.error(error?.message || 'Gagal upload foto')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Debug: Log partner records when they change
  React.useEffect(() => {
    console.log('Partner records updated:', partnerRecords)
  }, [partnerRecords])

  // Group roles by category
  const rolesByCategory = roleHierarchy.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = []
    }
    acc[role.category].push(role)
    return acc
  }, {} as Record<string, RoleHierarchy[]>)

  // Get unique categories
  const categories = ['all', ...Object.keys(rolesByCategory)]

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const profile = typeof member.profiles === 'object' ? member.profiles : {}
    const fullName = profile.full_name || ''
    const email = profile.email || ''
    
    const matchesSearch = 
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())

    if (selectedCategory === 'all') return matchesSearch

    const roleInfo = roleHierarchy.find(r => r.role_name === member.role)
    return matchesSearch && roleInfo?.category === selectedCategory
  })

  // Group members by category
  const membersByCategory = filteredMembers.reduce((acc, member) => {
    const roleInfo = roleHierarchy.find(r => r.role_name === member.role)
    const category = roleInfo?.category || 'Other'
    
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(member)
    return acc
  }, {} as Record<string, TeamMember[]>)

  // Get stats
  const stats = {
    total: teamMembers.length,
    active: teamMembers.filter(m => m.is_active).length,
    inactive: teamMembers.filter(m => !m.is_active).length,
    byCategory: Object.entries(
      teamMembers.reduce((acc, member) => {
        const roleInfo = roleHierarchy.find(r => r.role_name === member.role)
        const category = roleInfo?.category || 'Other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    )
  }

  const getRoleDisplayName = (role: string) => {
    const roleInfo = roleHierarchy.find(r => r.role_name === role)
    return roleInfo?.display_name || role
  }

  const getRoleCategory = (role: string) => {
    const roleInfo = roleHierarchy.find(r => r.role_name === role)
    return roleInfo?.category || 'Other'
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Executive': 'bg-purple-100 text-purple-800',
      'Management': 'bg-blue-100 text-blue-800',
      'Administrative': 'bg-green-100 text-green-800',
      'Sales & Marketing': 'bg-orange-100 text-orange-800',
      'Senior Technical': 'bg-indigo-100 text-indigo-800',
      'Technical': 'bg-cyan-100 text-cyan-800',
      'Support': 'bg-gray-100 text-gray-800',
      'External': 'bg-yellow-100 text-yellow-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const toggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_tenant_roles')
        .update({ is_active: !currentStatus })
        .eq('id', memberId)

      if (error) throw error

      setTeamMembers(members =>
        members.map(m =>
          m.id === memberId ? { ...m, is_active: !currentStatus } : m
        )
      )

      toast.success(`Member ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error: any) {
      console.error('Error updating member status:', error)
      toast.error('Failed to update member status')
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const technicianFlow = isTechnicianRole(newMember.role)
      const endpoint = technicianFlow ? '/api/people/add-technician' : '/api/people/add-member'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newMember.fullName,
          email: newMember.email,
          phone: newMember.phone,
          role: newMember.role,
          tenantId: tenantId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add member')
      }

      if (technicianFlow) {
        if (result.tokenSent) {
          toast.success('Technician activation link sent to email (if configured).')
        } else {
          toast.success('Technician activation link generated.')
        }

        if (result.verifyUrl && navigator.clipboard) {
          await navigator.clipboard.writeText(result.verifyUrl)
          toast.success('Activation link copied to clipboard!')
        }

        if (activeTab === 'technicians') {
          await fetchTechnicianPerformance()
        }
      } else {
        toast.success('Partner record created! They can activate anytime via invitation link.')
        await fetchPartnerRecords()
      }

      // Reset form
      setNewMember({
        fullName: '',
        email: '',
        phone: '',
        role: 'sales_partner'
      })
      setIsAddingMember(false)
    } catch (error: any) {
      console.error('Error adding member:', error)
      toast.error(error.message || 'Failed to add team member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addableRoles = roleHierarchy.filter(r =>
    ['sales_partner', 'marketing', 'business_dev', 'technician', 'supervisor', 'team_lead'].includes(r.role_name)
  )

  const copyInvitationLink = async (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hvac-djawara.vercel.app'
    const invitationUrl = `${baseUrl}/invite/${token}`
    
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(invitationUrl)
      toast.success('Invitation link copied to clipboard!')
    }
  }

  const cancelPartner = async (partnerId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', partnerId)

      if (error) throw error

      toast.success('Partner record removed')
      fetchPartnerRecords()
    } catch (error: any) {
      toast.error('Failed to remove partner')
    }
  }

  // Separate active and passive partners
  const activePartners = partnerRecords.filter(p => p.status === 'accepted')
  const passivePartners = partnerRecords.filter(p => p.status === 'pending')

  const teamMemberUserIds = new Set(teamMembers.map(m => m.user_id))
  const technicianCards = technicianRoster.filter(t => !t.user_id || !teamMemberUserIds.has(t.user_id))

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'people' | 'technicians')}>
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="technicians" onClick={() => fetchTechnicianPerformance()}>
            Kinerja Teknisi
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'technicians' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Kinerja Teknisi
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={syncTechnicianJobs} disabled={isLoadingTechnicians}>
                  Sync Jobs
                </Button>
                <Button variant="outline" onClick={fetchTechnicianPerformance} disabled={isLoadingTechnicians}>
                  Refresh
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Ringkasan 30 hari terakhir (attendance & overtime) + total pekerjaan selesai
            </p>
          </CardHeader>
          <CardContent>
            {technicianError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 mb-4">
                {technicianError}
              </div>
            )}

            {isLoadingTechnicians ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              (() => {
                const pageSize = 10
                const totalPages = Math.max(1, Math.ceil(technicianRows.length / pageSize))
                const page = Math.min(Math.max(1, techPage), totalPages)
                const start = (page - 1) * pageSize
                const end = start + pageSize
                const pagedRows = technicianRows.slice(start, end)

                return (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead className="text-right">Jobs</TableHead>
                          <TableHead className="text-right">Komplain</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                          <TableHead className="text-right">Hadir (30d)</TableHead>
                          <TableHead className="text-right">Telat (30d)</TableHead>
                          <TableHead className="text-right">Overtime (h)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.full_name}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.level}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{row.jobs_completed}</TableCell>
                            <TableCell className="text-right">{row.complaints_count}</TableCell>
                            <TableCell className="text-right">
                              {row.average_rating ? Number(row.average_rating).toFixed(2) : '-'}
                            </TableCell>
                            <TableCell className="text-right">{row.attendance_30d_present}</TableCell>
                            <TableCell className="text-right">{row.attendance_30d_late}</TableCell>
                            <TableCell className="text-right">{Number(row.overtime_30d_hours || 0).toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                        {pagedRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-sm text-gray-500 py-8">
                              Belum ada data teknisi
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Page {page} / {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setTechPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                        >
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setTechPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'people' && (
        <>
      {/* Partnership Overview */}
      {partnerRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Partnership Network ({partnerRecords.length})
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {activePartners.length} Active • {passivePartners.length} Passive (Not Activated)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partnerRecords.map((partner) => {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hvac-djawara.vercel.app'
                const invitationUrl = `${baseUrl}/invite/${partner.token}`
                const expiryDate = new Date(partner.expires_at)
                const isExpired = expiryDate < new Date()
                const isActivated = partner.status === 'accepted'
                
                return (
                  <Card 
                    key={partner.id} 
                    className={`border-2 ${
                      isActivated 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-orange-200 bg-orange-50'
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{partner.full_name}</h4>
                            <p className="text-sm text-gray-600">{partner.email}</p>
                            {partner.phone && (
                              <p className="text-xs text-gray-500">{partner.phone}</p>
                            )}
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isActivated ? 'bg-green-100' : 'bg-orange-100'
                            }`}
                          >
                            {getRoleDisplayName(partner.role)}
                          </Badge>
                        </div>

                        {/* QR Code placeholder */}
                        <div className="bg-white rounded-lg p-3 flex items-center justify-center border-2 border-dashed border-gray-300">
                          <div className="text-center">
                            <div className="w-32 h-32 mx-auto bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-500">QR Code</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Scan to register</p>
                          </div>
                        </div>

                        {/* Activation Status */}
                        <div className="flex items-center justify-between">
                          {isActivated ? (
                            <Badge className="text-xs bg-green-500 text-white">
                              ✓ Active Partner
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-orange-500 text-white">
                              ⏳ Passive Partner
                            </Badge>
                          )}
                        </div>

                        {isActivated ? (
                          // Active Partner Info
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                <span className="font-semibold">Has Dashboard Access</span>
                              </div>
                              <p className="text-gray-600">Can manage their clients & view performance</p>
                            </div>
                          </div>
                        ) : (
                          // Passive Partner - Show Invitation
                          <>
                            {/* QR Code placeholder */}
                            <div className="bg-white rounded-lg p-3 flex items-center justify-center border-2 border-dashed border-gray-300">
                              <div className="text-center">
                                <div className="w-32 h-32 mx-auto bg-gray-100 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-500">QR Code</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Scan to activate</p>
                              </div>
                            </div>

                            {/* Status & Date */}
                            <div className="text-xs text-gray-500 space-y-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Expires: {expiryDate.toLocaleDateString()}
                              </div>
                              {isExpired && (
                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                                  Link Expired
                                </Badge>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={() => copyInvitationLink(partner.token)}
                              >
                                Copy Link
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => cancelPartner(partner.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Link preview */}
                            <div className="text-xs text-gray-400 break-all bg-white rounded p-2 border">
                              {invitationUrl}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technician Cards (include not-yet-verified technicians) */}
      {technicianCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teknisi ({technicianCards.length})
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Teknisi baru akan muncul di sini setelah dibuat. Status “Belum verifikasi” berarti teknisi belum aktivasi akun.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {technicianCards.map((t) => {
                const isActive = !!t.is_verified && !!t.user_id

                return (
                  <Card key={t.id} className="cursor-default">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                          {(t.full_name || 'T').charAt(0).toUpperCase()}
                        </div>
                        {isActive ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-500 text-white">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Belum verifikasi
                          </Badge>
                        )}
                      </div>

                      <div className="mb-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{t.full_name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {getRoleDisplayName(t.role)}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        {t.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{t.email}</span>
                          </div>
                        )}
                        {t.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{t.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-4 h-4" />
                          Dibuat {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Team</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byCategory.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>

              <Button onClick={() => setIsAddingMember(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members by Category */}
      {Object.entries(membersByCategory).map(([category, members]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={getCategoryColor(category)}>
                {category}
              </Badge>
              <span className="text-sm font-normal text-gray-500">
                ({members.length} {members.length === 1 ? 'person' : 'people'})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Card Grid Layout - Like Clients */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => {
                const profile = typeof member.profiles === 'object' ? member.profiles : {}
                const fullName = profile.full_name || 'Unknown'
                const email = profile.email || ''
                const phone = profile.phone || ''
                
                return (
                  <Card
                    key={member.id}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
                      !member.is_active ? 'opacity-60' : ''
                    }`}
                    onClick={() => {
                      setSelectedMember(member)
                      setIsViewingMember(true)
                    }}
                  >
                    <CardContent className="p-6">
                      {/* Avatar and Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                        {member.is_active ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>

                      {/* Name and Role */}
                      <div className="mb-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {fullName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getRoleDisplayName(member.role)}
                        </Badge>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        {email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{email}</span>
                          </div>
                        )}
                        {phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-4 h-4" />
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Quick Stats - Placeholder for future */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold">-</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">-</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="font-semibold">-</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMemberStatus(member.id, member.is_active)
                          }}
                          className="h-8"
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No team members found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first team member'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddingMember(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleAddMember}>
            <DialogHeader>
              <DialogTitle>
                {isTechnicianRole(newMember.role) ? 'Add Technician' : 'Add Sales Partner / Marketing'}
              </DialogTitle>
              <DialogDescription>
                {isTechnicianRole(newMember.role)
                  ? 'Tambahkan teknisi, lalu sistem akan membuat link aktivasi (token) untuk login ke dashboard teknisi.'
                  : 'Tambahkan mitra, sales, atau marketing untuk tracking client acquisition'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Enter full name"
                  value={newMember.fullName}
                  onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500">
                  {isTechnicianRole(newMember.role)
                    ? 'Link aktivasi teknisi akan dikirim (jika email service dikonfigurasi)'
                    : 'Invitation email akan dikirim ke alamat ini'}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08123456789"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={newMember.role}
                  onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {addableRoles.map((role) => (
                      <SelectItem key={role.role_name} value={role.role_name}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {isTechnicianRole(newMember.role)
                    ? 'Teknisi akan login melalui halaman /technician/login'
                    : 'Role ini akan muncul di dropdown referral saat input client baru'}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <strong>Note:</strong>{' '}
                {isTechnicianRole(newMember.role)
                  ? 'Sistem akan membuat token aktivasi. Teknisi membuka link aktivasi dan set password.'
                  : 'User akan menerima email invitation untuk setup password. Setelah aktivasi, mereka akan muncul di dropdown "Referred By" pada form client.'}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingMember(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rich Member Profile Modal */}
      <Dialog open={isViewingMember} onOpenChange={setIsViewingMember}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Member Profile</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewingMember(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              {/* Header: Avatar, Name, Status & QR Code */}
              <div className="grid grid-cols-3 gap-6">
                {/* Left: Avatar & Info */}
                <div className="col-span-2 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-200 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Profile photo"
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (typeof selectedMember.profiles === 'object' ? selectedMember.profiles.full_name : 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {typeof selectedMember.profiles === 'object' ? selectedMember.profiles.full_name : 'Unknown'}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-sm">
                          {getRoleDisplayName(selectedMember.role)}
                        </Badge>
                        {selectedMember.is_active ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 text-sm">
                        {typeof selectedMember.profiles === 'object' && selectedMember.profiles.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{selectedMember.profiles.email}</span>
                          </div>
                        )}
                        {typeof selectedMember.profiles === 'object' && selectedMember.profiles.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{selectedMember.profiles.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>Joined {new Date(selectedMember.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        {tenantSlug && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span>Kode Perusahaan: <strong>{tenantSlug}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Avatar Upload (Technicians) */}
                      {isTechnicianRole(selectedMember.role) && (
                        <div className="mt-4 flex items-center gap-2">
                          <input
                            id="member-avatar-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleAvatarSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('member-avatar-upload')?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {avatarPreview ? 'Ganti Foto' : 'Upload Foto'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={uploadAndSaveAvatar}
                            disabled={uploadingAvatar || !avatarFile}
                          >
                            {uploadingAvatar ? 'Uploading...' : 'Simpan Foto'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: QR Code */}
                <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                  <QrCode className="w-16 h-16 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 text-center">QR Code Profile</p>
                  <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-4">
                {/* Rating */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className="w-5 h-5 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                      <p className="text-3xl font-bold text-gray-900">-</p>
                      <p className="text-sm text-gray-500 mt-1">Average Rating</p>
                      <p className="text-xs text-gray-400 mt-1">(Coming Soon)</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Career Level */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Award className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-xl font-bold text-gray-900">-</p>
                      <p className="text-sm text-gray-500 mt-1">Career Level</p>
                      <p className="text-xs text-gray-400 mt-1">(Coming Soon)</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Completed Orders */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-900">-</p>
                      <p className="text-sm text-gray-500 mt-1">Total Orders</p>
                      <p className="text-xs text-gray-400 mt-1">(Coming Soon)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Track Record Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Track Record & Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Track record data will be available soon</p>
                    <p className="text-xs text-gray-400 mt-2">
                      This will show order history, client acquisition, and performance metrics
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Certifications & Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Certifications & Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No certifications added yet</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Certifications and skill badges will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Category & Additional Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Category</span>
                  </div>
                  <p className="text-sm text-gray-700">{getRoleCategory(selectedMember.role)}</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-900">Member ID</span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono">{selectedMember.id.slice(0, 8)}...</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsViewingMember(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}
