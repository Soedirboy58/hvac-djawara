'use client'

import { ArrowLeft, Calendar, MapPin, User, Phone, Mail, Clock, FileText, AlertCircle, Loader2, Edit, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOrder, useUpdateOrder, useTechnicians, OrderStatus } from '@/hooks/use-orders'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const statusConfig = {
  listing: { label: 'Listing', color: 'bg-gray-100 text-gray-800' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  pending: { label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

function OrderDetailContent() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  
  const { order, loading, error, refetch } = useOrder(orderId)
  const { updateOrder, loading: updating } = useUpdateOrder()
  const { technicians } = useTechnicians()
  
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('')
  const [selectedTechnician, setSelectedTechnician] = useState<string>('')
  const [notes, setNotes] = useState('')

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleUpdateStatus = async () => {
    if (!selectedStatus || !order) return

    const success = await updateOrder(order.id, { status: selectedStatus })
    
    if (success) {
      toast.success('Order status updated successfully')
      setSelectedStatus('')
      refetch()
    } else {
      toast.error('Failed to update order status')
    }
  }

  const handleAssignTechnician = async () => {
    if (!selectedTechnician || !order) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Not authenticated')
        return
      }

      // Check if technician already assigned
      const { data: existing } = await supabase
        .from('work_order_assignments')
        .select('id')
        .eq('service_order_id', order.id)
        .eq('technician_id', selectedTechnician)
        .single()

      if (existing) {
        toast.error('Teknisi sudah di-assign ke order ini')
        return
      }

      // Insert new assignment
      const { error: assignError } = await supabase
        .from('work_order_assignments')
        .insert({
          service_order_id: order.id,
          technician_id: selectedTechnician,
          assigned_by: user.id,
          status: 'assigned',
        })

      if (assignError) throw assignError

      // Update order status if still pending
      if (order.status === 'pending' || order.status === 'listing') {
        await updateOrder(order.id, { status: 'scheduled' })
      }

      toast.success('Technician assigned successfully')
      setSelectedTechnician('')
      refetch()
    } catch (err) {
      console.error('Error assigning technician:', err)
      toast.error('Failed to assign technician')
    }
  }

  const handleAddNote = async () => {
    if (!notes.trim() || !order) return

    const newNotes = order.notes ? `${order.notes}\n\n[${new Date().toLocaleString('id-ID')}]\n${notes}` : notes

    const success = await updateOrder(order.id, { notes: newNotes })
    
    if (success) {
      toast.success('Note added successfully')
      setNotes('')
      refetch()
    } else {
      toast.error('Failed to add note')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Order not found'}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
              <p className="text-gray-500">{order.service_title}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={statusConfig[order.status]?.color || 'bg-gray-100 text-gray-800'}>
            {statusConfig[order.status]?.label || order.status}
          </Badge>
          <Link href={`/dashboard/orders/${order.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{order.client?.name}</p>
                  <p className="text-sm text-gray-500">Customer</p>
                </div>
              </div>
              {order.client?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <p className="text-sm">{order.client.phone}</p>
                </div>
              )}
              {order.client?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <p className="text-sm">{order.client.email}</p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <p className="text-sm">{order.location_address}</p>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Service Type</p>
                <p className="font-medium capitalize">{order.order_type}</p>
              </div>
              {order.service_description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-sm">{order.service_description}</p>
                </div>
              )}
              {order.priority && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Priority</p>
                  <Badge variant="outline" className="capitalize">{order.priority}</Badge>
                </div>
              )}
              {order.estimated_duration && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estimated Duration</p>
                  <p className="text-sm">{order.estimated_duration} minutes</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline & Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
              <CardDescription>Track order progress and important dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-6">
                {/* Timeline line */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                {/* Created */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Order Created</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                    {order.creator?.full_name && (
                      <p className="text-xs text-gray-500 mt-1">by {order.creator.full_name}</p>
                    )}
                  </div>
                </div>

                {/* Requested Date */}
                {order.requested_date && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-yellow-500 border-4 border-white"></div>
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Requested Service Date</p>
                      <p className="text-xs text-gray-500">{formatDate(order.requested_date)}</p>
                    </div>
                  </div>
                )}

                {/* Scheduled */}
                {order.scheduled_date && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-purple-500 border-4 border-white"></div>
                    <div>
                      <p className="text-sm font-medium text-purple-900">Scheduled Start</p>
                      <p className="text-xs text-gray-500">
                        📅 {formatDate(order.scheduled_date)}
                        {order.scheduled_time && ` • ⏰ ${order.scheduled_time}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Estimated End */}
                {order.estimated_end_date && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-orange-500 border-4 border-white"></div>
                    <div>
                      <p className="text-sm font-medium text-orange-900">Estimated Completion</p>
                      <p className="text-xs text-gray-500">
                        📅 {formatDate(order.estimated_end_date)}
                        {order.estimated_end_time && ` • ⏰ ${order.estimated_end_time}`}
                      </p>
                      {order.scheduled_date && order.estimated_end_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Duration: {Math.ceil((new Date(order.estimated_end_date).getTime() - new Date(order.scheduled_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Status indicator */}
                {order.status === 'completed' && (
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Completed</p>
                      <p className="text-xs text-gray-500">{formatDateTime(order.updated_at)}</p>
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-gray-400 border-4 border-white"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Updated</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.updated_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Assign Technician */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Assign Technician
              </CardTitle>
              <CardDescription>
                {order.assigned_technician_names ? (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-medium">Currently assigned:</span>
                    <Badge variant="outline" className="bg-blue-50">
                      {order.assigned_technician_names}
                      {order.technician_count && order.technician_count > 1 && (
                        <span className="ml-1">({order.technician_count})</span>
                      )}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-amber-600">⚠️ No technician assigned yet</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Select a technician to add to this order:
                </p>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.length > 0 ? (
                      technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          👤 {tech.full_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No technicians available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAssignTechnician} 
                disabled={!selectedTechnician || updating}
                className="w-full"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Assign Technician
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500">
                💡 Tip: You can assign multiple technicians by using "Edit Order" button above
              </p>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.notes && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddNote} 
                  disabled={!notes.trim() || updating}
                  size="sm"
                >
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          {/* Assign Technician */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assign Technician</CardTitle>
              <CardDescription>Current: {order.technician?.full_name || 'Unassigned'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAssignTechnician} 
                disabled={!selectedTechnician || updating}
                className="w-full"
              >
                Assign
              </Button>
            </CardContent>
          </Card>

          {/* Update Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleUpdateStatus} 
                disabled={!selectedStatus || updating}
                className="w-full"
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.creator && (
                <div>
                  <p className="text-gray-500">Created by</p>
                  <p className="font-medium">{order.creator.full_name}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Order ID</p>
                <p className="font-mono text-xs">{order.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <ErrorBoundary>
      <OrderDetailContent />
    </ErrorBoundary>
  )
}
