'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, FilePlus2 } from 'lucide-react'

type InvoiceRow = {
  id: string
  tenant_id: string
  invoice_number: string
  status: 'draft' | 'unpaid' | 'paid' | 'cancelled' | string
  amount_total: number
  paid_at: string | null
  created_at: string
}

type OrderQueueRow = {
  id: string
  order_number: string
  service_title: string
  status: string
  updated_at: string
  clients?: { name: string | null } | { name: string | null }[] | null
}

function getClientName(row: OrderQueueRow) {
  const c = row.clients as any
  if (!c) return null
  if (Array.isArray(c)) return c[0]?.name ?? null
  return c?.name ?? null
}

type QuotationRow = {
  id: string
  quotation_number: string
  client_company_name: string
  total: number
  status: string
}

type ClientRow = {
  id: string
  name: string
}

function generateInvoiceNumber(prefix: string) {
  // Not cryptographically unique; good enough for UI-side generation.
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase()
  const ts = Date.now().toString()
  return `${prefix}-${ts}-${rand}`
}

export function FinanceInvoiceClient({ tenantId }: { tenantId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(false)

  const [paidCount, setPaidCount] = useState<number | null>(null)
  const [unpaidCount, setUnpaidCount] = useState<number | null>(null)

  const [page, setPage] = useState(1)
  const pageSize = 10

  const [queueRows, setQueueRows] = useState<OrderQueueRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Manual invoice form
  const [manualSource, setManualSource] = useState<'quotation' | 'custom'>('quotation')
  const [quotations, setQuotations] = useState<QuotationRow[]>([])
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('')

  const [clients, setClients] = useState<ClientRow[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  const [manualServiceOrderId, setManualServiceOrderId] = useState<string>('')
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState<string>(() => generateInvoiceNumber('INV'))
  const [manualAmount, setManualAmount] = useState<string>('')
  const [manualNotes, setManualNotes] = useState<string>('')
  const [creatingManual, setCreatingManual] = useState(false)

  const allSelectedOnPage = queueRows.length > 0 && queueRows.every((r) => selectedIds.has(r.id))

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of queueRows) {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      }
      return next
    })
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const fetchKpis = async () => {
    try {
      const paid = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')

      if (paid.error) throw paid.error

      const unpaid = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .neq('status', 'paid')
        .neq('status', 'cancelled')

      if (unpaid.error) throw unpaid.error

      setPaidCount(paid.count ?? 0)
      setUnpaidCount(unpaid.count ?? 0)
    } catch (e: any) {
      console.warn('fetchKpis error:', e)
      setPaidCount(null)
      setUnpaidCount(null)
    }
  }

  const fetchQueue = async () => {
    // Invoice queue = service_orders completed that don't yet have an invoice.
    // We try to do this without requiring a DB view; results are paginated by service_orders.
    setLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const ordersRes = await supabase
        .from('service_orders')
        .select(
          `id, order_number, service_title, status, updated_at,
           clients(name)`
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (ordersRes.error) throw ordersRes.error

      const orders = (ordersRes.data || []) as unknown as OrderQueueRow[]
      if (orders.length === 0) {
        setQueueRows([])
        return
      }

      // Remove orders that already have invoices
      const orderIds = orders.map((o) => o.id)
      const invRes = await supabase
        .from('invoices')
        .select('id, service_order_id')
        .eq('tenant_id', tenantId)
        .in('service_order_id', orderIds)

      // If invoices table is not present yet, keep the queue visible but show setup warning.
      if (invRes.error) {
        console.warn('fetch invoices for queue error:', invRes.error)
        setQueueRows(orders)
        return
      }

      const hasInvoice = new Set((invRes.data || []).map((r: any) => r.service_order_id).filter(Boolean))
      setQueueRows(orders.filter((o) => !hasInvoice.has(o.id)))
    } catch (e: any) {
      console.error('fetchQueue error:', e)
      toast.error(e?.message || 'Gagal memuat invoice queue')
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotations = async () => {
    try {
      const res = await supabase
        .from('quotations')
        .select('id, quotation_number, client_company_name, total, status')
        .eq('tenant_id', tenantId)
        .order('quotation_date', { ascending: false })
        .limit(50)

      if (res.error) throw res.error
      setQuotations((res.data || []) as QuotationRow[])
    } catch (e: any) {
      console.warn('fetchQuotations error:', e)
      setQuotations([])
    }
  }

  const fetchClients = async () => {
    try {
      const res = await supabase
        .from('clients')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
        .limit(100)

      if (res.error) throw res.error
      setClients((res.data || []) as ClientRow[])
    } catch (e: any) {
      console.warn('fetchClients error:', e)
      setClients([])
    }
  }

  useEffect(() => {
    fetchKpis()
    fetchQuotations()
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  useEffect(() => {
    fetchQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, page])

  useEffect(() => {
    if (manualSource !== 'quotation') return
    if (!selectedQuotationId) return

    const q = quotations.find((x) => x.id === selectedQuotationId)
    if (!q) return

    setManualAmount(String(q.total ?? ''))
    setManualNotes(`Invoice berdasarkan penawaran ${q.quotation_number}`)
  }, [manualSource, selectedQuotationId, quotations])

  const handleBulkCreateInvoices = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error('Pilih minimal 1 pekerjaan')
      return
    }

    setLoading(true)
    try {
      // Fetch order details for snapshot fields
      const ordersRes = await supabase
        .from('service_orders')
        .select('id, tenant_id, order_number, client_id, service_title, location_address')
        .in('id', ids)

      if (ordersRes.error) throw ordersRes.error

      const orders = (ordersRes.data || []) as any[]

      // Fetch client names
      const clientIds = Array.from(new Set(orders.map((o) => o.client_id).filter(Boolean)))
      const clientsRes = clientIds.length
        ? await supabase
            .from('clients')
            .select('id, name, email, phone, address')
            .in('id', clientIds)
        : { data: [], error: null as any }

      if ((clientsRes as any).error) throw (clientsRes as any).error
      const clientById = new Map<string, any>()
      for (const c of (clientsRes as any).data || []) clientById.set(c.id, c)

      const rows = orders.map((o) => {
        const c = clientById.get(o.client_id)
        return {
          tenant_id: tenantId,
          invoice_number: `INV-${o.order_number}`,
          status: 'draft',
          service_order_id: o.id,
          client_id: o.client_id,
          client_name: c?.name || 'N/A',
          client_email: c?.email || null,
          client_phone: c?.phone || null,
          client_address: o.location_address || c?.address || null,
          amount_total: 0,
          notes: `Invoice draft untuk order ${o.order_number} (${o.service_title})`,
        }
      })

      const insertRes = await supabase.from('invoices').insert(rows)
      if (insertRes.error) throw insertRes.error

      toast.success(`Berhasil membuat ${rows.length} invoice draft`)
      setSelectedIds(new Set())
      await fetchKpis()
      await fetchQueue()
    } catch (e: any) {
      console.error('bulk create invoices error:', e)
      toast.error(e?.message || 'Gagal membuat invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateManualInvoice = async () => {
    setCreatingManual(true)
    try {
      if (!manualInvoiceNumber.trim()) {
        toast.error('Nomor invoice wajib diisi')
        return
      }

      if (manualSource === 'quotation') {
        if (!selectedQuotationId) {
          toast.error('Pilih penawaran')
          return
        }

        const q = quotations.find((x) => x.id === selectedQuotationId)
        if (!q) {
          toast.error('Penawaran tidak ditemukan')
          return
        }

        const amount = Number(manualAmount)
        if (!Number.isFinite(amount)) {
          toast.error('Nominal invoice tidak valid')
          return
        }

        const insertRes = await supabase.from('invoices').insert({
          tenant_id: tenantId,
          invoice_number: manualInvoiceNumber.trim(),
          status: 'unpaid',
          quotation_id: selectedQuotationId,
          service_order_id: manualServiceOrderId || null,
          client_id: null,
          client_name: q.client_company_name,
          client_email: null,
          client_phone: null,
          client_address: null,
          amount_total: amount,
          notes: manualNotes || `Invoice berdasarkan penawaran ${q.quotation_number}`,
        })

        if (insertRes.error) throw insertRes.error
      } else {
        if (!selectedClientId) {
          toast.error('Pilih client')
          return
        }

        const c = clients.find((x) => x.id === selectedClientId)
        if (!c) {
          toast.error('Client tidak ditemukan')
          return
        }

        const amount = Number(manualAmount)
        if (!Number.isFinite(amount)) {
          toast.error('Nominal invoice tidak valid')
          return
        }

        const insertRes = await supabase.from('invoices').insert({
          tenant_id: tenantId,
          invoice_number: manualInvoiceNumber.trim(),
          status: 'unpaid',
          quotation_id: null,
          service_order_id: manualServiceOrderId || null,
          client_id: selectedClientId,
          client_name: c.name,
          client_email: null,
          client_phone: null,
          client_address: null,
          amount_total: amount,
          notes: manualNotes || null,
        })

        if (insertRes.error) throw insertRes.error
      }

      toast.success('Invoice berhasil dibuat')
      setManualInvoiceNumber(generateInvoiceNumber('INV'))
      setManualAmount('')
      setManualNotes('')
      setSelectedQuotationId('')
      setSelectedClientId('')
      setManualServiceOrderId('')

      await fetchKpis()
      await fetchQueue()
    } catch (e: any) {
      console.error('create manual invoice error:', e)
      toast.error(e?.message || 'Gagal membuat invoice')
    } finally {
      setCreatingManual(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoice Sudah Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paidCount ?? '—'}</div>
            <p className="text-sm text-muted-foreground mt-1">Status: paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoice Belum Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unpaidCount ?? '—'}</div>
            <p className="text-sm text-muted-foreground mt-1">Draft/Sent/Unpaid</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoice Queue (Service Order Completed)</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchKpis(); fetchQueue(); }} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleBulkCreateInvoices} disabled={loading || selectedIds.size === 0}>
              <FilePlus2 className="h-4 w-4 mr-2" />
              Bulk Create Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">
              Halaman {page} • Terpilih: {selectedIds.size}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading || queueRows.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>

          {queueRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tidak ada service order completed yang perlu dibuat invoice pada halaman ini.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <Checkbox
                      checked={allSelectedOnPage}
                      onCheckedChange={(v) => toggleAllOnPage(Boolean(v))}
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(v) => toggleOne(row.id, Boolean(v))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.order_number}</TableCell>
                    <TableCell>{getClientName(row) || '—'}</TableCell>
                    <TableCell>{row.service_title}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-600">completed</Badge>
                    </TableCell>
                    <TableCell>
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString('id-ID') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Catatan: Queue ini berbasis `service_orders.status = completed` dan akan hilang setelah invoice dibuat.
          </div>
        </CardContent>
      </Card>

      {/* Manual Invoice */}
      <Card>
        <CardHeader>
          <CardTitle>Buat Invoice Manual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jenis Input</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={manualSource === 'quotation' ? 'default' : 'outline'}
                  onClick={() => setManualSource('quotation')}
                >
                  Berdasar Penawaran
                </Button>
                <Button
                  type="button"
                  variant={manualSource === 'custom' ? 'default' : 'outline'}
                  onClick={() => setManualSource('custom')}
                >
                  Request Khusus
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Request khusus: invoice bisa dibuat walaupun pekerjaan belum tuntas (opsional link ke service order).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nomor Invoice</Label>
              <Input value={manualInvoiceNumber} onChange={(e) => setManualInvoiceNumber(e.target.value)} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setManualInvoiceNumber(generateInvoiceNumber('INV'))}
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>

          {manualSource === 'quotation' ? (
            <div className="space-y-2">
              <Label>Pilih Penawaran</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedQuotationId}
                onChange={(e) => setSelectedQuotationId(e.target.value)}
              >
                <option value="">— pilih penawaran —</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quotation_number} • {q.client_company_name} • Rp {Number(q.total || 0).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Pilih Client</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">— pilih client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Link ke Service Order (Opsional)</Label>
            <Input
              placeholder="Tempel service_order_id jika ingin ditautkan"
              value={manualServiceOrderId}
              onChange={(e) => setManualServiceOrderId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Untuk kasus administrasi: isi jika invoice terkait order tertentu walau status order belum completed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nominal (Rp)</Label>
              <Input value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="contoh: 1500000" />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="opsional" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCreateManualInvoice} disabled={creatingManual}>
              Buat Invoice
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Jika tabel `invoices` belum ada di Supabase, jalankan SQL setup terlebih dahulu.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
