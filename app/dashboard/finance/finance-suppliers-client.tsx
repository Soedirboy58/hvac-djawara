'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, RefreshCw } from 'lucide-react'

type Supplier = {
  id: string
  tenant_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
}

type ExpenseCategory = {
  id: string
  name: string
  activity: 'operational' | 'financing' | 'investing'
  is_active: boolean
}

type SupplierBill = {
  id: string
  supplier_id: string
  bill_number: string | null
  bill_date: string
  due_date: string | null
  total_amount: number
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled'
  notes: string | null
  suppliers?: { name: string } | Array<{ name: string }> | null
}

type SupplierPayment = {
  id: string
  supplier_bill_id: string
  supplier_id: string
  amount: number
  paid_date: string
  expense_category_id: string | null
  notes: string | null
}

type SupplierProduct = {
  id: string
  supplier_id: string
  product_name: string
  sku: string | null
  unit: string | null
  price: number
  is_active: boolean
  suppliers?: { name: string } | Array<{ name: string }> | null
}

const pickFirst = <T,>(v: T | T[] | null | undefined): T | null => {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  )

export function FinanceSuppliersClient({ tenantId }: { tenantId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [setupMissing, setSetupMissing] = useState<string | null>(null)
  const [tab, setTab] = useState<'suppliers' | 'bills' | 'products'>('suppliers')

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)

  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [newSupplierEmail, setNewSupplierEmail] = useState('')
  const [newSupplierAddress, setNewSupplierAddress] = useState('')
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])

  const [bills, setBills] = useState<SupplierBill[]>([])
  const [loadingBills, setLoadingBills] = useState(false)

  const [billSupplierId, setBillSupplierId] = useState('')
  const [billNumber, setBillNumber] = useState('')
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [billDueDate, setBillDueDate] = useState('')
  const [billTotalAmount, setBillTotalAmount] = useState('')
  const [billNotes, setBillNotes] = useState('')
  const [creatingBill, setCreatingBill] = useState(false)

  const [payments, setPayments] = useState<SupplierPayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  const [paymentBillId, setPaymentBillId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [paymentExpenseCategoryId, setPaymentExpenseCategoryId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [creatingPayment, setCreatingPayment] = useState(false)

  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [productSupplierId, setProductSupplierId] = useState('')
  const [productName, setProductName] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productUnit, setProductUnit] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [creatingProduct, setCreatingProduct] = useState(false)

  const probeSetup = async (): Promise<boolean> => {
    try {
      const res = await supabase.from('suppliers').select('id').eq('tenant_id', tenantId).limit(1)
      if (res.error) throw res.error
      setSetupMissing(null)
      return true
    } catch (e: any) {
      console.warn('supplier module probe error:', e)
      setSetupMissing(e?.message || 'Supplier module belum di-setup')
      return false
    }
  }

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true)
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, tenant_id, name, phone, email, address, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setSuppliers((data || []) as Supplier[])
    } catch (e: any) {
      console.error('fetchSuppliers error:', e)
      toast.error(e?.message || 'Gagal memuat suppliers')
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const fetchExpenseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name, activity, is_active')
        .eq('tenant_id', tenantId)
        .eq('activity', 'operational')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setExpenseCategories((data || []) as ExpenseCategory[])
    } catch {
      // ignore; supplier payments can still be saved without category
    }
  }

  const fetchBills = async () => {
    setLoadingBills(true)
    try {
      const { data, error } = await supabase
        .from('supplier_bills')
        .select('id, supplier_id, bill_number, bill_date, due_date, total_amount, status, notes, suppliers(name)')
        .eq('tenant_id', tenantId)
        .order('bill_date', { ascending: false })
        .limit(50)

      if (error) throw error
      setBills((data || []) as SupplierBill[])
    } catch (e: any) {
      console.error('fetchBills error:', e)
      toast.error(e?.message || 'Gagal memuat supplier bills')
    } finally {
      setLoadingBills(false)
    }
  }

  const fetchPayments = async () => {
    setLoadingPayments(true)
    try {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select('id, supplier_bill_id, supplier_id, amount, paid_date, expense_category_id, notes')
        .eq('tenant_id', tenantId)
        .order('paid_date', { ascending: false })
        .limit(50)

      if (error) throw error
      setPayments((data || []) as SupplierPayment[])
    } catch (e: any) {
      console.error('fetchPayments error:', e)
      toast.error(e?.message || 'Gagal memuat supplier payments')
    } finally {
      setLoadingPayments(false)
    }
  }

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select('id, supplier_id, product_name, sku, unit, price, is_active, suppliers(name)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('product_name', { ascending: true })
        .limit(100)

      if (error) throw error
      setProducts((data || []) as SupplierProduct[])
    } catch (e: any) {
      console.error('fetchProducts error:', e)
      toast.error(e?.message || 'Gagal memuat supplier products')
    } finally {
      setLoadingProducts(false)
    }
  }

  const refreshAll = async () => {
    const ok = await probeSetup()
    if (!ok) return
    await Promise.all([fetchSuppliers(), fetchExpenseCategories(), fetchBills(), fetchPayments(), fetchProducts()])
  }

  useEffect(() => {
    void (async () => {
      try {
        const ok = await probeSetup()
        if (!ok) return
        await Promise.all([fetchSuppliers(), fetchExpenseCategories(), fetchBills(), fetchPayments(), fetchProducts()])
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  const createSupplier = async () => {
    const name = newSupplierName.trim()
    if (!name) {
      toast.error('Nama supplier wajib diisi')
      return
    }

    setCreatingSupplier(true)
    try {
      const { error } = await supabase.from('suppliers').insert({
        tenant_id: tenantId,
        name,
        phone: newSupplierPhone.trim() || null,
        email: newSupplierEmail.trim() || null,
        address: newSupplierAddress.trim() || null,
        is_active: true,
      })

      if (error) throw error
      toast.success('Supplier berhasil dibuat')
      setNewSupplierName('')
      setNewSupplierPhone('')
      setNewSupplierEmail('')
      setNewSupplierAddress('')
      await fetchSuppliers()
    } catch (e: any) {
      console.error('createSupplier error:', e)
      toast.error(e?.message || 'Gagal membuat supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  const createBill = async () => {
    if (!billSupplierId) {
      toast.error('Pilih supplier terlebih dulu')
      return
    }

    const amount = Number(String(billTotalAmount || '').replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Total tagihan tidak valid')
      return
    }

    setCreatingBill(true)
    try {
      const { error } = await supabase.from('supplier_bills').insert({
        tenant_id: tenantId,
        supplier_id: billSupplierId,
        bill_number: billNumber.trim() || null,
        bill_date: billDate,
        due_date: billDueDate || null,
        total_amount: amount,
        status: 'unpaid',
        notes: billNotes.trim() || null,
      })

      if (error) throw error
      toast.success('Tagihan supplier berhasil dibuat (utang)')
      setBillSupplierId('')
      setBillNumber('')
      setBillDueDate('')
      setBillTotalAmount('')
      setBillNotes('')
      await fetchBills()
    } catch (e: any) {
      console.error('createBill error:', e)
      toast.error(e?.message || 'Gagal membuat tagihan')
    } finally {
      setCreatingBill(false)
    }
  }

  const createPayment = async () => {
    if (!paymentBillId) {
      toast.error('Pilih tagihan terlebih dulu')
      return
    }

    const bill = bills.find((b) => b.id === paymentBillId)
    if (!bill) {
      toast.error('Bill tidak ditemukan. Silakan refresh data.')
      return
    }

    const amount = Number(String(paymentAmount || '').replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Nominal pembayaran tidak valid')
      return
    }

    setCreatingPayment(true)
    try {
      const { error } = await supabase.from('supplier_payments').insert({
        tenant_id: tenantId,
        supplier_bill_id: paymentBillId,
        supplier_id: bill.supplier_id,
        amount,
        paid_date: paymentDate,
        expense_category_id: paymentExpenseCategoryId || null,
        notes: paymentNotes.trim() || null,
      })

      if (error) throw error
      toast.success('Pembayaran tercatat')
      setPaymentBillId('')
      setPaymentAmount('')
      setPaymentExpenseCategoryId('')
      setPaymentNotes('')
      await Promise.all([fetchBills(), fetchPayments()])
    } catch (e: any) {
      console.error('createPayment error:', e)
      toast.error(e?.message || 'Gagal mencatat pembayaran')
    } finally {
      setCreatingPayment(false)
    }
  }

  const createProduct = async () => {
    if (!productSupplierId) {
      toast.error('Pilih supplier terlebih dulu')
      return
    }
    const name = productName.trim()
    if (!name) {
      toast.error('Nama produk wajib diisi')
      return
    }

    const price = Number(String(productPrice || '').replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Harga tidak valid')
      return
    }

    setCreatingProduct(true)
    try {
      const { error } = await supabase.from('supplier_products').insert({
        tenant_id: tenantId,
        supplier_id: productSupplierId,
        product_name: name,
        sku: productSku.trim() || null,
        unit: productUnit.trim() || null,
        price,
        is_active: true,
      })

      if (error) throw error
      toast.success('Produk supplier tersimpan')
      setProductSupplierId('')
      setProductName('')
      setProductSku('')
      setProductUnit('')
      setProductPrice('')
      await fetchProducts()
    } catch (e: any) {
      console.error('createProduct error:', e)
      toast.error(e?.message || 'Gagal menyimpan produk supplier')
    } finally {
      setCreatingProduct(false)
    }
  }

  if (setupMissing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier</CardTitle>
          <CardDescription>
            Modul supplier belum aktif di database. Jalankan migration SQL dulu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Error probe: {setupMissing}</p>
          <p className="text-sm text-muted-foreground">
            File SQL: <span className="font-mono">supabase/migrations/20260105_002_supplier_module.sql</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  const billPaidById = useMemo(() => {
    const paid = new Map<string, number>()
    for (const p of payments) {
      paid.set(p.supplier_bill_id, (paid.get(p.supplier_bill_id) || 0) + (p.amount || 0))
    }
    return paid
  }, [payments])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={refreshAll} disabled={loadingSuppliers || loadingBills || loadingPayments || loadingProducts}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="bills">Utang (Bills)</TabsTrigger>
          <TabsTrigger value="products">Harga Produk</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Supplier</CardTitle>
              <CardDescription>
                Data supplier dipakai untuk tracking total transaksi, utang (tagihan), dan komparasi harga produk.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nama Supplier *</Label>
                  <Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="Contoh: CV Sumber Jaya" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} placeholder="08..." />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={newSupplierEmail} onChange={(e) => setNewSupplierEmail(e.target.value)} placeholder="opsional" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Alamat</Label>
                  <Textarea value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} rows={2} placeholder="opsional" />
                </div>
              </div>

              <Button onClick={createSupplier} disabled={creatingSupplier}>
                {creatingSupplier && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Supplier
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Supplier</CardTitle>
              <CardDescription>Supplier aktif</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSuppliers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Alamat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.phone || '-'}</TableCell>
                          <TableCell>{s.email || '-'}</TableCell>
                          <TableCell className="max-w-[420px] truncate">{s.address || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {!suppliers.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-sm text-muted-foreground">
                            Belum ada supplier.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Utang (Tagihan Supplier)</CardTitle>
              <CardDescription>
                Buat bill/tagihan dari supplier untuk tracking utang. Pembayaran dapat dicicil.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={billSupplierId} onValueChange={setBillSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>No. Tagihan (optional)</Label>
                  <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="INV/SUP/001" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Tagihan</Label>
                  <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jatuh Tempo (optional)</Label>
                  <Input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Total Tagihan *</Label>
                  <Input value={billTotalAmount} onChange={(e) => setBillTotalAmount(e.target.value)} placeholder="Contoh: 2500000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Catatan (optional)</Label>
                  <Textarea value={billNotes} onChange={(e) => setBillNotes(e.target.value)} rows={2} placeholder="Contoh: Pembelian sparepart" />
                </div>
              </div>

              <Button onClick={createBill} disabled={creatingBill}>
                {creatingBill && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Tagihan (Utang)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Input Pembayaran Supplier</CardTitle>
              <CardDescription>
                Catat pembayaran untuk bill tertentu. Jika memilih kategori expense, pembayaran otomatis masuk ke Expense Operasional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Tagihan *</Label>
                  <Select value={paymentBillId} onValueChange={setPaymentBillId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bill/tagihan" />
                    </SelectTrigger>
                    <SelectContent>
                      {bills.map((b) => {
                        const name = pickFirst(b.suppliers)?.name || 'Supplier'
                        return (
                          <SelectItem key={b.id} value={b.id}>
                            {name} • {b.bill_number || b.id.slice(0, 8)} • {currency(b.total_amount)} • {b.status}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Bayar</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nominal *</Label>
                  <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Contoh: 500000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Kategori Expense (Operasional) (optional)</Label>
                  <Select value={paymentExpenseCategoryId} onValueChange={setPaymentExpenseCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori untuk cashflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Catatan (optional)</Label>
                  <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} placeholder="Contoh: Transfer BCA" />
                </div>
              </div>

              <Button onClick={createPayment} disabled={creatingPayment}>
                {creatingPayment && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Pembayaran
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Utang (Bills)</CardTitle>
              <CardDescription>Menampilkan 50 data terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBills ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>No. Tagihan</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Terbayar</TableHead>
                        <TableHead className="text-right">Sisa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((b) => {
                        const name = pickFirst(b.suppliers)?.name || '-'
                        const paid = billPaidById.get(b.id) || 0
                        const remaining = Math.max(0, (b.total_amount || 0) - paid)
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell>{b.bill_number || '-'}</TableCell>
                            <TableCell>{b.bill_date}</TableCell>
                            <TableCell>{b.due_date || '-'}</TableCell>
                            <TableCell className="capitalize">{b.status}</TableCell>
                            <TableCell className="text-right">{currency(b.total_amount)}</TableCell>
                            <TableCell className="text-right">{currency(paid)}</TableCell>
                            <TableCell className="text-right">{currency(remaining)}</TableCell>
                          </TableRow>
                        )
                      })}
                      {!bills.length && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-sm text-muted-foreground">
                            Belum ada bill.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran</CardTitle>
              <CardDescription>Menampilkan 50 data terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Bill</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Kategori Expense</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.paid_date}</TableCell>
                          <TableCell className="font-mono text-xs">{p.supplier_bill_id.slice(0, 8)}</TableCell>
                          <TableCell className="text-right">{currency(p.amount)}</TableCell>
                          <TableCell>{expenseCategories.find((c) => c.id === p.expense_category_id)?.name || '-'}</TableCell>
                          <TableCell className="max-w-[420px] truncate">{p.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {!payments.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-sm text-muted-foreground">
                            Belum ada pembayaran.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Harga Produk Supplier</CardTitle>
              <CardDescription>
                Isi daftar harga untuk komparasi harga produk antar supplier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={productSupplierId} onValueChange={setProductSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nama Produk *</Label>
                  <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: Freon R32 1kg" />
                </div>
                <div className="space-y-2">
                  <Label>SKU (optional)</Label>
                  <Input value={productSku} onChange={(e) => setProductSku(e.target.value)} placeholder="opsional" />
                </div>
                <div className="space-y-2">
                  <Label>Satuan (optional)</Label>
                  <Input value={productUnit} onChange={(e) => setProductUnit(e.target.value)} placeholder="pcs / unit / kg" />
                </div>
                <div className="space-y-2">
                  <Label>Harga</Label>
                  <Input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Contoh: 125000" />
                </div>
              </div>

              <Button onClick={createProduct} disabled={creatingProduct}>
                {creatingProduct && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Produk
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Harga Produk</CardTitle>
              <CardDescription>Menampilkan 100 data</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => {
                        const name = pickFirst(p.suppliers)?.name || '-'
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.product_name}</TableCell>
                            <TableCell>{name}</TableCell>
                            <TableCell>{p.sku || '-'}</TableCell>
                            <TableCell>{p.unit || '-'}</TableCell>
                            <TableCell className="text-right">{currency(p.price)}</TableCell>
                          </TableRow>
                        )
                      })}
                      {!products.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-sm text-muted-foreground">
                            Belum ada produk.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Catatan</CardTitle>
          <CardDescription>
            Setelah modul ini aktif, kamu bisa lihat:
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Total transaksi per supplier = total pembayaran (cash basis)</p>
          <p>• Utang supplier = total bill - total pembayaran</p>
          <p>• Komparasi harga produk = filter/urutkan berdasarkan harga (lanjutan)</p>
        </CardContent>
      </Card>
    </div>
  )
}
