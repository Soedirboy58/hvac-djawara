// ============================================
// Client Detail Page
// View & manage individual client
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Mail, Phone, MapPin, Building2, User } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShareClientLink } from '@/components/client-portal/ShareClientLink'

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // Get client data
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (clientError || !client) {
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
            <p className="text-gray-500 mt-1">Client Details & Portal Access</p>
          </div>
        </div>
        <Badge variant={client.client_type === 'commercial' ? 'default' : 'secondary'}>
          {client.client_type || 'residential'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Information */}
        <div className="lg:col-span-2 space-y-6">
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

          {/* Business Details (if commercial) */}
          {client.client_type === 'commercial' && (
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
        </div>

        {/* Share Client Link */}
        <div className="lg:col-span-1">
          <ShareClientLink client={client} />
        </div>
      </div>
    </div>
  )
}
