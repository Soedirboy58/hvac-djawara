'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { formatCurrency } from '@/lib/utils/formatters'
import { generateInvoicePdfBlob } from '@/lib/invoice-pdf'
import { Plus, Trash2 } from 'lucide-react'

type WorkLog = {
  id: string
  work_type: string | null
  completed_at: string | null
  maintenance_units_data: any[] | null
  ac_units_data: any[] | null
}

type SparepartRow = {
  sparepart_name: string
  quantity: number
  unit: string | null
}

type OrderRow = {
  id: string
  tenant_id: string
  order_number: string
  service_title: string | null
  location_address: string | null
  clients: {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    address: string | null
  } | null
}

type InvoiceDraftItem = {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxPercent: number
}

type ExistingInvoice = {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string | null
  status: string
  client_id: string | null
  client_name: string
  client_phone: string | null
  client_address: string | null
  amount_total: number
  ppn_enabled?: boolean
  ppn_percent?: number
  pph_enabled?: boolean
  pph_percent?: number
  dp_enabled?: boolean
  dp_amount?: number
}

function groupMaintenanceItems(maintenanceUnits: any[]): InvoiceDraftItem[] {
  if (!Array.isArray(maintenanceUnits) || maintenanceUnits.length === 0) return []

  const groups = new Map<string, number>()
  for (const u of maintenanceUnits) {
    const cap = (u?.kapasitas_ac || '').toString().trim()
    const key = cap || 'Unit'
    groups.set(key, (groups.get(key) || 0) + 1)
  }

  const items: InvoiceDraftItem[] = []
  for (const [cap, qty] of groups.entries()) {
    const desc = cap && cap !== 'Unit' ? `Jasa Cuci AC Split ${cap} Reguler` : 'Jasa Cuci AC Reguler'
    items.push({
      id: `svc-${cap}`,
      description: desc,
      quantity: qty,
      unit: 'Unit',
      unitPrice: 0,
      discountPercent: 0,
      taxPercent: 0,
    })
  }

  return items
}

function safeNumber(v: any) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function calcLineTotal(item: InvoiceDraftItem) {
  const qty = safeNumber(item.quantity)
  const unitPrice = safeNumber(item.unitPrice)
  const disc = safeNumber(item.discountPercent)
  const tax = safeNumber(item.taxPercent)

  const base = qty * unitPrice
  const afterDisc = base * (1 - disc / 100)
  const afterTax = afterDisc * (1 + tax / 100)
  return afterTax
}

function calcSubtotal(items: InvoiceDraftItem[]) {
  return items.reduce((acc, it) => acc + safeNumber(it.quantity) * safeNumber(it.unitPrice), 0)
}

function calcDiscountTotal(items: InvoiceDraftItem[]) {
  return items.reduce((acc, it) => {
    const base = safeNumber(it.quantity) * safeNumber(it.unitPrice)
    return acc + base * (safeNumber(it.discountPercent) / 100)
  }, 0)
}

function calcGrandTotal(items: InvoiceDraftItem[]) {
  return items.reduce((acc, it) => acc + calcLineTotal(it), 0)
}

function safeDateISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function blobToFile(blob: Blob, fileName: string): Promise<File> {
  return new File([blob], fileName, { type: 'application/pdf' })
}

export function InvoiceFromOrderDialog({
  tenantId,
  orderId,
  open,
  onOpenChange,
  onDone,
}: {
  tenantId: string
  orderId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [order, setOrder] = useState<OrderRow | null>(null)
  const [workLog, setWorkLog] = useState<WorkLog | null>(null)
  const [spareparts, setSpareparts] = useState<SparepartRow[]>([])

  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState<string>(() => safeDateISO(new Date()))
  const [dueDate, setDueDate] = useState<string>('')

  const [dueMode, setDueMode] = useState<'7' | '14' | '30' | 'custom'>('14')

  const [discEnabled, setDiscEnabled] = useState(false)
  const [ppnEnabled, setPpnEnabled] = useState(false)
  const [ppnPercent, setPpnPercent] = useState<number>(11)
  const [pphEnabled, setPphEnabled] = useState(false)
  const [pphPercent, setPphPercent] = useState<number>(0)
  const [dpEnabled, setDpEnabled] = useState(false)
  const [dpAmount, setDpAmount] = useState<number>(0)

  const [items, setItems] = useState<InvoiceDraftItem[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const subtotal = calcSubtotal(items)
  const discountTotal = calcDiscountTotal(items)
  const total = calcGrandTotal(items)

  const dpp = Math.max(0, subtotal - discountTotal)
  const pphAmount = pphEnabled ? dpp * (safeNumber(pphPercent) / 100) : 0
  const payable = Math.max(0, total - pphAmount)
  const sisaTagihan = dpEnabled ? Math.max(0, payable - safeNumber(dpAmount)) : payable

  const addDaysFromISO = (iso: string, days: number) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    d.setDate(d.getDate() + days)
    return safeDateISO(d)
  }

  const resetPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewBlob(null)
  }

  const newItem = (): InvoiceDraftItem => ({
    id: `it-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    description: '',
    quantity: 1,
    unit: 'Unit',
    unitPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
  })

  useEffect(() => {
    if (!open) return

    const run = async () => {
      setLoading(true)
      try {
        // 1) Fetch order + client
        const orderRes = await supabase
          .from('service_orders')
          .select(
            `id, tenant_id, order_number, service_title, location_address,
             clients(id, name, phone, email, address)`
          )
          .eq('id', orderId)
          .eq('tenant_id', tenantId)
          .single()

        if (orderRes.error) throw orderRes.error
        setOrder(orderRes.data as any)

        // 2) If invoice exists for this order, load it (edit/print/resend)
        // Try with adjustment columns; fallback if schema not yet applied.
        let existing = await supabase
          .from('invoices')
          .select('id, invoice_number, issue_date, due_date, status, client_id, client_name, client_phone, client_address, amount_total, ppn_enabled, ppn_percent, pph_enabled, pph_percent, dp_enabled, dp_amount')
          .eq('tenant_id', tenantId)
          .eq('service_order_id', orderId)
          .maybeSingle()

        if (existing.error) {
          const fallback = await supabase
            .from('invoices')
            .select('id, invoice_number, issue_date, due_date, status, client_id, client_name, client_phone, client_address, amount_total')
            .eq('tenant_id', tenantId)
            .eq('service_order_id', orderId)
            .maybeSingle()
          if (fallback.error) throw fallback.error
          existing = fallback as any
        }

        if (existing.data) {
          const inv = existing.data as ExistingInvoice
          setInvoiceId(inv.id)
          setInvoiceNumber(inv.invoice_number)
          setIssueDate(inv.issue_date)
          setDueDate(inv.due_date || '')
          setDueMode(inv.due_date ? 'custom' : '14')
          setPpnEnabled(Boolean(inv.ppn_enabled))
          setPpnPercent(safeNumber(inv.ppn_percent || 11) || 11)
          setPphEnabled(Boolean(inv.pph_enabled))
          setPphPercent(safeNumber(inv.pph_percent || 0))
          setDpEnabled(Boolean(inv.dp_enabled))
          setDpAmount(safeNumber(inv.dp_amount || 0))

          // Try load invoice items (if schema already applied)
          const itemsRes = await supabase
            .from('invoice_items')
            .select('id, description, quantity, unit, unit_price, discount_percent, tax_percent')
            .eq('tenant_id', tenantId)
            .eq('invoice_id', inv.id)
            .order('created_at', { ascending: true })

          if (!itemsRes.error && itemsRes.data) {
            const loaded = (itemsRes.data as any[]).map((r) => ({
              id: r.id,
              description: r.description,
              quantity: Number(r.quantity || 0),
              unit: r.unit || 'Unit',
              unitPrice: Number(r.unit_price || 0),
              discountPercent: Number(r.discount_percent || 0),
              taxPercent: Number(r.tax_percent || 0),
            }))
            setItems(loaded)
            setDiscEnabled(loaded.some((x) => safeNumber(x.discountPercent) > 0))
          }
          return
        }

        // 3) No existing invoice: build from technical report + spareparts
        // Prefer PIC work log so assistant logs don't override the source data.
        const picAssignments = await supabase
          .from('work_order_assignments')
          .select('technician_id')
          .eq('service_order_id', orderId)
          .eq('role_in_order', 'primary')

        const picTechnicianIds = (picAssignments.data || []).map((r: any) => r.technician_id).filter(Boolean)

        let workLogQuery = supabase
          .from('technician_work_logs')
          .select('id, work_type, check_type, completed_at, maintenance_units_data, ac_units_data, technician_id')
          .eq('service_order_id', orderId)

        if (picTechnicianIds.length > 0) {
          workLogQuery = workLogQuery.in('technician_id', picTechnicianIds)
        }

        const workLogRes = await workLogQuery
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (workLogRes.error) throw workLogRes.error
        setWorkLog((workLogRes.data as any) || null)

        const wl = workLogRes.data as any

        const sparepartsRows: SparepartRow[] = []
        if (wl?.id) {
          const spRes = await supabase
            .from('work_order_spareparts')
            .select('sparepart_name, quantity, unit')
            .eq('work_log_id', wl.id)

          if (!spRes.error && spRes.data) {
            sparepartsRows.push(...((spRes.data as any[]) as SparepartRow[]))
          }
        }
        setSpareparts(sparepartsRows)

        const generated: InvoiceDraftItem[] = []
        const wt = (wl?.work_type || '').toLowerCase()

        if (wt === 'pemeliharaan') {
          generated.push(...groupMaintenanceItems(wl?.maintenance_units_data || []))
        } else if (wt === 'troubleshooting') {
          const qty = Array.isArray(wl?.ac_units_data) ? wl.ac_units_data.length : 1
          generated.push({ id: 'svc-troubleshooting', description: 'Jasa Troubleshooting AC', quantity: qty || 1, unit: 'Unit', unitPrice: 0, discountPercent: 0, taxPercent: 0 })
        } else if (wt === 'pengecekan') {
          const ctRaw = String(wl?.check_type || '').toLowerCase().trim()
          const ct = ctRaw === 'survey' ? 'survey_instalasi' : ctRaw === 'performa' ? 'kinerja_ac' : ctRaw

          const description =
            ct === 'survey_instalasi'
              ? 'Jasa Pengecekan Survey Instalasi'
              : ct === 'kinerja_ac'
              ? 'Jasa Pengecekan Kinerja AC'
              : ct === 'kinerja_coldstorage'
              ? 'Jasa Pengecekan Kinerja Coldstorage'
              : ct === 'lain'
              ? 'Jasa Pengecekan (Lain-lain)'
              : 'Jasa Pengecekan'

          const qty = (ct === 'kinerja_ac' || ct === 'kinerja_coldstorage') && Array.isArray(wl?.ac_units_data)
            ? wl.ac_units_data.length
            : 1

          generated.push({ id: 'svc-pengecekan', description, quantity: qty || 1, unit: 'Unit', unitPrice: 0, discountPercent: 0, taxPercent: 0 })
        } else {
          // Fallback
          generated.push({
            id: 'svc-default',
            description: orderRes.data?.service_title || 'Jasa Service',
            quantity: 1,
            unit: 'Pekerjaan',
            unitPrice: 0,
            discountPercent: 0,
            taxPercent: 0,
          })
        }

        for (const sp of sparepartsRows) {
          generated.push({
            id: `sp-${sp.sparepart_name}`,
            description: sp.sparepart_name,
            quantity: Number(sp.quantity || 1),
            unit: sp.unit || 'Unit',
            unitPrice: 0,
            discountPercent: 0,
            taxPercent: 0,
          })
        }

        setItems(generated)

        // defaults
        setDueMode('14')
        setDueDate(addDaysFromISO(issueDate, 14))

        // Default invoice number suggestion (INV/00001 style based on count)
        const countRes = await supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)

        const next = (countRes.count ?? 0) + 1
        setInvoiceNumber(`INV/${String(next).padStart(5, '0')}`)
      } catch (e: any) {
        console.error('InvoiceFromOrderDialog load error:', e)
        toast.error(e?.message || 'Gagal memuat data invoice')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [open, orderId, tenantId, supabase])

  // Due date auto-fill based on mode
  useEffect(() => {
    if (!open) return
    if (dueMode === 'custom') return
    const days = dueMode === '7' ? 7 : dueMode === '14' ? 14 : 30
    const next = addDaysFromISO(issueDate, days)
    if (next) setDueDate(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueMode, issueDate, open])

  // Apply PPN toggle globally to item taxPercent
  useEffect(() => {
    if (!open) return
    if (!ppnEnabled) {
      setItems((prev) => prev.map((it) => ({ ...it, taxPercent: 0 })))
      return
    }
    setItems((prev) => prev.map((it) => ({ ...it, taxPercent: safeNumber(ppnPercent) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ppnEnabled, ppnPercent, open])

  // Hide disc inputs by forcing discountPercent=0 when disabled
  useEffect(() => {
    if (!open) return
    if (discEnabled) return
    setItems((prev) => prev.map((it) => ({ ...it, discountPercent: 0 })))
  }, [discEnabled, open])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateItem = (id: string, patch: Partial<InvoiceDraftItem>) => {
    resetPreview()
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const addItemRow = () => {
    resetPreview()
    setItems((prev) => [...prev, newItem()])
  }

  const deleteItemRow = (id: string) => {
    resetPreview()
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const buildPdf = async () => {
    if (!order?.clients) throw new Error('Client tidak ditemukan')

    const blob = await generateInvoicePdfBlob({
      invoiceNumber: invoiceNumber || '-',
      issueDate,
      dueDate: dueDate || null,
      billTo: {
        name: order.clients.name || '—',
        address: order.location_address || order.clients.address || undefined,
        phone: order.clients.phone || undefined,
      },
      company: {
        name: 'PT. Djawara Tiga Gunung',
        addressLines: ['Jl. Raya Susukan Desa Karangjati Rt 02 Rw 02', 'Kec. Susukan Kab. Banjarnegara'],
        phone: '082242638999',
        email: 'pt.djawara3@gmail.com',
        paymentLines: [
          'Pembayaran Transfer Via',
          'BNI - IDR : 154 061 5648',
          'A / N Djawara Tiga Gunung',
          'Lampirkan bukti pembayaran melalui email',
          'pt.djawara3@gmail.com',
          'whatsapp 0822 9899 9736 / 0822 4263 8999',
        ],
        signName: 'PT. Djawara Tiga Gunung',
        signTitle: 'Jabatan',
      },
      items: items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        discountPercent: discEnabled ? it.discountPercent : 0,
        taxPercent: ppnEnabled ? safeNumber(ppnPercent) : 0,
      })),
      ppnEnabled,
      ppnPercent,
      pphEnabled,
      pphPercent,
      dpEnabled,
      dpAmount,
    })

    return blob
  }

  const handlePreview = async () => {
    try {
      const blob = await buildPdf()
      setPreviewBlob(blob)

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (e: any) {
      console.error('preview error:', e)
      toast.error(e?.message || 'Gagal membuat preview invoice')
    }
  }

  const handleSave = async () => {
    if (!order?.clients) {
      toast.error('Client tidak ditemukan')
      return
    }
    if (!invoiceNumber.trim()) {
      toast.error('Nomor invoice wajib diisi')
      return
    }

    setSaving(true)
    try {
      const amountTotal = payable

      // Upsert invoice
      if (!invoiceId) {
        let ins = await supabase
          .from('invoices')
          .insert({
            tenant_id: tenantId,
            invoice_number: invoiceNumber.trim(),
            status: 'unpaid',
            service_order_id: orderId,
            client_id: order.clients.id,
            client_name: order.clients.name || 'N/A',
            client_email: order.clients.email || null,
            client_phone: order.clients.phone || null,
            client_address: order.location_address || order.clients.address || null,
            issue_date: issueDate,
            due_date: dueDate || null,
            amount_total: amountTotal,
            ppn_enabled: ppnEnabled,
            ppn_percent: safeNumber(ppnPercent) || 0,
            pph_enabled: pphEnabled,
            pph_percent: safeNumber(pphPercent) || 0,
            dp_enabled: dpEnabled,
            dp_amount: safeNumber(dpAmount) || 0,
            notes: null,
          })
          .select('id')
          .single()

        if (ins.error) {
          // Fallback if adjustment columns not yet added
          ins = await supabase
            .from('invoices')
            .insert({
              tenant_id: tenantId,
              invoice_number: invoiceNumber.trim(),
              status: 'unpaid',
              service_order_id: orderId,
              client_id: order.clients.id,
              client_name: order.clients.name || 'N/A',
              client_email: order.clients.email || null,
              client_phone: order.clients.phone || null,
              client_address: order.location_address || order.clients.address || null,
              issue_date: issueDate,
              due_date: dueDate || null,
              amount_total: amountTotal,
              notes: null,
            })
            .select('id')
            .single()
        }

        if (ins.error) throw ins.error
        setInvoiceId(ins.data.id)

        // Insert items
        const itemRows = items.map((it) => ({
          tenant_id: tenantId,
          invoice_id: ins.data.id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unitPrice,
          discount_percent: discEnabled ? it.discountPercent : 0,
          tax_percent: ppnEnabled ? safeNumber(ppnPercent) : 0,
          line_total: calcLineTotal({
            ...it,
            discountPercent: discEnabled ? it.discountPercent : 0,
            taxPercent: ppnEnabled ? safeNumber(ppnPercent) : 0,
          }),
        }))

        const itemsIns = await supabase.from('invoice_items').insert(itemRows)
        if (itemsIns.error) throw itemsIns.error
      } else {
        let upd = await supabase
          .from('invoices')
          .update({
            invoice_number: invoiceNumber.trim(),
            issue_date: issueDate,
            due_date: dueDate || null,
            amount_total: amountTotal,
            ppn_enabled: ppnEnabled,
            ppn_percent: safeNumber(ppnPercent) || 0,
            pph_enabled: pphEnabled,
            pph_percent: safeNumber(pphPercent) || 0,
            dp_enabled: dpEnabled,
            dp_amount: safeNumber(dpAmount) || 0,
          })
          .eq('tenant_id', tenantId)
          .eq('id', invoiceId)

        if (upd.error) {
          upd = await supabase
            .from('invoices')
            .update({
              invoice_number: invoiceNumber.trim(),
              issue_date: issueDate,
              due_date: dueDate || null,
              amount_total: amountTotal,
            })
            .eq('tenant_id', tenantId)
            .eq('id', invoiceId)
        }

        if (upd.error) throw upd.error

        // Replace items (simplest)
        await supabase.from('invoice_items').delete().eq('tenant_id', tenantId).eq('invoice_id', invoiceId)

        const itemRows = items.map((it) => ({
          tenant_id: tenantId,
          invoice_id: invoiceId,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unitPrice,
          discount_percent: discEnabled ? it.discountPercent : 0,
          tax_percent: ppnEnabled ? safeNumber(ppnPercent) : 0,
          line_total: calcLineTotal({
            ...it,
            discountPercent: discEnabled ? it.discountPercent : 0,
            taxPercent: ppnEnabled ? safeNumber(ppnPercent) : 0,
          }),
        }))
        const itemsIns = await supabase.from('invoice_items').insert(itemRows)
        if (itemsIns.error) throw itemsIns.error
      }

      toast.success('Invoice tersimpan')
      onDone?.()
    } catch (e: any) {
      console.error('save invoice error:', e)
      toast.error(e?.message || 'Gagal menyimpan invoice')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    try {
      const blob = previewBlob || (await buildPdf())
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber || 'invoice'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Invoice diunduh')
    } catch (e: any) {
      console.error('download error:', e)
      toast.error(e?.message || 'Gagal download invoice')
    }
  }

  const handleSendToClientDocs = async () => {
    try {
      if (!order?.clients) throw new Error('Client tidak ditemukan')
      if (!invoiceId) {
        toast.error('Simpan invoice dulu sebelum kirim ke dokumen client')
        return
      }

      const blob = previewBlob || (await buildPdf())
      const fileName = `${order.clients.id}/invoices/${invoiceNumber || invoiceId}.pdf`

      const file = await blobToFile(blob, `${invoiceNumber || invoiceId}.pdf`)
      const up = await supabase.storage
        .from('client-documents')
        .upload(fileName, file, { upsert: true, contentType: 'application/pdf' })

      if (up.error) throw up.error

      const { data: { user } } = await supabase.auth.getUser()

      // Upsert metadata row
      const existing = await supabase
        .from('client_documents')
        .select('id')
        .eq('client_id', order.clients.id)
        .eq('related_order_id', orderId)
        .eq('document_type', 'invoice')
        .maybeSingle()

      if (existing.error) throw existing.error

      if (existing.data?.id) {
        const upd = await supabase
          .from('client_documents')
          .update({
            document_name: `Invoice - ${order.order_number}`,
            file_path: fileName,
            file_size: file.size,
            file_type: 'application/pdf',
            document_number: invoiceNumber,
            document_date: issueDate,
            status: 'active',
            updated_by: user?.id || null,
          })
          .eq('id', existing.data.id)

        if (upd.error) throw upd.error
      } else {
        const ins = await supabase
          .from('client_documents')
          .insert({
            client_id: order.clients.id,
            tenant_id: tenantId,
            document_name: `Invoice - ${order.order_number}`,
            document_type: 'invoice',
            file_path: fileName,
            file_size: file.size,
            file_type: 'application/pdf',
            document_number: invoiceNumber,
            document_date: issueDate,
            related_order_id: orderId,
            status: 'active',
            uploaded_by: user?.id,
          })

        if (ins.error) throw ins.error
      }

      toast.success('Invoice terkirim ke dokumen client')
    } catch (e: any) {
      console.error('send to docs error:', e)
      toast.error(e?.message || 'Gagal kirim invoice ke dokumen client')
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Buat Invoice dari Service Order</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat data…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nomor Invoice</Label>
                  <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={issueDate} onChange={(e) => { resetPreview(); setIssueDate(e.target.value) }} />
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={dueMode}
                      onChange={(e) => { resetPreview(); setDueMode(e.target.value as any) }}
                    >
                      <option value="7">7 hari</option>
                      <option value="14">14 hari</option>
                      <option value="30">30 hari</option>
                      <option value="custom">Custom</option>
                    </select>
                    <Input
                      type="date"
                      value={dueDate}
                      disabled={dueMode !== 'custom'}
                      onChange={(e) => { resetPreview(); setDueDate(e.target.value) }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-end">
                <div className="flex items-center gap-2">
                  <Checkbox checked={discEnabled} onCheckedChange={(v) => { resetPreview(); setDiscEnabled(Boolean(v)) }} />
                  <Label className="cursor-pointer">Disc</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={ppnEnabled} onCheckedChange={(v) => { resetPreview(); setPpnEnabled(Boolean(v)) }} />
                  <Label className="cursor-pointer">PPN</Label>
                  <Input
                    className="w-[90px]"
                    inputMode="numeric"
                    disabled={!ppnEnabled}
                    value={String(ppnPercent)}
                    onChange={(e) => { resetPreview(); setPpnPercent(safeNumber(e.target.value)) }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={pphEnabled} onCheckedChange={(v) => { resetPreview(); setPphEnabled(Boolean(v)) }} />
                  <Label className="cursor-pointer">PPh</Label>
                  <Input
                    className="w-[90px]"
                    inputMode="numeric"
                    disabled={!pphEnabled}
                    value={String(pphPercent)}
                    onChange={(e) => { resetPreview(); setPphPercent(safeNumber(e.target.value)) }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox checked={dpEnabled} onCheckedChange={(v) => { resetPreview(); setDpEnabled(Boolean(v)) }} />
                  <Label className="cursor-pointer">DP</Label>
                  <Input
                    className="w-[160px]"
                    inputMode="numeric"
                    disabled={!dpEnabled}
                    value={String(dpAmount)}
                    onChange={(e) => { resetPreview(); setDpAmount(safeNumber(e.target.value)) }}
                    placeholder="0"
                  />
                </div>

                <div className="ml-auto">
                  <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Baris
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Order: <span className="font-medium text-foreground">{order?.order_number}</span> • Client:{' '}
                <span className="font-medium text-foreground">{order?.clients?.name || '—'}</span>
                {workLog?.work_type ? (
                  <> • Sumber: laporan teknisi ({workLog.work_type})</>
                ) : (
                  <> • Sumber: data order</>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="w-[110px]">Qty</TableHead>
                      <TableHead className="w-[110px]">Satuan</TableHead>
                      {discEnabled ? <TableHead className="w-[110px]">Disc (%)</TableHead> : null}
                      <TableHead className="w-[160px]">Harga / Unit</TableHead>
                      <TableHead className="w-[160px] text-right">Jumlah</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Input value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            value={String(it.quantity)}
                            onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value || 0) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
                        </TableCell>
                        {discEnabled ? (
                          <TableCell>
                            <Input
                              inputMode="numeric"
                              value={String(it.discountPercent)}
                              onChange={(e) => updateItem(it.id, { discountPercent: Number(e.target.value || 0) })}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={String(it.unitPrice)}
                            onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value || 0) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(calcLineTotal({
                            ...it,
                            discountPercent: discEnabled ? it.discountPercent : 0,
                            taxPercent: ppnEnabled ? safeNumber(ppnPercent) : 0,
                          }))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteItemRow(it.id)}
                            aria-label="Hapus baris"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end text-sm">
                <div className="space-y-1 text-right">
                  <div>Subtotal: <span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  {discEnabled ? <div>Diskon: <span className="font-medium">{formatCurrency(discountTotal)}</span></div> : null}
                  {ppnEnabled || pphEnabled ? <div>DPP: <span className="font-medium">{formatCurrency(dpp)}</span></div> : null}
                  {ppnEnabled ? <div>PPN ({ppnPercent}%): <span className="font-medium">{formatCurrency(dpp * (safeNumber(ppnPercent) / 100))}</span></div> : null}
                  {pphEnabled ? <div>PPh ({pphPercent}%): <span className="font-medium">- {formatCurrency(pphAmount)}</span></div> : null}
                  <div>Total: <span className="font-medium">{formatCurrency(payable)}</span></div>
                  {dpEnabled ? <div>DP: <span className="font-medium">- {formatCurrency(safeNumber(dpAmount))}</span></div> : null}
                  {dpEnabled ? <div>Sisa Tagihan: <span className="font-medium">{formatCurrency(sisaTagihan)}</span></div> : null}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={loading}>
              Cetak / Preview
            </Button>
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Print Preview Invoice</DialogTitle>
          </DialogHeader>

          <div className="flex-1 h-[75vh] rounded-md border overflow-hidden">
            {previewUrl ? (
              <iframe title="invoice-preview" src={previewUrl} className="w-full h-full" />
            ) : (
              <div className="text-sm text-muted-foreground p-4">Membuat preview…</div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDownload}>
              Download
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              Simpan
            </Button>
            <Button onClick={handleSendToClientDocs}>
              Kirim ke Dokumen Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
