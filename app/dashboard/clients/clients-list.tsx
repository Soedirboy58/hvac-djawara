// ============================================
// Clients List Component
// Display clients with filters, view toggle, pagination, and bulk actions
// ============================================

'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, MapPin, Phone, Mail, Loader2, LayoutGrid, List, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  client_type: string
  email: string | null
  phone: string | null
  address: string | null
  portal_enabled: boolean
  created_at: string
  referred_by_id?: string | null
  asset_count?: number
}

interface ClientsListProps {
  tenantId: string
  viewerRole?: string | null
  viewerUserId?: string | null
}

export function ClientsList({ tenantId, viewerRole, viewerUserId }: ClientsListProps) {
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)

  const [ownershipLabelsByUserId, setOwnershipLabelsByUserId] = useState<Record<string, string>>({})

  const canViewOwnershipKpis = useMemo(() => {
    if (!viewerRole) return false
    return ['owner', 'admin_finance', 'admin_logistic', 'tech_head'].includes(viewerRole)
  }, [viewerRole])

  const fetchClients = async () => {
    const supabase = createClient()

    let query = supabase
      .from('clients')
      .select('id, name, client_type, email, phone, address, portal_enabled, created_at, referred_by_id')
      .eq('tenant_id', tenantId)

    // Sales partners should only see clients that were referred by them
    if (viewerRole === 'sales_partner' && viewerUserId) {
      query = query.eq('referred_by_id', viewerUserId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch clients:', error)
      setClients([])
      setLoading(false)
      return
    }

    const rows = (data || []) as Client[]

    // Load asset counts (ac_units) per client
    const clientIds = rows.map((c) => c.id).filter(Boolean)
    let assetCountByClientId: Record<string, number> = {}
    if (clientIds.length > 0) {
      const { data: assetAgg, error: assetError } = await supabase
        .from('ac_units')
        .select('client_id, count:id')
        .eq('tenant_id', tenantId)
        .in('client_id', clientIds)

      if (assetError) {
        console.warn('Failed to load asset counts:', assetError.message)
      } else {
        for (const r of (assetAgg || []) as any[]) {
          const cid = String(r?.client_id || '')
          if (!cid) continue
          const cnt = Number(r?.count ?? 0)
          assetCountByClientId[cid] = Number.isFinite(cnt) ? cnt : 0
        }
      }
    }

    // Load referred-by labels for ownership KPIs (admin-only)
    if (canViewOwnershipKpis) {
      const referredIds = Array.from(
        new Set(rows.map((c) => String(c.referred_by_id || '')).filter(Boolean))
      )

      if (referredIds.length > 0) {
        const { data: refProfiles, error: refError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', referredIds)

        if (refError) {
          console.warn('Failed to load referral labels:', refError.message)
        } else {
          const map: Record<string, string> = {}
          for (const p of (refProfiles || []) as any[]) {
            const id = String(p?.id || '')
            if (!id) continue
            map[id] = String(p?.full_name || 'Unknown')
          }
          setOwnershipLabelsByUserId(map)
        }
      } else {
        setOwnershipLabelsByUserId({})
      }
    }

    const enriched = rows.map((c) => ({
      ...c,
      asset_count: assetCountByClientId[c.id] ?? 0,
    }))

    setClients(enriched)
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [tenantId, viewerRole, viewerUserId])

  const ownershipKpis = useMemo(() => {
    if (!canViewOwnershipKpis) return [] as Array<{ label: string; count: number }>
    if (!clients || clients.length === 0) return [] as Array<{ label: string; count: number }>

    const counts: Record<string, number> = {}
    for (const c of clients) {
      const key = c.referred_by_id ? String(c.referred_by_id) : 'internal'
      counts[key] = (counts[key] || 0) + 1
    }

    const internalCount = counts['internal'] || 0
    const items: Array<{ label: string; count: number }> = []
    items.push({ label: 'PT Djawara', count: internalCount })

    const partnerItems = Object.keys(counts)
      .filter((k) => k !== 'internal')
      .map((userId) => ({
        label: ownershipLabelsByUserId[userId] || 'Sales Partner',
        count: counts[userId] || 0,
      }))
      .sort((a, b) => b.count - a.count)

    return [...items, ...partnerItems]
  }, [clients, canViewOwnershipKpis, ownershipLabelsByUserId])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(search.toLowerCase()))
  )

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedClients = filteredClients.slice(startIndex, endIndex)

  const handleSelectAll = () => {
    if (selectedClients.size === paginatedClients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(paginatedClients.map(c => c.id)))
    }
  }

  const handleSelectClient = (clientId: string) => {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId)
    } else {
      newSelected.add(clientId)
    }
    setSelectedClients(newSelected)
  }

  const handleDeleteClient = async (clientId: string) => {
    setDeleting(true)
    const supabase = createClient()
    
    try {
      // Call database function to handle delete with proper transaction
      const { data, error } = await supabase
        .rpc('delete_client_safe', { p_client_id: clientId })

      if (error) throw error

      const result = data as { success: boolean; error?: string; message?: string }

      if (!result.success) {
        toast.error(result.error || 'Failed to delete client')
      } else {
        toast.success('Client deleted successfully')
        await fetchClients()
        setSelectedClients(prev => {
          const newSet = new Set(prev)
          newSet.delete(clientId)
          return newSet
        })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client')
      console.error('Delete error:', error)
    }
    
    setDeleting(false)
    setDeleteDialogOpen(false)
    setClientToDelete(null)
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    const supabase = createClient()
    const clientIds = Array.from(selectedClients)
    
    try {
      // Call database function for bulk delete
      const { data, error } = await supabase
        .rpc('delete_clients_bulk', { p_client_ids: clientIds })

      if (error) throw error

      const result = data as { success_count: number; fail_count: number; failed_clients: any[] }

      if (result.success_count > 0) {
        toast.success(`${result.success_count} client(s) deleted successfully`)
        await fetchClients()
        setSelectedClients(new Set())
      }

      if (result.fail_count > 0) {
        toast.error(`${result.fail_count} client(s) could not be deleted (may have service orders)`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete clients')
      console.error('Bulk delete error:', error)
    }
    
    setDeleting(false)
    setBulkDeleteDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Ownership KPIs (Admin Only) */}
      {canViewOwnershipKpis && ownershipKpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {ownershipKpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500 truncate">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.count}</p>
                <p className="text-xs text-gray-400 mt-1">client</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search clients by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Bulk Delete Button */}
        {selectedClients.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setBulkDeleteDialogOpen(true)}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete ({selectedClients.size})
          </Button>
        )}
      </div>

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-all hover:border-blue-300 group relative">
              <CardContent className="p-5">
                {/* Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <Checkbox
                    checked={selectedClients.has(client.id)}
                    onCheckedChange={() => handleSelectClient(client.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <Link href={`/dashboard/clients/${client.id}`} className="block pl-8">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {client.name}
                      </h3>
                      <Badge 
                        variant={client.client_type === 'rumah_tangga' ? 'secondary' : 'default'} 
                        className="mt-2"
                      >
                        {client.client_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Rumah Tangga'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{client.email || '-'}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{client.phone || '-'}</span>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2">{client.address || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Badge variant={client.portal_enabled ? 'default' : 'secondary'}>
                      {client.portal_enabled ? '✓ Portal Active' : 'No Portal'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setClientToDelete(client.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedClients.size === paginatedClients.length && paginatedClients.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Aset</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-gray-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedClients.has(client.id)}
                      onCheckedChange={() => handleSelectClient(client.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.client_type === 'rumah_tangga' ? 'secondary' : 'default'}>
                      {client.client_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Rumah Tangga'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{client.email || '-'}</TableCell>
                  <TableCell className="text-gray-600">{client.phone || '-'}</TableCell>
                  <TableCell className="text-center">{client.asset_count ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={client.portal_enabled ? 'default' : 'secondary'} className="text-xs">
                      {client.portal_enabled ? 'Active' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setClientToDelete(client.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {clients.length === 0 ? 'No clients yet. Add your first client!' : 'No clients found'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredClients.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="9">9</SelectItem>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} of {filteredClients.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && handleDeleteClient(clientToDelete)}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedClients.size} client(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all selected clients and their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : `Delete ${selectedClients.size} client(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
