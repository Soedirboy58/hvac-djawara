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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, FilePlus2 } from 'lucide-react'
import { InvoiceFromOrderDialog } from './invoice-from-order-dialog'

type InvoiceRow = {
  id: string
  tenant_id: string
  invoice_number: string
  status: 'draft' | 'unpaid' | 'paid' | 'cancelled' | string
  amount_total: number
  service_order_id?: string | null
  quotation_id?: string | null
  client_id?: string | null
  notes?: string | null
  issue_date?: string | null
  due_date?: string | null
  client_name?: string | null
  sent_at?: string | null
  paid_at: string | null
  created_at: string
}

type OrderQueueRow = {
  id: string
  order_number: string
  service_title: string
  status: string
  updated_at: string
  tenant_id?: string
  client_id?: string | null
  client_name?: string | null
  clients?: { name: string | null } | { name: string | null }[] | null
  invoice_id?: string | null
  invoice_number?: string | null
  invoice_status?: string | null
  invoice_created_at?: string | null
}

function getClientName(row: OrderQueueRow) {
  if (row.client_name) return row.client_name
  const c = row.clients as any
  if (!c) return null
  if (Array.isArray(c)) return c[0]?.name ?? null
  return c?.name ?? null
}

function formatIdDateTime(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(iso)
  if (String(d) === 'Invalid Date') return null
  return d.toLocaleString('id-ID')
}

function toDateTimeLocalValue(iso: string | null | undefined) {
  const d = iso ? new Date(iso) : new Date()
  if (String(d) === 'Invalid Date') return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function hasInvoice(row: OrderQueueRow) {
  return Boolean(row.invoice_id)
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
  const [pendingSentCount, setPendingSentCount] = useState<number | null>(null)
  const [sentTotalCount, setSentTotalCount] = useState<number | null>(null)

  const [recentInvoices, setRecentInvoices] = useState<InvoiceRow[]>([])
  const [invoicePage, setInvoicePage] = useState(1)
  const invoicePageSize = 10
  const [invoiceHasNext, setInvoiceHasNext] = useState(false)
  const [invoiceSelectedIds, setInvoiceSelectedIds] = useState<Set<string>>(new Set())

  const [paidConfirmOpen, setPaidConfirmOpen] = useState(false)
  const [paidConfirmIds, setPaidConfirmIds] = useState<string[]>([])
  const [paidConfirmDateTime, setPaidConfirmDateTime] = useState<string>('')
  const [paidConfirmBusy, setPaidConfirmBusy] = useState(false)

  const [page, setPage] = useState(1)
  const pageSize = 10

  const [queueHasNext, setQueueHasNext] = useState(false)
  const [queueTotalCount, setQueueTotalCount] = useState<number | null>(null)

  const [queueRows, setQueueRows] = useState<OrderQueueRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [activeDialogAction, setActiveDialogAction] = useState<'preview' | 'send' | null>(null)

  const allSelectedOnInvoicePage = recentInvoices.length > 0 && recentInvoices.every((r) => invoiceSelectedIds.has(r.id))

  const toggleAllInvoicesOnPage = (checked: boolean) => {
    setInvoiceSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of recentInvoices) {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      }
      return next
    })
  }

  const toggleOneInvoice = (id: string, checked: boolean) => {
    setInvoiceSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  // Manual invoice form
  const [manualSource, setManualSource] = useState<'quotation' | 'custom'>('quotation')
  const [quotations, setQuotations] = useState<QuotationRow[]>([])
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('')

  const [clients, setClients] = useState<ClientRow[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  const [manualServiceOrderId, setManualServiceOrderId] = useState<string>('')
  const [manualLinkedOrderStatus, setManualLinkedOrderStatus] = useState<string | null>(null)
  const [manualLinkedOrderNumber, setManualLinkedOrderNumber] = useState<string | null>(null)
  const [checkingManualLinkedOrder, setCheckingManualLinkedOrder] = useState(false)
  const [allowManualBeforeCompleted, setAllowManualBeforeCompleted] = useState(false)
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState<string>(() => generateInvoiceNumber('INV'))
  const [manualAmount, setManualAmount] = useState<string>('')
  const [manualNotes, setManualNotes] = useState<string>('')
  const [creatingManual, setCreatingManual] = useState(false)
  const [editingManualInvoiceId, setEditingManualInvoiceId] = useState<string | null>(null)

  useEffect(() => {
    const id = manualServiceOrderId.trim()
    if (!id) {
      setManualLinkedOrderStatus(null)
      setManualLinkedOrderNumber(null)
      setAllowManualBeforeCompleted(false)
      return
    }

    let cancelled = false
    setCheckingManualLinkedOrder(true)
    const t = setTimeout(async () => {
      try {
        const res = await supabase
          .from('service_orders')
          .select('id, status, order_number')
          .eq('tenant_id', tenantId)
          .eq('id', id)
          .maybeSingle()

        if (cancelled) return

        if (res.error) {
          console.warn('manual linked order check error:', res.error)
          setManualLinkedOrderStatus('unknown')
          setManualLinkedOrderNumber(null)
          return
        }

        if (!res.data) {
          setManualLinkedOrderStatus('not_found')
          setManualLinkedOrderNumber(null)
          return
        }

        setManualLinkedOrderStatus(res.data.status || 'unknown')
        setManualLinkedOrderNumber(res.data.order_number || null)
      } finally {
        if (!cancelled) setCheckingManualLinkedOrder(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(t)
      setCheckingManualLinkedOrder(false)
    }
  }, [manualServiceOrderId, supabase, tenantId])

  const selectableQueueRows = queueRows.filter((r) => !hasInvoice(r))
  const allSelectedOnPage = selectableQueueRows.length > 0 && selectableQueueRows.every((r) => selectedIds.has(r.id))

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of selectableQueueRows) {
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

      // Pending (sent but not yet paid). Keep legacy 'unpaid' as pending.
      const pending = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'unpaid'])

      if (pending.error) throw pending.error

      setPaidCount(paid.count ?? 0)
      setPendingSentCount(pending.count ?? 0)
      setSentTotalCount((paid.count ?? 0) + (pending.count ?? 0))
    } catch (e: any) {
      console.warn('fetchKpis error:', e)
      setPaidCount(null)
      setPendingSentCount(null)
      setSentTotalCount(null)
    }
  }

  const fetchRecentInvoices = async () => {
    try {
      const from = (invoicePage - 1) * invoicePageSize
      const to = from + invoicePageSize // fetch 1 extra row to detect next page

      const res = await supabase
        .from('invoices')
        .select('id, tenant_id, invoice_number, status, amount_total, service_order_id, quotation_id, client_id, notes, issue_date, due_date, client_name, sent_at, paid_at, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (res.error) throw res.error
      const rows = ((res.data || []) as unknown as InvoiceRow[])
      const hasNext = rows.length > invoicePageSize
      setInvoiceHasNext(hasNext)
      setRecentInvoices(hasNext ? rows.slice(0, invoicePageSize) : rows)
    } catch (e: any) {
      console.warn('fetchRecentInvoices error:', e)
      setRecentInvoices([])
      setInvoiceHasNext(false)
    }
  }

  const startEditInvoice = (inv: InvoiceRow) => {
    const orderId = (inv as any).service_order_id as string | null | undefined
    if (orderId) {
      setActiveDialogAction(null)
      setActiveOrderId(orderId)
      return
    }

    // Manual invoice: edit via the manual form
    setEditingManualInvoiceId(inv.id)
    setManualInvoiceNumber(inv.invoice_number || generateInvoiceNumber('INV'))
    setManualAmount(String(inv.amount_total ?? ''))
    setManualNotes(String((inv as any).notes ?? '') || '')
    setManualServiceOrderId(String((inv as any).service_order_id ?? '') || '')
    setAllowManualBeforeCompleted(false)

    const quotationId = (inv as any).quotation_id as string | null | undefined
    const clientId = (inv as any).client_id as string | null | undefined

    if (quotationId) {
      setManualSource('quotation')
      setSelectedQuotationId(quotationId)
      setSelectedClientId('')
    } else {
      setManualSource('custom')
      setSelectedClientId(clientId || '')
      setSelectedQuotationId('')
    }
  }

  const cancelEditManualInvoice = () => {
    setEditingManualInvoiceId(null)
    setManualInvoiceNumber(generateInvoiceNumber('INV'))
    setManualAmount('')
    setManualNotes('')
    setSelectedQuotationId('')
    setSelectedClientId('')
    setManualServiceOrderId('')
    setManualLinkedOrderStatus(null)
    setManualLinkedOrderNumber(null)
    setAllowManualBeforeCompleted(false)
  }

  const deleteInvoice = async (inv: InvoiceRow) => {
    const ok = window.confirm(`Hapus invoice ${inv.invoice_number}? Tindakan ini tidak bisa dibatalkan.`)
    if (!ok) return

    try {
      // Best-effort: delete items first (if table exists)
      const itemsDel = await supabase
        .from('invoice_items')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('invoice_id', inv.id)

      if (itemsDel.error) {
        // If invoice_items table doesn't exist, ignore; otherwise surface the error.
        const msg = String((itemsDel.error as any).message || '')
        if (!msg.toLowerCase().includes('invoice_items') || !msg.toLowerCase().includes('does not exist')) {
          throw itemsDel.error
        }
      }

      const del = await supabase
        .from('invoices')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('id', inv.id)

      if (del.error) throw del.error

      toast.success('Invoice dihapus')
      setInvoiceSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(inv.id)
        return next
      })

      if (editingManualInvoiceId === inv.id) cancelEditManualInvoice()
      await Promise.all([fetchKpis(), fetchRecentInvoices(), fetchQueue()])
    } catch (e: any) {
      console.error('deleteInvoice error:', e)
      toast.error(e?.message || 'Gagal menghapus invoice')
    }
  }

  const bulkMarkInvoiceSent = async () => {
    const ids = Array.from(invoiceSelectedIds)
    if (ids.length === 0) {
      toast.error('Pilih minimal 1 invoice')
      return
    }

    try {
      const now = new Date().toISOString()
      let upd = await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: now })
        .eq('tenant_id', tenantId)
        .in('id', ids)
        .in('status', ['draft', 'unpaid'])
        .select('id')

      if (upd.error) {
        // Fallback for older schema without sent_at
        upd = await supabase
          .from('invoices')
          .update({ status: 'sent' })
          .eq('tenant_id', tenantId)
          .in('id', ids)
          .in('status', ['draft', 'unpaid'])
          .select('id')
      }

      if (upd.error) throw upd.error

      const updatedCount = (upd.data as any[] | null)?.length ?? 0
      if (updatedCount === 0) {
        toast.error('Tidak ada invoice yang berubah. Pastikan status masih draft/unpaid dan Anda punya akses finance.')
        return
      }
      toast.success('Bulk: invoice ditandai dalam penagihan')
      setInvoiceSelectedIds(new Set())
      await Promise.all([fetchKpis(), fetchRecentInvoices(), fetchQueue()])
    } catch (e: any) {
      console.error('bulkMarkInvoiceSent error:', e)
      toast.error(e?.message || 'Gagal bulk update invoice')
    }
  }

  const bulkMarkInvoicePaid = async () => {
    const ids = Array.from(invoiceSelectedIds)
    if (ids.length === 0) {
      toast.error('Pilih minimal 1 invoice')
      return
    }

    setPaidConfirmIds(ids)
    setPaidConfirmDateTime(toDateTimeLocalValue(null))
    setPaidConfirmOpen(true)
  }

  const markInvoiceSent = async (invoiceId: string) => {
    try {
      const res = await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', invoiceId)

      if (res.error) throw res.error
      toast.success('Invoice ditandai: dikirim')
      await Promise.all([fetchKpis(), fetchRecentInvoices(), fetchQueue()])
    } catch (e: any) {
      console.error('markInvoiceSent error:', e)
      toast.error(e?.message || 'Gagal update status invoice')
    }
  }

  const markInvoicePaid = async (invoiceId: string) => {
    setPaidConfirmIds([invoiceId])
    const inv = recentInvoices.find((x) => x.id === invoiceId)
    setPaidConfirmDateTime(toDateTimeLocalValue(inv?.paid_at || null))
    setPaidConfirmOpen(true)
  }

  const markPaidWithIso = async (ids: string[], paidIso: string) => {
    let upd = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: paidIso })
      .eq('tenant_id', tenantId)
      .in('id', ids)
      .neq('status', 'cancelled')
      .select('id')

    if (upd.error) {
      // Fallback for older schema without sent_at
      upd = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_at: paidIso })
        .eq('tenant_id', tenantId)
        .in('id', ids)
        .neq('status', 'cancelled')
        .select('id')
    }

    if (upd.error) throw upd.error
    const updatedCount = (upd.data as any[] | null)?.length ?? 0
    return updatedCount
  }

  const confirmMarkPaid = async () => {
    const ids = paidConfirmIds
    if (!ids || ids.length === 0) {
      setPaidConfirmOpen(false)
      return
    }

    try {
      setPaidConfirmBusy(true)
      if (!paidConfirmDateTime) {
        toast.error('Tanggal/jam lunas wajib diisi')
        return
      }

      const paidIso = new Date(paidConfirmDateTime).toISOString()

      if (!paidIso || paidIso === 'Invalid Date') {
        toast.error('Tanggal/jam lunas tidak valid')
        return
      }

      const updatedCount = await markPaidWithIso(ids, paidIso)
      if (updatedCount === 0) {
        toast.error('Tidak ada invoice yang berubah. Pastikan status belum paid/cancelled dan Anda punya akses finance.')
        return
      }

      toast.success(ids.length > 1 ? 'Bulk: invoice ditandai lunas' : 'Invoice ditandai: lunas')
      setInvoiceSelectedIds(new Set())
      setPaidConfirmOpen(false)
      setPaidConfirmIds([])
      await Promise.all([fetchKpis(), fetchRecentInvoices(), fetchQueue()])
    } catch (e: any) {
      console.error('confirmMarkPaid error:', e)
      toast.error(e?.message || 'Gagal update status invoice')
    } finally {
      setPaidConfirmBusy(false)
    }
  }

  const fetchQueue = async () => {
    // Queue section shows completed service orders and indicates whether an invoice already exists.
    setLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize // fetch 1 extra row to detect next page

      const res = await supabase
        .from('service_orders')
        .select(
          `id, order_number, service_title, status, updated_at,
           clients(name),
           invoices!left(id, invoice_number, status, created_at)`,
          { count: 'exact' }
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (res.error) throw res.error

      setQueueTotalCount(typeof res.count === 'number' ? res.count : null)

      const rawRows = (res.data || []) as any[]
      const normalized: OrderQueueRow[] = rawRows.map((r) => {
        const invRaw = r.invoices
        const invArr = Array.isArray(invRaw) ? invRaw : invRaw ? [invRaw] : []
        const latest = invArr
          .slice()
          .sort((a: any, b: any) => {
            const ta = a?.created_at ? new Date(a.created_at).getTime() : 0
            const tb = b?.created_at ? new Date(b.created_at).getTime() : 0
            return tb - ta
          })[0]

        return {
          id: r.id,
          order_number: r.order_number,
          service_title: r.service_title,
          status: r.status,
          updated_at: r.updated_at,
          clients: r.clients ?? null,
          client_name: Array.isArray(r.clients) ? r.clients[0]?.name ?? null : r.clients?.name ?? null,
          invoice_id: latest?.id ?? null,
          invoice_number: latest?.invoice_number ?? null,
          invoice_status: latest?.status ?? null,
          invoice_created_at: latest?.created_at ?? null,
        }
      })

      const hasNext = normalized.length > pageSize
      setQueueHasNext(hasNext)
      setQueueRows(hasNext ? normalized.slice(0, pageSize) : normalized)
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
    fetchRecentInvoices()
    fetchQuotations()
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  useEffect(() => {
    setInvoiceSelectedIds(new Set())
    fetchRecentInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, invoicePage])

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

    const rowById = new Map(queueRows.map((r) => [r.id, r]))
    const idsToCreate = ids.filter((id) => {
      const row = rowById.get(id)
      return row ? !hasInvoice(row) : true
    })

    if (idsToCreate.length === 0) {
      toast.error('Semua pekerjaan terpilih sudah punya invoice')
      return
    }

    if (idsToCreate.length !== ids.length) {
      toast.message('Sebagian pekerjaan sudah punya invoice dan akan dilewati')
    }

    setLoading(true)
    try {
      // Fetch order details for snapshot fields
      const ordersRes = await supabase
        .from('service_orders')
        .select('id, tenant_id, order_number, client_id, service_title, location_address')
        .in('id', idsToCreate)

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

      const linkedOrderId = manualServiceOrderId.trim() || null
      if (linkedOrderId) {
        const check = await supabase
          .from('service_orders')
          .select('id, status, order_number')
          .eq('tenant_id', tenantId)
          .eq('id', linkedOrderId)
          .maybeSingle()

        if (check.error) throw check.error
        if (!check.data) {
          toast.error('Service order tidak ditemukan (cek ID)')
          return
        }

        const st = String(check.data.status || '').toLowerCase()
        if (st !== 'completed' && !allowManualBeforeCompleted) {
          toast.error('Order belum completed. Centang konfirmasi “kasus khusus” dulu.')
          setManualLinkedOrderStatus(check.data.status || 'unknown')
          setManualLinkedOrderNumber(check.data.order_number || null)
          return
        }
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

        const baseNotes = manualNotes || `Invoice berdasarkan penawaran ${q.quotation_number}`
        const finalNotes =
          linkedOrderId && manualLinkedOrderStatus && manualLinkedOrderStatus !== 'completed' && allowManualBeforeCompleted
            ? `PERCEPATAN (order belum completed) — ${baseNotes}`
            : baseNotes

        if (editingManualInvoiceId) {
          const upd = await supabase
            .from('invoices')
            .update({
              invoice_number: manualInvoiceNumber.trim(),
              quotation_id: selectedQuotationId,
              service_order_id: linkedOrderId,
              client_id: null,
              client_name: q.client_company_name,
              amount_total: amount,
              notes: finalNotes,
            })
            .eq('tenant_id', tenantId)
            .eq('id', editingManualInvoiceId)

          if (upd.error) throw upd.error
        } else {
          const insertRes = await supabase.from('invoices').insert({
            tenant_id: tenantId,
            invoice_number: manualInvoiceNumber.trim(),
            status: 'draft',
            quotation_id: selectedQuotationId,
            service_order_id: linkedOrderId,
            client_id: null,
            client_name: q.client_company_name,
            client_email: null,
            client_phone: null,
            client_address: null,
            amount_total: amount,
            notes: finalNotes,
          })

          if (insertRes.error) throw insertRes.error
        }
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

        const baseNotes = manualNotes || null
        const finalNotes =
          linkedOrderId && manualLinkedOrderStatus && manualLinkedOrderStatus !== 'completed' && allowManualBeforeCompleted
            ? `PERCEPATAN (order belum completed) — ${baseNotes || ''}`.trim()
            : baseNotes

        if (editingManualInvoiceId) {
          const upd = await supabase
            .from('invoices')
            .update({
              invoice_number: manualInvoiceNumber.trim(),
              quotation_id: null,
              service_order_id: linkedOrderId,
              client_id: selectedClientId,
              client_name: c.name,
              amount_total: amount,
              notes: finalNotes,
            })
            .eq('tenant_id', tenantId)
            .eq('id', editingManualInvoiceId)

          if (upd.error) throw upd.error
        } else {
          const insertRes = await supabase.from('invoices').insert({
            tenant_id: tenantId,
            invoice_number: manualInvoiceNumber.trim(),
            status: 'draft',
            quotation_id: null,
            service_order_id: linkedOrderId,
            client_id: selectedClientId,
            client_name: c.name,
            client_email: null,
            client_phone: null,
            client_address: null,
            amount_total: amount,
            notes: finalNotes,
          })

          if (insertRes.error) throw insertRes.error
        }
      }

      toast.success(editingManualInvoiceId ? 'Invoice berhasil diupdate' : 'Invoice berhasil dibuat')
      cancelEditManualInvoice()

      await fetchKpis()
      await fetchRecentInvoices()
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
      <Dialog open={paidConfirmOpen} onOpenChange={setPaidConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Invoice Lunas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {paidConfirmIds.length > 1
                ? `Anda akan menandai ${paidConfirmIds.length} invoice sebagai lunas.`
                : 'Anda akan menandai 1 invoice sebagai lunas.'}
            </div>
            <div className="space-y-2">
              <Label>Tanggal & Jam Pelunasan</Label>
              <Input
                type="datetime-local"
                value={paidConfirmDateTime}
                onChange={(e) => setPaidConfirmDateTime(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                Kosongkan jika ingin memakai waktu sekarang.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaidConfirmOpen(false)}
              disabled={paidConfirmBusy}
            >
              Batal
            </Button>
            <Button type="button" onClick={confirmMarkPaid} disabled={paidConfirmBusy}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoice Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paidCount ?? '—'}</div>
            <p className="text-sm text-muted-foreground mt-1">Status: paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terkirim (Pending)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingSentCount ?? '—'}</div>
            <p className="text-sm text-muted-foreground mt-1">Status: sent / unpaid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Persentase Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {paidCount === null || sentTotalCount === null
                ? '—'
                : sentTotalCount === 0
                ? '0%'
                : `${Math.round((paidCount / sentTotalCount) * 100)}%`}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Paid / (Sent+Paid)</p>
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
              Halaman {page}
              {queueTotalCount === null ? '' : ` • Total: ${queueTotalCount}`}
              {' • '}Terpilih: {selectedIds.size}
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
                disabled={loading || !queueHasNext}
              >
                Next
              </Button>
            </div>
          </div>

          {queueRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tidak ada service order completed pada halaman ini.</div>
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        disabled={hasInvoice(row)}
                        onCheckedChange={(v) => toggleOne(row.id, Boolean(v))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.order_number}</TableCell>
                    <TableCell>{getClientName(row) || '—'}</TableCell>
                    <TableCell>{row.service_title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <div>
                          <Badge className="bg-green-600">completed</Badge>
                          {hasInvoice(row) ? (
                            <Badge className="ml-2">Invoice sudah dibuat</Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">Belum ada invoice</Badge>
                          )}
                        </div>
                        {hasInvoice(row) ? (
                          <div className="text-xs text-muted-foreground">
                            {row.invoice_number ? `No: ${row.invoice_number}` : ''}
                            {row.invoice_status ? ` • Status: ${String(row.invoice_status)}` : ''}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString('id-ID') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (hasInvoice(row)) {
                            setActiveDialogAction('preview')
                            setActiveOrderId(row.id)
                            return
                          }
                          setActiveDialogAction(null)
                          setActiveOrderId(row.id)
                        }}
                      >
                        {hasInvoice(row) ? 'Lihat Invoice' : 'Buat Invoice'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Catatan: Queue ini menampilkan semua service order `completed`; indikator menunjukkan invoice sudah dibuat atau belum.
          </div>
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Invoice</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={bulkMarkInvoiceSent}
              disabled={invoiceSelectedIds.size === 0}
            >
              Bulk: Dalam Penagihan
            </Button>
            <Button
              size="sm"
              onClick={bulkMarkInvoicePaid}
              disabled={invoiceSelectedIds.size === 0}
            >
              Bulk: Lunas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchKpis()
                fetchRecentInvoices()
                fetchQueue()
              }}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">
              Halaman {invoicePage} • Terpilih: {invoiceSelectedIds.size}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                disabled={invoicePage <= 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInvoicePage((p) => p + 1)}
                disabled={!invoiceHasNext}
              >
                Next
              </Button>
            </div>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada invoice.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <Checkbox
                      checked={allSelectedOnInvoicePage}
                      onCheckedChange={(v) => toggleAllInvoicesOnPage(Boolean(v))}
                    />
                  </TableHead>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((inv) => {
                  const status = String(inv.status || '').toLowerCase()
                  const isPaid = status === 'paid'
                  const isCancelled = status === 'cancelled'
                  const canMarkPaid = !isCancelled && (status === 'sent' || status === 'unpaid' || status === 'draft' || status === 'paid')
                  const hasOrderLink = Boolean((inv as any).service_order_id)

                  const statusLabel = isPaid
                    ? 'Lunas'
                    : isCancelled
                    ? 'Dibatalkan'
                    : status === 'sent' || status === 'unpaid'
                    ? 'Dalam Penagihan'
                    : 'Draft'

                  const badgeVariant = isPaid ? 'default' : isCancelled ? 'destructive' : 'secondary'

                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Checkbox
                          checked={invoiceSelectedIds.has(inv.id)}
                          onCheckedChange={(v) => toggleOneInvoice(inv.id, Boolean(v))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{(inv as any).client_name || '—'}</TableCell>
                      <TableCell>{(inv as any).issue_date ? new Date((inv as any).issue_date).toLocaleDateString('id-ID') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={badgeVariant as any}>{statusLabel}</Badge>
                          {status === 'sent' || status === 'unpaid' ? (
                            <div className="text-xs text-muted-foreground">
                              Dikirim: {formatIdDateTime((inv as any).sent_at) || '—'}
                            </div>
                          ) : null}
                          {isPaid ? (
                            <div className="text-xs text-muted-foreground">
                              Dibayar: {formatIdDateTime((inv as any).paid_at) || '—'}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {Number(inv.amount_total || 0).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasOrderLink ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveDialogAction('preview')
                                  setActiveOrderId((inv as any).service_order_id)
                                }}
                              >
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveDialogAction('send')
                                  setActiveOrderId((inv as any).service_order_id)
                                }}
                              >
                                Kirim Invoice
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditInvoice(inv)}
                              >
                                Edit
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPaid || isCancelled || status !== 'draft'}
                              onClick={() => markInvoiceSent(inv.id)}
                            >
                              Tandai Dikirim
                            </Button>
                          )}
                          {!hasOrderLink ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditInvoice(inv)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            disabled={!canMarkPaid}
                            onClick={() => markInvoicePaid(inv.id)}
                          >
                            {isPaid ? 'Ubah Tgl Bayar' : 'Tandai Lunas'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteInvoice(inv)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Alur status: Draft → Dalam Penagihan → Lunas. (unpaid tetap dianggap pending / legacy)
            <span className="ml-2">Bulk action hanya mengubah status (tidak otomatis mengirim dokumen PDF).</span>
          </div>
        </CardContent>
      </Card>

      {activeOrderId ? (
        <InvoiceFromOrderDialog
          tenantId={tenantId}
          orderId={activeOrderId}
          open={Boolean(activeOrderId)}
          initialAction={activeDialogAction}
          onOpenChange={(v) => {
            if (!v) {
              setActiveOrderId(null)
              setActiveDialogAction(null)
            }
          }}
          onDone={async () => {
            setSelectedIds((prev) => {
              const next = new Set(prev)
              if (activeOrderId) next.delete(activeOrderId)
              return next
            })
            await fetchKpis()
            await fetchRecentInvoices()
            await fetchQueue()
          }}
        />
      ) : null}

      {/* Manual Invoice */}
      <Card>
        <CardHeader>
          <CardTitle>{editingManualInvoiceId ? 'Edit Invoice Manual' : 'Buat Invoice Manual'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingManualInvoiceId ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">
                <div className="font-medium">Mode Edit</div>
                <div className="text-xs text-muted-foreground">Invoice ID: {editingManualInvoiceId}</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={cancelEditManualInvoice}>
                Batal
              </Button>
            </div>
          ) : null}
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
                Jalur utama: ambil dari queue pekerjaan completed. Manual hanya untuk kasus khusus (percepatan administrasi).
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
              onChange={(e) => {
                setManualServiceOrderId(e.target.value)
                setAllowManualBeforeCompleted(false)
              }}
            />
            <p className="text-xs text-muted-foreground">
              Disarankan hanya jika order sudah completed. Jika belum completed, ini dianggap exception dan butuh konfirmasi.
            </p>

            {manualServiceOrderId.trim() ? (
              <div className="text-xs text-muted-foreground">
                {checkingManualLinkedOrder ? (
                  <span>Memeriksa status order…</span>
                ) : manualLinkedOrderStatus === 'not_found' ? (
                  <span className="text-destructive">Order tidak ditemukan (cek ID).</span>
                ) : (
                  <span>
                    Status order{manualLinkedOrderNumber ? ` ${manualLinkedOrderNumber}` : ''}:{' '}
                    <span className="font-medium text-foreground">{manualLinkedOrderStatus || '—'}</span>
                  </span>
                )}
              </div>
            ) : null}

            {manualServiceOrderId.trim() && manualLinkedOrderStatus && manualLinkedOrderStatus !== 'completed' && manualLinkedOrderStatus !== 'not_found' ? (
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  checked={allowManualBeforeCompleted}
                  onCheckedChange={(v) => setAllowManualBeforeCompleted(Boolean(v))}
                />
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">Kasus khusus (percepatan)</div>
                  <div>Saya paham order belum completed dan invoice ini dibuat sebagai exception.</div>
                </div>
              </div>
            ) : null}
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
              {editingManualInvoiceId ? 'Simpan Perubahan' : 'Buat Invoice'}
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
