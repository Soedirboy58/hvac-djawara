// ============================================
// People Management Client Component
// Interactive UI for managing team members
// ============================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  email: string
  phone: string
  avatar_url: string | null
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  is_active: boolean
  created_at: string
  profiles: Profile
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

export function PeopleManagementClient({ 
  tenantId, 
  initialTeamMembers,
  roleHierarchy 
}: PeopleManagementClientProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const supabase = createClient()

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
    const matchesSearch = 
      member.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profiles.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  return (
    <div className="space-y-6">
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
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    member.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                      {member.profiles.full_name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {member.profiles.full_name}
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
                        {member.profiles.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.profiles.email}
                          </span>
                        )}
                        {member.profiles.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {member.profiles.phone}
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
                    <Button variant="outline" size="sm">
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
              ))}
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
    </div>
  )
}
