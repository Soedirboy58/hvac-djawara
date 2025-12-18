'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  Search, 
  Filter,
  FileDown,
  Trash2,
  UserPlus,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  CheckSquare,
  Square,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle as AlertCircleIcon,
  DollarSign,
  Calendar,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useOrders, OrderStatus } from '@/hooks/use-orders'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

const statusConfig = {
  listing: { label: 'Listing', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircleIcon },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Clock },
  pending: { label: 'Pending', color: 'bg-orange-100 text-orange-800', icon: AlertCircleIcon },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500 text-white', dot: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
  normal: { label: 'Normal', color: 'bg-blue-500 text-white', dot: 'bg-blue-500' },
  low: { label: 'Low', color: 'bg-gray-400 text-white', dot: 'bg-gray-400' },
}

export default function OrdersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  const { orders, loading, error } = useOrders({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery,
  })

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!orders) return null
    
    const total = orders.length
    const pending = orders.filter(o => o.status === 'listing' || o.status === 'pending').length
    const inProgress = orders.filter(o => o.status === 'in_progress').length
    const completed = orders.filter(o => o.status === 'completed').length
    const completedToday = orders.filter(o => {
      if (o.status !== 'completed' || !o.completion_date) return false
      const today = new Date().toDateString()
      return new Date(o.completion_date).toDateString() === today
    }).length

    return {
      total,
      pending,
      inProgress,
      completed,
      completedToday,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [orders])

  // Pagination
  const paginatedOrders = useMemo(() => {
    if (!orders) return []
    const startIndex = (currentPage - 1) * pageSize
    return orders.slice(startIndex, startIndex + pageSize)
  }, [orders, currentPage, pageSize])

  const totalPages = orders ? Math.ceil(orders.length / pageSize) : 0

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)))
    }
  }

  const toggleSelectOrder = (id: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedOrders(newSelected)
  }

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return
    if (!confirm(`Yakin ingin menghapus ${selectedOrders.size} order? Tindakan ini tidak bisa dibatalkan.`)) return
    
    const supabase = createClient()
    
    try {
      // Delete work_order_assignments first (foreign key constraint)
      const { error: assignmentError } = await supabase
        .from('work_order_assignments')
        .delete()
        .in('service_order_id', Array.from(selectedOrders))
      
      if (assignmentError) {
        console.error('Error deleting assignments:', assignmentError)
        toast.error('Gagal menghapus assignment teknisi')
        return
      }

      // Then delete the orders
      const { error: orderError } = await supabase
        .from('service_orders')
        .delete()
        .in('id', Array.from(selectedOrders))
      
      if (orderError) {
        console.error('Error deleting orders:', orderError)
        toast.error('Gagal menghapus order')
        return
      }

      toast.success(`${selectedOrders.size} order berhasil dihapus`)
      setSelectedOrders(new Set())
      
      // Refresh the page to reload data
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Terjadi kesalahan saat menghapus order')
    }
  }

  const handleExport = () => {
    const dataToExport = selectedOrders.size > 0
      ? orders?.filter(o => selectedOrders.has(o.id))
      : orders

    toast.success(`Exporting ${dataToExport?.length} orders...`)
    // Export logic here
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return '-'
    const start = formatDate(startDate)
    if (!endDate) return start
    const end = formatDate(endDate)
    if (start === end) return start
    return `${start} - ${end}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Orders</h1>
          <p className="text-muted-foreground">Manage customer service requests</p>
        </div>
        <Link href="/dashboard/orders/new">
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <h3 className="text-2xl font-bold mt-1">{kpis.total}</h3>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <h3 className="text-2xl font-bold mt-1">{kpis.pending}</h3>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                  <h3 className="text-2xl font-bold mt-1">{kpis.inProgress}</h3>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <h3 className="text-2xl font-bold mt-1">{kpis.completed}</h3>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today</p>
                  <h3 className="text-2xl font-bold mt-1">{kpis.completedToday}</h3>
                </div>
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion</p>
                  <h3 className="text-2xl font-bold mt-1">{kpis.completionRate}%</h3>
                </div>
                <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, client, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="listing">Listing</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedOrders.size > 0 && (
              <>
                <Button variant="outline" onClick={handleExport}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export ({selectedOrders.size})
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedOrders.size})
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => {
                  const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleSelectOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.client_name || order.client?.name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{order.client_phone || order.client?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.service_title}</div>
                          <Badge variant="outline" className="mt-1">
                            {order.order_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {order.service_location}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDateRange(order.scheduled_date, order.estimated_end_date)}</span>
                          {order.scheduled_date && order.estimated_end_date && 
                            new Date(order.estimated_end_date).getTime() !== new Date(order.scheduled_date).getTime() && (
                            <span className="text-xs text-muted-foreground">
                              ({Math.ceil((new Date(order.estimated_end_date).getTime() - new Date(order.scheduled_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.priority && (
                          <Badge className={priorityConfig[order.priority as keyof typeof priorityConfig]?.color || ''}>
                            {priorityConfig[order.priority as keyof typeof priorityConfig]?.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.color || ''}>
                          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                          {statusConfig[order.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.assigned_technician_names ? (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{order.assigned_technician_names}</span>
                              {order.technician_count && order.technician_count > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {order.technician_count} technicians
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/orders/${order.id}/edit`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign Technician
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!confirm(`Yakin ingin menghapus order ${order.order_number}?`)) return
                                
                                const supabase = createClient()
                                
                                try {
                                  // Delete assignments first
                                  await supabase
                                    .from('work_order_assignments')
                                    .delete()
                                    .eq('service_order_id', order.id)
                                  
                                  // Delete order
                                  const { error } = await supabase
                                    .from('service_orders')
                                    .delete()
                                    .eq('id', order.id)
                                  
                                  if (error) throw error
                                  
                                  toast.success('Order berhasil dihapus')
                                  router.refresh()
                                } catch (err) {
                                  console.error('Delete error:', err)
                                  toast.error('Gagal menghapus order')
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {orders && orders.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, orders.length)} of {orders.length} orders
                </span>
                <Select value={pageSize.toString()} onValueChange={(v) => {
                  setPageSize(parseInt(v))
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && <span className="text-sm text-muted-foreground">...</span>}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
