// ============================================
// Public Service Tracking Page
// Check service status WITHOUT login
// ============================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Package, 
  Phone, 
  MapPin, 
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Star,
  Gift,
  Shield
} from 'lucide-react'
import Link from 'next/link'

interface ServiceOrder {
  id: string
  order_number: string
  service_type: string
  status: string
  scheduled_date: string | null
  address: string
  notes: string | null
  client: {
    name: string
    phone: string
  }
  created_at: string
}

export default function TrackServicePage() {
  const [trackingInput, setTrackingInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'phone' | 'order'>('phone')

  async function handleTrack() {
    if (!trackingInput.trim()) {
      setError('Please enter phone number or order number')
      return
    }

    setLoading(true)
    setError(null)
    setOrders([])

    try {
      const response = await fetch(`/api/public/track-service?${searchType}=${encodeURIComponent(trackingInput)}`)
      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Service not found')
        return
      }

      setOrders(data.orders || [])
      
      if (data.orders.length === 0) {
        setError('No service orders found. Please check your input.')
      }
    } catch (err) {
      setError('Failed to track service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'confirmed': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'in_progress': { color: 'bg-purple-100 text-purple-800', icon: Package },
      'completed': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    }
    
    const config = statusConfig[status] || statusConfig['pending']
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Track Your Service</h1>
            <p className="text-blue-100 text-lg">
              Check your service order status anytime, anywhere
            </p>
          </div>

          {/* Search Form */}
          <Card className="shadow-xl">
            <CardContent className="p-6">
              {/* Search Type Toggle */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={searchType === 'phone' ? 'default' : 'outline'}
                  onClick={() => setSearchType('phone')}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Phone Number
                </Button>
                <Button
                  variant={searchType === 'order' ? 'default' : 'outline'}
                  onClick={() => setSearchType('order')}
                  className="flex-1"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Order Number
                </Button>
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder={
                    searchType === 'phone' 
                      ? 'Enter phone number (e.g., 081234567890)' 
                      : 'Enter order number (e.g., ORD-2024-001)'
                  }
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleTrack} 
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Track
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-3">
                💡 Enter your phone number or order number to check service status
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Error */}
        {error && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Orders List */}
        {orders.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Service Orders</h2>
                <p className="text-gray-500">Found {orders.length} service order(s)</p>
              </div>
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <CardDescription className="mt-1">
                          Service Type: {order.service_type}
                        </CardDescription>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Customer</p>
                            <p className="text-sm text-gray-900">{order.client.name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Phone</p>
                            <p className="text-sm text-gray-900">{order.client.phone}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Scheduled</p>
                            <p className="text-sm text-gray-900">
                              {order.scheduled_date 
                                ? new Date(order.scheduled_date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })
                                : 'Not scheduled yet'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Location</p>
                            <p className="text-sm text-gray-900">{order.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Order created: {new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Premium CTA */}
            <Card className="mt-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Upgrade to Premium Member
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Get exclusive benefits and priority service when you become a registered member
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Gift className="w-4 h-4 text-blue-600" />
                        <span>Loyalty Points</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span>Priority Booking</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>Exclusive Discounts</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link href="/client/login">
                        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                          Login to Portal
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <Link href="/">
                        <Button variant="outline">
                          Learn More
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Initial State - Benefits */}
        {!error && orders.length === 0 && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Easy Tracking</h3>
                <p className="text-sm text-gray-600">
                  Track your service status anytime with just phone number
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Real-time Updates</h3>
                <p className="text-sm text-gray-600">
                  Get instant updates on your service order status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure & Private</h3>
                <p className="text-sm text-gray-600">
                  Your data is protected with enterprise-grade security
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
