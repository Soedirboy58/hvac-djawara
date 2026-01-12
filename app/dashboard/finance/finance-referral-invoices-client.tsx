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
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('referral_invoice_assignments') && msg.toLowerCase().includes('does not exist')) {
        toast.error('Fitur referral belum aktif di database. Jalankan migration referral_invoice_assignments dulu.')
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
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
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
    </div>
  )
}
