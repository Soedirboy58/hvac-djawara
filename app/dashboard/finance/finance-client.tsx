'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FinanceReimburseClient } from './finance-reimburse-client'
import { FinanceInvoiceClient } from './finance-invoice-client'
import { FinanceExpenseClient } from './finance-expense-client'
import { FinanceSuppliersClient } from './finance-suppliers-client'
import { FinanceReferralInvoicesClient } from './finance-referral-invoices-client'
import { FinanceWeeklyRecapClient } from './finance-weekly-recap-client'

function FinanceExpensePlaceholder() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Expense</CardTitle>
          <CardDescription>
            Tampilan awal kategori pengeluaran (belum terhubung ke konfigurasi/data).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="font-medium">Pengeluaran Operasional</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Belanja stok habis pakai (chemicals, tape, kabel kecil, dll.)</li>
              <li>BBM/parkir/tol operasional (motor/mobil)</li>
              <li>Uang makan harian tim lapangan</li>
              <li>Upah kerja mingguan/harian (non-payroll)</li>
              <li>Service kendaraan operasional (oli, ban, sparepart)</li>
              <li>Beban perusahaan (listrik, air, internet, sewa, kebersihan)</li>
              <li>Biaya administrasi (ATK, materai, ongkir, biaya platform)</li>
              <li>Perawatan/kalibrasi alat kerja dan alat ukur</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="font-medium">Pengeluaran Aktivitas Pendanaan</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Pembayaran cicilan pokok pinjaman</li>
              <li>Pembayaran bunga pinjaman</li>
              <li>Biaya administrasi bank/biaya transfer terkait pendanaan</li>
              <li>Biaya provisi/fee pembukaan fasilitas pendanaan</li>
              <li>Distribusi/dividen ke pemilik (jika diterapkan)</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="font-medium">Pengeluaran Aktivitas Investasi</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Pembelian aset tetap (alat besar, mesin, kendaraan)</li>
              <li>Renovasi/perbaikan kantor/gudang</li>
              <li>Pembelian perangkat IT (laptop, printer, router)</li>
              <li>Deposit/uang jaminan untuk sewa aset atau proyek</li>
              <li>Pembelian/upgrade tooling jangka panjang</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FinanceIncomePlaceholder() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Income</CardTitle>
          <CardDescription>
            Tampilan awal kategori pemasukan (belum terhubung ke konfigurasi/data).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="font-medium">Income Operasional</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Pendapatan jasa service/perbaikan/pemasangan</li>
              <li>Pendapatan kontrak maintenance (bulanan/tahunan)</li>
              <li>Penjualan sparepart/material (jika dipisah dari jasa)</li>
              <li>Biaya survey/kunjungan (visit fee)</li>
              <li>Biaya administrasi/handling (jika diterapkan)</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="font-medium">Income Aktivitas Pendanaan</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Setoran modal pemilik (capital injection)</li>
              <li>Pinjaman masuk (pencairan kredit/pinjaman)</li>
              <li>Pendanaan investor/partner (jika ada)</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="font-medium">Income Aktivitas Investasi</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Hasil penjualan aset (alat/kendaraan)</li>
              <li>Pendapatan bunga/imbal hasil investasi</li>
              <li>Dividen/hasil bagi investasi</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FinanceReportsPlaceholder({ tenantId }: { tenantId: string }) {
  return <FinanceWeeklyRecapClient tenantId={tenantId} />
}

export function FinanceClient({
  tenantId,
  role,
}: {
  tenantId: string
  role: string | null
}) {
  const canSeeReferralInvoices = useMemo(() => {
    const r = (role || '').toLowerCase()
    return r === 'sales_partner'
  }, [role])

  const canSeeInvoices = useMemo(() => {
    const r = (role || '').toLowerCase()
    return r === 'owner' || r === 'admin_finance'
  }, [role])

  const [tab, setTab] = useState<'reimburse' | 'referral' | 'invoice' | 'expense' | 'supplier' | 'income' | 'reports'>(() => {
    if (canSeeInvoices) return 'invoice'
    if (canSeeReferralInvoices) return 'referral'
    return 'reimburse'
  })

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList>
        <TabsTrigger value="reimburse">Reimburse</TabsTrigger>
        {canSeeReferralInvoices && <TabsTrigger value="referral">Tagihan Referral</TabsTrigger>}
        {canSeeInvoices && <TabsTrigger value="invoice">Invoice</TabsTrigger>}
        {canSeeInvoices && <TabsTrigger value="expense">Expense</TabsTrigger>}
        {canSeeInvoices && <TabsTrigger value="supplier">Supplier</TabsTrigger>}
        {canSeeInvoices && <TabsTrigger value="income">Income</TabsTrigger>}
        {canSeeInvoices && <TabsTrigger value="reports">Laporan</TabsTrigger>}
      </TabsList>

      <TabsContent value="reimburse" className="mt-4">
        <FinanceReimburseClient tenantId={tenantId} />
      </TabsContent>

      {canSeeReferralInvoices && (
        <TabsContent value="referral" className="mt-4">
          <FinanceReferralInvoicesClient tenantId={tenantId} />
        </TabsContent>
      )}

      {canSeeInvoices && (
        <TabsContent value="invoice" className="mt-4">
          <FinanceInvoiceClient tenantId={tenantId} />
        </TabsContent>
      )}

      {canSeeInvoices && (
        <TabsContent value="expense" className="mt-4">
          <FinanceExpenseClient tenantId={tenantId} />
        </TabsContent>
      )}

      {canSeeInvoices && (
        <TabsContent value="supplier" className="mt-4">
          <FinanceSuppliersClient tenantId={tenantId} />
        </TabsContent>
      )}

      {canSeeInvoices && (
        <TabsContent value="income" className="mt-4">
          <FinanceIncomePlaceholder />
        </TabsContent>
      )}

      {canSeeInvoices && (
        <TabsContent value="reports" className="mt-4">
          <FinanceReportsPlaceholder tenantId={tenantId} />
        </TabsContent>
      )}
    </Tabs>
  )
}
