// ============================================
// Maintenance Contracts Management
// Complex scheduling for enterprise clients
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Plus, 
  Building, 
  Calendar,
  Settings,
  Eye,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface MaintenanceContract {
  id: string
  contract_number: string
  client_id: string
  client_name: string
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'pending'
  total_locations: number
  total_units: number
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabase = createClient()
      
      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) {
        setError('No tenant found')
        return
      }

      // TODO: Query maintenance_contracts table (will be created)
      // For now, show placeholder message
      setContracts([])
      
    } catch (err: any) {
      console.error('Error loading contracts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-700">Expired</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Contracts</h1>
          <p className="text-gray-600 mt-1">
            Manage enterprise maintenance contracts with complex scheduling
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contracts/new">
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Link>
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          <strong>Contract-based Maintenance</strong> is for enterprise clients with multiple locations and different maintenance frequencies per unit type (e.g., ATM rooms monthly, office spaces quarterly).
          For simple clients with one location, use the <Link href="/dashboard/clients" className="text-blue-600 underline">Simple Maintenance Schedule</Link> instead.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No maintenance contracts yet
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
              Create your first maintenance contract to set up complex scheduling for enterprise clients.
              Perfect for clients like Bank Permata with multiple locations and varying frequencies.
            </p>
            <Button asChild>
              <Link href="/dashboard/contracts/new">
                <Plus className="w-4 h-4 mr-2" />
                Create First Contract
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">{contract.contract_number}</h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      Client: <span className="font-medium">{contract.client_name}</span>
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Period</p>
                        <p className="font-medium">
                          {new Date(contract.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                          {' - '}
                          {new Date(contract.end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Locations</p>
                        <p className="font-medium flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {contract.total_locations}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Units</p>
                        <p className="font-medium">{contract.total_units}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/contracts/${contract.id}`}>
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/contracts/${contract.id}/schedule`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        Schedule
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {contracts.filter(c => c.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {contracts.reduce((sum, c) => sum + c.total_locations, 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {contracts.reduce((sum, c) => sum + c.total_units, 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
