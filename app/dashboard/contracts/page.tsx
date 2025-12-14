// ============================================
// Contract Management - All-in-One
// Requests + Active Contracts + Expired
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
  Eye,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type TabType = 'requests' | 'active' | 'expired'

interface ContractRequest {
  id: string
  client_name: string
  client_email: string
  requested_at: string
  status: 'pending' | 'approved' | 'rejected'
  properties_count: number
}

interface MaintenanceContract {
  id: string
  contract_number: string
  client_id: string
  client_name: string
  start_date: string
  end_date: string
  status: 'active' | 'expired'
  total_locations: number
  total_units: number
}

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [requests, setRequests] = useState<ContractRequest[]>([])
  const [contracts, setContracts] = useState<MaintenanceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
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

      if (activeTab === 'requests') {
        // TODO: Load contract requests from contract_requests table
        setRequests([])
      } else {
        // TODO: Load maintenance contracts (active or expired based on tab)
        setContracts([])
      }
      
    } catch (err: any) {
      console.error('Error loading data:', err)
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
          <h1 className="text-3xl font-bold text-gray-900">Contract Management</h1>
          <p className="text-gray-600 mt-1">
            Manage contract requests and maintenance agreements
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contracts/new">
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Contract Requests
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Active Contracts
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('expired')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'expired'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Expired
            </div>
          </button>
        </nav>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <>
          {requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pending requests
                </h3>
                <p className="text-sm text-gray-600 text-center mb-6 max-w-md">
                  When clients request maintenance contracts from their portal, they will appear here for approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{request.client_name}</h3>
                        <p className="text-sm text-gray-600">{request.client_email}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Requested: {new Date(request.requested_at).toLocaleDateString('id-ID')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Properties: {request.properties_count}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                        <Button size="sm">
                          Approve & Create Contract
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Active Contracts Tab */}
      {activeTab === 'active' && (
        <>
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No active contracts yet
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
        </>
      )}

      {/* Expired Contracts Tab */}
      {activeTab === 'expired' && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No expired contracts
            </h3>
            <p className="text-sm text-gray-600 text-center max-w-md">
              Contracts that have reached their end date will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {activeTab === 'active' && contracts.length > 0 && (
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
      )}
    </div>
  )
}
