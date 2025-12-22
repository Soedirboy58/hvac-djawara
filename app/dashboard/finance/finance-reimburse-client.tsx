'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExternalLink, Plus, RefreshCw } from 'lucide-react'

type ReimburseCategory = {
  id: string
  tenant_id: string
  name: string
  is_active: boolean
  created_at: string
}

type ReimburseRequest = {
  id: string
  tenant_id: string
  category_id: string
  submitted_by: string
  amount: number
  description: string | null
  receipt_path: string
  status: 'submitted' | 'approved' | 'rejected' | 'paid'
  submitted_at: string
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  reimburse_categories?: { name: string } | null
  profiles?: { full_name: string | null; phone: string | null } | null
  display_name?: string
}

export function FinanceReimburseClient({ tenantId }: { tenantId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<'categories' | 'requests'>('categories')

  const [categories, setCategories] = useState<ReimburseCategory[]>([])
  const [requests, setRequests] = useState<ReimburseRequest[]>([])

  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null)
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const { data, error } = await supabase
        .from('reimburse_categories')
        .select('id, tenant_id, name, is_active, created_at')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })

      if (error) throw error
      setCategories((data || []) as ReimburseCategory[])
    } catch (error: any) {
      console.error('fetchCategories error:', error)
      toast.error(error?.message || 'Gagal memuat kategori')
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchRequests = async () => {
    setLoadingRequests(true)
    try {
      const { data, error } = await supabase
        .from('reimburse_requests')
        .select(
          `id, tenant_id, category_id, submitted_by, amount, description, receipt_path, status, submitted_at, decided_by, decided_at, decision_note,
           reimburse_categories(name),
           profiles:submitted_by(full_name, phone)`
        )
        .eq('tenant_id', tenantId)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      const raw = (data || []) as ReimburseRequest[]

      // Prefer technician name (technicians.full_name) over any profile/email.
      const userIds = Array.from(new Set(raw.map((r) => r.submitted_by).filter(Boolean)))
      const techNameByUserId = new Map<string, string>()

      if (userIds.length) {
        const { data: techRows, error: techError } = await supabase
          .from('technicians')
          .select('user_id, full_name')
          .eq('tenant_id', tenantId)
          .in('user_id', userIds)

        if (techError) {
          console.warn('fetch technician names error:', techError)
        } else {
          for (const t of techRows || []) {
            if (t?.user_id && t?.full_name) techNameByUserId.set(t.user_id, t.full_name)
          }
        }
      }

      setRequests(
        raw.map((r) => ({
          ...r,
          display_name: techNameByUserId.get(r.submitted_by) || r.profiles?.full_name || null || undefined,
        }))
      )
    } catch (error: any) {
      console.error('fetchRequests error:', error)
      toast.error(error?.message || 'Gagal memuat pengajuan')
    } finally {
      setLoadingRequests(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) {
      toast.error('Nama kategori wajib diisi')
      return
    }

    setCreatingCategory(true)
    try {
      const { error } = await supabase
        .from('reimburse_categories')
        .insert({ tenant_id: tenantId, name, is_active: true })

      if (error) throw error
      setNewCategoryName('')
      toast.success('Kategori berhasil dibuat')
      await fetchCategories()
    } catch (error: any) {
      console.error('createCategory error:', error)
      toast.error(error?.message || 'Gagal membuat kategori')
    } finally {
      setCreatingCategory(false)
    }
  }

  const toggleCategory = async (category: ReimburseCategory) => {
    setTogglingCategoryId(category.id)
    try {
      const { error } = await supabase
        .from('reimburse_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id)
        .eq('tenant_id', tenantId)

      if (error) throw error
      await fetchCategories()
    } catch (error: any) {
      console.error('toggleCategory error:', error)
      toast.error(error?.message || 'Gagal update kategori')
    } finally {
      setTogglingCategoryId(null)
    }
  }

  const openReceipt = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('reimburse-receipts')
        .createSignedUrl(path, 60)

      if (error) throw error
      if (!data?.signedUrl) throw new Error('Gagal membuat link file')

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      console.error('openReceipt error:', error)
      toast.error(error?.message || 'Gagal membuka struk')
    }
  }

  const formatRupiah = (value: number) => {
    try {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value)
    } catch {
      return `Rp ${value}`
    }
  }

  const statusBadge = (status: ReimburseRequest['status']) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">DIPROSES</Badge>
      case 'approved':
        return <Badge className="bg-green-600">DISETUJUI</Badge>
      case 'rejected':
        return <Badge className="bg-red-600">DITOLAK</Badge>
      case 'paid':
        return <Badge className="bg-blue-600">DIBAYARKAN</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const updateRequestStatus = async (request: ReimburseRequest, nextStatus: ReimburseRequest['status']) => {
    setUpdatingRequestId(request.id)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) throw new Error('Session tidak valid. Silakan login ulang.')

      const payload: Partial<ReimburseRequest> & Record<string, any> = {
        status: nextStatus,
      }

      // Track decision maker only for approve/reject.
      if (nextStatus === 'approved' || nextStatus === 'rejected') {
        payload.decided_by = user.id
        payload.decided_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('reimburse_requests')
        .update(payload)
        .eq('id', request.id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      toast.success('Status pengajuan diperbarui')
      await fetchRequests()
    } catch (error: any) {
      console.error('updateRequestStatus error:', error)
      toast.error(error?.message || 'Gagal update status')
    } finally {
      setUpdatingRequestId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Reimburse</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Kategori & daftar pengajuan (struk wajib)</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            fetchCategories()
            fetchRequests()
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="categories">Kategori</TabsTrigger>
            <TabsTrigger value="requests">Pengajuan</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tambah Kategori</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Nama Kategori</Label>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Contoh: Transport, Parkir, Makan, Material"
                    />
                  </div>
                  <Button type="button" onClick={createCategory} disabled={creatingCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    {creatingCategory ? 'Menyimpan...' : 'Tambah'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daftar Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingCategories ? (
                    <p className="text-sm text-gray-500">Memuat...</p>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada kategori.</p>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((c) => (
                        <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.is_active ? 'Aktif' : 'Tidak aktif'}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCategory(c)}
                            disabled={togglingCategoryId === c.id}
                          >
                            {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Pengajuan</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRequests ? (
                  <p className="text-sm text-gray-500">Memuat...</p>
                ) : requests.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada pengajuan.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Struk</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              {new Date(r.submitted_at).toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>{r.display_name || '-'}</TableCell>
                            <TableCell>{r.reimburse_categories?.name || '-'}</TableCell>
                            <TableCell>{formatRupiah(Number(r.amount))}</TableCell>
                            <TableCell>{statusBadge(r.status)}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openReceipt(r.receipt_path)}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Lihat
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {r.status === 'submitted' ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={updatingRequestId === r.id}
                                      onClick={() => updateRequestStatus(r, 'approved')}
                                    >
                                      Setujui
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={updatingRequestId === r.id}
                                      onClick={() => updateRequestStatus(r, 'rejected')}
                                    >
                                      Tolak
                                    </Button>
                                  </>
                                ) : r.status === 'approved' ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={updatingRequestId === r.id}
                                    onClick={() => updateRequestStatus(r, 'paid')}
                                  >
                                    Tandai Dibayar
                                  </Button>
                                ) : (
                                  <span className="text-sm text-gray-500">-</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
