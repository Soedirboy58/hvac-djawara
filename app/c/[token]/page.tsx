// ============================================
// Public Client View Page
// Client lihat data mereka via unique link (NO LOGIN)
// Premium upgrade CTA included
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  Calendar,
  Star,
  Gift,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  Crown,
  Building,
  Wrench,
  TrendingUp,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { DownloadPDFButton } from '@/components/client-portal/DownloadPDFButton'

interface PublicClientPageProps {
  params: {
    token: string
  }
}

export default async function PublicClientPage({ params }: PublicClientPageProps) {
  const supabase = await createClient()
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get client data by public token - DIRECT QUERY (simpler)
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('public_token', params.token)
    .single()

  console.log('Token:', params.token)
  console.log('Client data:', clientData)
  console.log('User:', user)

  if (!clientData || clientError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Link Tidak Valid</CardTitle>
            <CardDescription>
              Link yang Anda akses tidak ditemukan atau sudah tidak valid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                Kembali ke Beranda
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get client properties count
  const { count: propertiesCount } = await supabase
    .from('client_properties')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientData.id)
    .eq('is_active', true)

  // Get AC units count
  const { count: unitsCount } = await supabase
    .from('ac_units')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientData.id)
    .eq('is_active', true)

  // Get client orders
  const { data: orders } = await supabase
    .from('service_orders')
    .select('*')
    .eq('client_id', clientData.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const formatTime = (time?: string | null) => {
    if (!time) return null
    const parts = String(time).split(':')
    if (parts.length < 2) return time
    return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}`
  }

  const formatScheduleDateTime = (order: any) => {
    if (order?.completed_date) {
      return new Date(order.completed_date).toLocaleDateString('id-ID')
    }
    if (!order?.scheduled_date) return 'Not scheduled'

    const dateLabel = new Date(order.scheduled_date).toLocaleDateString('id-ID')
    const start = formatTime(order?.scheduled_time)
    const end = formatTime(order?.estimated_end_time)
    if (start && end) return `${dateLabel} ${start} - ${end}`
    if (start) return `${dateLabel} ${start}`
    return dateLabel
  }

  // Get upcoming maintenance schedules
  const { data: upcomingMaintenance } = await supabase
    .from('property_maintenance_schedules')
    .select(`
      id,
      frequency,
      next_scheduled_date,
      is_active,
      client_properties (
        property_name,
        address
      )
    `)
    .eq('client_id', clientData.id)
    .eq('is_active', true)
    .order('next_scheduled_date', { ascending: true })
    .limit(5)

  // Check if this client has premium account
  const isPremium = clientData.user_id !== null
  
  // If user is logged in AND this is their client account, redirect to premium dashboard
  if (user && clientData.user_id === user.id) {
    redirect('/client/dashboard')
  }

  function getStatusBadge(status: string) {
    const config: Record<string, { bg: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { bg: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-100 text-purple-800', icon: Package },
      completed: { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100 text-red-800', icon: AlertCircle },
    }
    const { bg, icon: Icon } = config[status] || config.pending
    return (
      <Badge className={bg}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{clientData.name}</h1>
                  {isPremium && (
                    <Badge className="bg-amber-500 text-white border-0 mt-1">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium Member
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-blue-100 ml-15">Your Personal Service Dashboard</p>
            </div>
            {isPremium && (
              <div className="text-right">
                <p className="text-sm text-blue-100">Loyalty Points</p>
                <p className="text-3xl font-bold">{clientData.loyalty_points}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Properties</p>
                  <p className="text-3xl font-bold text-gray-900">{propertiesCount || 0}</p>
                </div>
                <Building className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AC Units</p>
                  <p className="text-3xl font-bold text-gray-900">{unitsCount || 0}</p>
                </div>
                <Wrench className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Service Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{clientData.total_orders || 0}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Full Name</p>
                      <p className="text-gray-900">{clientData.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{clientData.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-gray-900">{clientData.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Type</p>
                      <p className="text-gray-900 capitalize">{clientData.client_type}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-gray-900">{clientData.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Upcoming Maintenance
                </CardTitle>
                <CardDescription>Scheduled maintenance for your properties</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingMaintenance && upcomingMaintenance.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingMaintenance.map((schedule: any) => {
                      const nextDate = schedule.next_scheduled_date ? new Date(schedule.next_scheduled_date) : null
                      const today = new Date()
                      const daysUntil = nextDate ? Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999
                      
                      const getUrgencyClass = (days: number) => {
                        if (days < 0) return 'border-red-300 bg-red-50'
                        if (days <= 3) return 'border-orange-300 bg-orange-50'
                        if (days <= 7) return 'border-yellow-300 bg-yellow-50'
                        return 'border-blue-200 bg-blue-50'
                      }
                      
                      const getUrgencyBadge = (days: number) => {
                        if (days < 0) return <Badge className="bg-red-600 text-white">OVERDUE</Badge>
                        if (days === 0) return <Badge className="bg-orange-600 text-white">DUE TODAY</Badge>
                        if (days <= 3) return <Badge className="bg-orange-500 text-white">URGENT</Badge>
                        return <Badge className="bg-blue-500 text-white">SCHEDULED</Badge>
                      }
                      
                      return (
                        <div key={schedule.id} className={`border-2 rounded-lg p-4 ${getUrgencyClass(daysUntil)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{schedule.client_properties?.property_name}</h4>
                              <p className="text-sm text-gray-600">{schedule.client_properties?.address}</p>
                            </div>
                            {getUrgencyBadge(daysUntil)}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">
                                {nextDate ? nextDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not scheduled'}
                              </span>
                            </div>
                            <span className={`font-medium ${
                              daysUntil < 0 ? 'text-red-700' : 
                              daysUntil <= 3 ? 'text-orange-700' : 'text-blue-700'
                            }`}>
                              {daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : 
                               daysUntil === 0 ? 'Today' : 
                               `in ${daysUntil} days`}
                            </span>
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {schedule.frequency === 'monthly' ? 'Monthly' :
                               schedule.frequency === 'quarterly' ? 'Quarterly' :
                               schedule.frequency === 'semi_annual' ? 'Semi-Annual' :
                               schedule.frequency === 'annual' ? 'Annual' : schedule.frequency}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No maintenance scheduled yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Recent Service Orders
                </CardTitle>
                <CardDescription>Your service history</CardDescription>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{order.order_number}</p>
                            <p className="text-sm text-gray-600">{order.service_title || order.service_type}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {formatScheduleDateTime(order)}
                          </div>
                          {order.status === 'completed' && (
                            <DownloadPDFButton
                              orderId={order.id}
                              orderNumber={order.order_number}
                              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No service orders yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Premium CTA or Premium Benefits */}
          <div className="lg:col-span-1">
            {!isPremium ? (
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 sticky top-4">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Upgrade to Premium
                    </h3>
                    <p className="text-sm text-gray-600">
                      Dapatkan benefit eksklusif dan prioritas layanan
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Loyalty Points</p>
                        <p className="text-xs text-gray-600">Earn & redeem points</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Priority Service</p>
                        <p className="text-xs text-gray-600">Faster response time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Exclusive Discounts</p>
                        <p className="text-xs text-gray-600">Up to 20% off</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full" disabled>
                    Soon
                  </Button>
                  
                  <p className="text-xs text-center text-gray-500 mt-3">
                    Already have account?{' '}
                    <Link href="/client/login" className="text-blue-600 hover:underline">
                      Login here
                    </Link>
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 sticky top-4">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Premium Member
                    </h3>
                    <p className="text-sm text-gray-600">
                      You have access to exclusive benefits!
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Loyalty Points</span>
                      <span className="font-bold text-lg">{clientData.loyalty_points}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Member Since</span>
                      <span className="font-medium text-sm">
                        {new Date(clientData.portal_activated_at!).toLocaleDateString('id-ID', {
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <Link href="/client/login">
                    <Button className="w-full" variant="outline">
                      Login to Premium Portal
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
