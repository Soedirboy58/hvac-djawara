// ============================================
// People Management Client Component
// Interactive UI for managing team members
// ============================================

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Building2,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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

export function PeopleManagementClient({ 
  tenantId, 
  initialTeamMembers,
  roleHierarchy 
}: PeopleManagementClientProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [partnerRecords, setPartnerRecords] = useState<PartnerRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isViewingMember, setIsViewingMember] = useState(false)
  const [newMember, setNewMember] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'sales_partner'
  })
  const supabase = createClient()

  // Fetch all partner records (both activated and not)
  const fetchPartnerRecords = async () => {
    const { data } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('role', ['sales_partner', 'marketing', 'business_dev'])
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    
    if (data) {
      setPartnerRecords(data)
    }
  }

  // Load partner records on mount
  React.useEffect(() => {
    fetchPartnerRecords()
    console.log('Fetching partner records...')
  }, [])

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
      // Call API to create user and assign role
      const response = await fetch('/api/people/add-member', {
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

      // Show success message
      toast.success('Partner record created! They can activate anytime via invitation link.')

      // Refresh partner records list
      await fetchPartnerRecords()

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

  // Sales/Marketing roles for the form
  const salesRoles = roleHierarchy.filter(r => 
    ['sales_partner', 'marketing', 'business_dev', 'owner'].includes(r.role_name)
  )

  const copyInvitationLink = async (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hvac-djawara.vercel.app'
    const invitationUrl = `${baseUrl}/invite?token=${token}`
    
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

  return (
    <div className="space-y-6">
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
                const invitationUrl = `${baseUrl}/invite?token=${partner.token}`
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
            <div className="space-y-3">
              {members.map((member) => {
                const profile = typeof member.profiles === 'object' ? member.profiles : {}
                const fullName = profile.full_name || 'Unknown'
                const email = profile.email || ''
                const phone = profile.phone || ''
                
                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      member.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {fullName}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {getRoleDisplayName(member.role)}
                        </Badge>
                        {!member.is_active && (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {email}
                          </span>
                        )}
                        {phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {phone}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member)
                        setIsViewingMember(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant={member.is_active ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleMemberStatus(member.id, member.is_active)}
                    >
                      {member.is_active ? (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                  </div>
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
              <DialogTitle>Add Sales Partner / Marketing</DialogTitle>
              <DialogDescription>
                Tambahkan mitra, sales, atau marketing untuk tracking client acquisition
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
                  Invitation email akan dikirim ke alamat ini
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
                    {salesRoles.map((role) => (
                      <SelectItem key={role.role_name} value={role.role_name}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Role ini akan muncul di dropdown referral saat input client baru
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <strong>Note:</strong> User akan menerima email invitation untuk setup password. 
                Setelah aktivasi, mereka akan muncul di dropdown &quot;Referred By&quot; pada form client.
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

      {/* Member Detail Dialog */}
      <Dialog open={isViewingMember} onOpenChange={setIsViewingMember}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4">
              {/* Avatar & Basic Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-2xl">
                  {(typeof selectedMember.profiles === 'object' ? selectedMember.profiles.full_name : 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {typeof selectedMember.profiles === 'object' ? selectedMember.profiles.full_name : 'Unknown'}
                  </h3>
                  <Badge variant="outline" className="mt-1">
                    {getRoleDisplayName(selectedMember.role)}
                  </Badge>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Email</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{typeof selectedMember.profiles === 'object' ? selectedMember.profiles.email : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Phone</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{typeof selectedMember.profiles === 'object' && selectedMember.profiles.phone ? selectedMember.profiles.phone : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Status</Label>
                  <div>
                    {selectedMember.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-500 text-white">Inactive</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Joined Date</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(selectedMember.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Category: {getRoleCategory(selectedMember.role)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
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
    </div>
  )
}
