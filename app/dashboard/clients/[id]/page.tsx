// ============================================
// Client Detail Page
// View & manage individual client with full data management
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail, Phone, MapPin, Building2, User, Edit, Save } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShareClientLink } from '@/components/client-portal/ShareClientLink'
import { EditClientForm } from '@/components/client-portal/EditClientForm'
import { PropertyManagement } from '@/components/client-portal/PropertyManagement'
import { ACInventoryManager } from '@/components/client-portal/ACInventoryManager'
import { AuditLogViewer } from '@/components/client-portal/AuditLogViewer'
import { DocumentManager } from '@/components/client-portal/DocumentManager'
import { ClientDashboard } from '@/components/client-portal/ClientDashboard'
import { MaintenanceSchedule } from '@/components/client-portal/MaintenanceSchedule'

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'properties' | 'inventory' | 'audit' | 'documents' | 'schedule'>('info')
  const [editMode, setEditMode] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    fetchClient()
  }, [params.id])

  async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      router.push('/login')
    }
  }

  async function fetchClient() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setClient(data)

      // Referral display (supports active user referral via referred_by_id OR passive referral via referred_by_name)
      if (data?.referred_by_name) {
        setReferredBy(data.referred_by_name)
      } else if (data?.referred_by_id) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.referred_by_id)
          .maybeSingle()
        setReferredBy(profileRow?.full_name ?? null)
      } else {
        setReferredBy(null)
      }
    } catch (err) {
      console.error('Error fetching client:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Client not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500 mt-1">Client Details & Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={client.client_type === 'rumah_tangga' ? 'secondary' : 'default'}>
            {client.client_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Rumah Tangga'}
          </Badge>
          {!editMode && activeTab === 'info' && (
            <Button onClick={() => setEditMode(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Client
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Client Info
          </button>
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'properties'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AC Inventory
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Change History
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Maintenance Schedule
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info Tab */}
          {activeTab === 'info' && (
            <>
              {editMode ? (
                <EditClientForm
                  client={client}
                  onSave={() => {
                    setEditMode(false)
                    fetchClient()
                  }}
                  onCancel={() => setEditMode(false)}
                />
              ) : (
                <>
                  {/* Client Dashboard with KPIs */}
                  <ClientDashboard clientId={params.id} />

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <User className="w-4 h-4" />
                            Full Name
                          </label>
                          <p className="text-gray-900">{client.name}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4" />
                            Email
                          </label>
                          <p className="text-gray-900">{client.email || '-'}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4" />
                            Phone
                          </label>
                          <p className="text-gray-900">{client.phone || '-'}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4" />
                            Client Type
                          </label>
                          <p className="text-gray-900 capitalize">{client.client_type || 'residential'}</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <User className="w-4 h-4" />
                            Referred By
                          </label>
                          <p className="text-gray-900">{referredBy || '-'}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                          <MapPin className="w-4 h-4" />
                          Address
                        </label>
                        <p className="text-gray-900">{client.address || '-'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Details (if not residential) */}
                  {client.client_type !== 'rumah_tangga' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Business Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              PIC Name
                            </label>
                            <p className="text-gray-900">{client.pic_name || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              PIC Phone
                            </label>
                            <p className="text-gray-900">{client.pic_phone || '-'}</p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              NPWP
                            </label>
                            <p className="text-gray-900">{client.company_npwp || '-'}</p>
                          </div>
                        </div>
                        
                        {client.company_address_npwp && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              NPWP Address
                            </label>
                            <p className="text-gray-900">{client.company_address_npwp}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Internal Notes */}
                  {client.notes_internal && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Internal Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{client.notes_internal}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* Properties Tab */}
          {activeTab === 'properties' && (
            <PropertyManagement clientId={params.id} />
          )}

          {/* AC Inventory Tab */}
          {activeTab === 'inventory' && (
            <ACInventoryManager clientId={params.id} />
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <AuditLogViewer clientId={params.id} />
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <DocumentManager clientId={params.id} />
          )}

          {/* Maintenance Schedule Tab */}
          {activeTab === 'schedule' && (
            <MaintenanceSchedule clientId={params.id} />
          )}
        </div>

        {/* Share Client Link Sidebar */}
        <div className="lg:col-span-1">
          <ShareClientLink client={client} />
        </div>
      </div>
    </div>
  )
}
