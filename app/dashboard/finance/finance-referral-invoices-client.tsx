'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/utils/formatters'

type AssignmentStatus = 'assigned' | 'in_collection' | 'collected' | 'cancelled'

type ReferralInvoiceAssignment = {
  id: string
  tenant_id: string
  invoice_id: string
  invoice_number: string
  client_name: string
  client_phone: string | null
  client_address: string | null
  issue_date: string | null
  due_date: string | null
  amount_total: number
  status: AssignmentStatus
  partner_notes: string | null
  created_at: string
}

type CompletedJobItem = {
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

type CompletedJobRow = {
  invoice_id: string
  invoice_number: string
  amount_total: number
  status: string
  issue_date: string | null
  due_date: string | null
  client_name: string | null
  service_order_id: string | null
  order_number: string | null
  service_title: string | null
  completed_at: string | null
  items: CompletedJobItem[]
}

function statusLabel(s: AssignmentStatus) {
  if (s === 'assigned') return 'Assigned'
  if (s === 'in_collection') return 'Dalam Penagihan'
  if (s === 'collected') return 'Tertagih'
  if (s === 'cancelled') return 'Batal'
  return s
}

function statusVariant(s: AssignmentStatus) {
  if (s === 'collected') return 'default'
  if (s === 'cancelled') return 'destructive'
  if (s === 'in_collection') return 'secondary'
  return 'outline'
}

export function FinanceReferralInvoicesClient({ tenantId }: { tenantId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<ReferralInvoiceAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [referralMissing, setReferralMissing] = useState(false)

  const [completedLoading, setCompletedLoading] = useState(false)
  const [completedRows, setCompletedRows] = useState<CompletedJobRow[]>([])
  const [completedPage, setCompletedPage] = useState(1)
  const completedPageSize = 8
  const [completedHasNext, setCompletedHasNext] = useState(false)
  const [completedTotalCount, setCompletedTotalCount] = useState<number | null>(null)
  const [completedTotalAmount, setCompletedTotalAmount] = useState<number | null>(null)
  const [completedSelectedIds, setCompletedSelectedIds] = useState<Set<string>>(new Set())

  const fetchRows = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('referral_invoice_assignments' as any)
        .select(
          'id, tenant_id, invoice_id, invoice_number, client_name, client_phone, client_address, issue_date, due_date, amount_total, status, partner_notes, created_at'
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRows((data || []) as any)
      setReferralMissing(false)
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('referral_invoice_assignments') && msg.toLowerCase().includes('does not exist')) {
        setReferralMissing(true)
        return
      }
      console.error('fetch referral assignments error:', e)
      toast.error(e?.message || 'Gagal memuat tagihan referral')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const fetchCompletedJobs = async () => {
    setCompletedLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(completedPage),
        pageSize: String(completedPageSize),
      })

      const res = await fetch(`/api/partner/completed-orders?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Gagal memuat pekerjaan selesai')
      }

      setCompletedRows(Array.isArray(json.rows) ? json.rows : [])
      setCompletedHasNext(Boolean(json.hasNext))
      setCompletedTotalCount(typeof json.totalCount === 'number' ? json.totalCount : null)
      setCompletedTotalAmount(typeof json.totalAmount === 'number' ? json.totalAmount : null)
      setCompletedSelectedIds(new Set())
    } catch (e: any) {
      console.error('fetch completed jobs error:', e)
      toast.error(e?.message || 'Gagal memuat pekerjaan selesai')
    } finally {
      setCompletedLoading(false)
    }
  }

  useEffect(() => {
    fetchCompletedJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, completedPage])

  const completedAllSelectedOnPage = completedRows.length > 0 && completedRows.every((r) => completedSelectedIds.has(r.invoice_id))

  const toggleAllCompletedOnPage = (checked: boolean) => {
    setCompletedSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of completedRows) {
        if (checked) next.add(row.invoice_id)
        else next.delete(row.invoice_id)
      }
      return next
    })
  }

  const toggleCompletedOne = (id: string, checked: boolean) => {
    setCompletedSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectedTotalAmount = completedRows
    .filter((r) => completedSelectedIds.has(r.invoice_id))
    .reduce((sum, r) => sum + Number(r.amount_total || 0), 0)

  const updateStatus = async (id: string, status: AssignmentStatus) => {
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('referral_invoice_assignments' as any)
        .update({ status })
        .eq('tenant_id', tenantId)
        .eq('id', id)

      if (error) throw error
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      toast.success('Status diperbarui')
    } catch (e: any) {
      console.error('update status error:', e)
      toast.error(e?.message || 'Gagal update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const updateNotes = async (id: string, partner_notes: string) => {
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('referral_invoice_assignments' as any)
        .update({ partner_notes })
        .eq('tenant_id', tenantId)
        .eq('id', id)

      if (error) throw error
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, partner_notes } : r)))
      toast.success('Catatan disimpan')
    } catch (e: any) {
      console.error('update notes error:', e)
      toast.error(e?.message || 'Gagal simpan catatan')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tagihan Referral</CardTitle>
          <Button variant="outline" onClick={fetchRows} disabled={loading || referralMissing}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {referralMissing ? (
            <div className="text-sm text-muted-foreground">
              Modul tagihan referral belum aktif di database. Jalankan migration referral_invoice_assignments terlebih dahulu.
            </div>
          ) : loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada tagihan referral.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.invoice_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.client_name}</div>
                        <div className="text-xs text-muted-foreground">{r.client_phone || '—'}</div>
                      </TableCell>
                      <TableCell>
                        {r.due_date ? new Date(r.due_date).toLocaleDateString('id-ID') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.status) as any}>{statusLabel(r.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">Rp {Number(r.amount_total || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === r.id}
                            onClick={() => updateStatus(r.id, 'in_collection')}
                          >
                            Dalam Penagihan
                          </Button>
                          <Button
                            size="sm"
                            disabled={updatingId === r.id}
                            onClick={() => updateStatus(r.id, 'collected')}
                          >
                            Tertagih
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updatingId === r.id}
                            onClick={() => updateStatus(r.id, 'cancelled')}
                          >
                            Batal
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {rows.length > 0 ? (
            <div className="mt-6 space-y-4">
              <div className="text-sm font-medium">Catatan Mitra</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rows.slice(0, 4).map((r) => (
                  <div key={`notes-${r.id}`} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.invoice_number}</div>
                      <Badge variant={statusVariant(r.status) as any}>{statusLabel(r.status)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{r.client_name}</div>
                    <div className="space-y-1">
                      <Label className="text-xs">Catatan</Label>
                      <Textarea
                        value={r.partner_notes || ''}
                        onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, partner_notes: e.target.value } : x)))}
                        rows={3}
                        placeholder="Tulis catatan penagihan…"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === r.id}
                        onClick={() => updateNotes(r.id, r.partner_notes || '')}
                      >
                        Simpan Catatan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Catatan ditampilkan untuk 4 tagihan terbaru.
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Pekerjaan Selesai</CardTitle>
            <div className="text-xs text-muted-foreground">
              Menampilkan pekerjaan yang sudah selesai dan sudah dibuat invoice (khusus klien referral Anda).
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchCompletedJobs} disabled={completedLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              Total nilai semua pekerjaan:{' '}
              <span className="font-semibold">
                {completedTotalAmount === null ? '—' : formatCurrency(completedTotalAmount)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Total data: {completedTotalCount === null ? '—' : completedTotalCount}
            </div>
          </div>

          <div className="mt-3 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={completedAllSelectedOnPage}
                      onCheckedChange={(v) => toggleAllCompletedOnPage(Boolean(v))}
                      aria-label="Pilih semua"
                    />
                  </TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Rincian Biaya Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Memuat…
                    </TableCell>
                  </TableRow>
                ) : completedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Belum ada pekerjaan selesai untuk referral Anda.
                    </TableCell>
                  </TableRow>
                ) : (
                  completedRows.map((row) => (
                    <TableRow key={row.invoice_id}>
                      <TableCell>
                        <Checkbox
                          checked={completedSelectedIds.has(row.invoice_id)}
                          onCheckedChange={(v) => toggleCompletedOne(row.invoice_id, Boolean(v))}
                          aria-label="Pilih pekerjaan"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{row.invoice_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.issue_date ? new Date(row.issue_date).toLocaleDateString('id-ID') : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.order_number || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.service_title || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.client_name || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.amount_total || 0))}</TableCell>
                      <TableCell>
                        {row.items?.length ? (
                          <ul className="space-y-1 text-xs">
                            {row.items.map((item, idx) => (
                              <li key={`${row.invoice_id}-item-${idx}`}>
                                <div className="font-medium">{item.description}</div>
                                <div className="text-muted-foreground">
                                  {item.quantity} {item.unit} × {formatCurrency(Number(item.unit_price || 0))} ={' '}
                                  {formatCurrency(Number(item.line_total || 0))}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-muted-foreground">Rincian belum tersedia.</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              Total terpilih: <span className="font-semibold">{formatCurrency(selectedTotalAmount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompletedSelectedIds(new Set())}
                disabled={completedSelectedIds.size === 0}
              >
                Clear Bulk
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                  disabled={completedPage === 1 || completedLoading}
                >
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground">Page {completedPage}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompletedPage((p) => p + 1)}
                  disabled={!completedHasNext || completedLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
