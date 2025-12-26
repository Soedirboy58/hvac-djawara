'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    })
  }

  return items
}

function itemsTotal(items: InvoiceDraftItem[]) {
  return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
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

  const [items, setItems] = useState<InvoiceDraftItem[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const total = itemsTotal(items)

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
        const existing = await supabase
          .from('invoices')
          .select('id, invoice_number, issue_date, due_date, status, client_id, client_name, client_phone, client_address, amount_total')
          .eq('tenant_id', tenantId)
          .eq('service_order_id', orderId)
          .maybeSingle()

        if (existing.error) throw existing.error

        if (existing.data) {
          const inv = existing.data as ExistingInvoice
          setInvoiceId(inv.id)
          setInvoiceNumber(inv.invoice_number)
          setIssueDate(inv.issue_date)
          setDueDate(inv.due_date || '')

          // Try load invoice items (if schema already applied)
          const itemsRes = await supabase
            .from('invoice_items')
            .select('id, description, quantity, unit, unit_price')
            .eq('tenant_id', tenantId)
            .eq('invoice_id', inv.id)
            .order('created_at', { ascending: true })

          if (!itemsRes.error && itemsRes.data) {
            setItems(
              (itemsRes.data as any[]).map((r) => ({
                id: r.id,
                description: r.description,
                quantity: Number(r.quantity || 0),
                unit: r.unit || 'Unit',
                unitPrice: Number(r.unit_price || 0),
              }))
            )
          }
          return
        }

        // 3) No existing invoice: build from technical report + spareparts
        const workLogRes = await supabase
          .from('technician_work_logs')
          .select('id, work_type, completed_at, maintenance_units_data, ac_units_data')
          .eq('service_order_id', orderId)
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
          generated.push({ id: 'svc-troubleshooting', description: 'Jasa Troubleshooting AC', quantity: qty || 1, unit: 'Unit', unitPrice: 0 })
        } else if (wt === 'pengecekan') {
          const qty = Array.isArray(wl?.ac_units_data) ? wl.ac_units_data.length : 1
          generated.push({ id: 'svc-pengecekan', description: 'Jasa Pengecekan AC', quantity: qty || 1, unit: 'Unit', unitPrice: 0 })
        } else {
          // Fallback
          generated.push({
            id: 'svc-default',
            description: orderRes.data?.service_title || 'Jasa Service',
            quantity: 1,
            unit: 'Pekerjaan',
            unitPrice: 0,
          })
        }

        for (const sp of sparepartsRows) {
          generated.push({
            id: `sp-${sp.sparepart_name}`,
            description: sp.sparepart_name,
            quantity: Number(sp.quantity || 1),
            unit: sp.unit || 'Unit',
            unitPrice: 0,
          })
        }

        setItems(generated)

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateItem = (id: string, patch: Partial<InvoiceDraftItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
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
      })),
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
      const amountTotal = itemsTotal(items)

      // Upsert invoice
      if (!invoiceId) {
        const ins = await supabase
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
          line_total: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
        }))

        const itemsIns = await supabase.from('invoice_items').insert(itemRows)
        if (itemsIns.error) throw itemsIns.error
      } else {
        const upd = await supabase
          .from('invoices')
          .update({
            invoice_number: invoiceNumber.trim(),
            issue_date: issueDate,
            due_date: dueDate || null,
            amount_total: amountTotal,
          })
          .eq('tenant_id', tenantId)
          .eq('id', invoiceId)

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
          line_total: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
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
                  <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
                      <TableHead className="w-[160px]">Harga / Unit</TableHead>
                      <TableHead className="w-[160px] text-right">Jumlah</TableHead>
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
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            placeholder="0"
                            value={String(it.unitPrice)}
                            onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value || 0) })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end text-sm">
                <div className="font-medium">Total: {formatCurrency(total)}</div>
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
