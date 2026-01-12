'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { addDays, format, startOfWeek, subDays } from 'date-fns'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, RefreshCw } from 'lucide-react'

type CompletedOrderRow = {
  id: string
  order_number: string
  service_title: string | null
  completed_at: string | null
  final_amount: number | null
  clients?: { name: string } | Array<{ name: string }> | null
}

type ExpenseTxRow = {
  id: string
  amount: number
  occurred_date: string
  category_id: string
  expense_categories?: { name: string } | Array<{ name: string }> | null
}

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  )

const pickFirst = <T,>(v: T | T[] | null | undefined): T | null => {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function safeNumberFromInput(v: string): number | null {
  const cleaned = (v || '').replace(/[^0-9]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return n
}

export function FinanceWeeklyRecapClient({ tenantId }: { tenantId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [setupMissing, setSetupMissing] = useState<string | null>(null)

  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    // Use local noon to avoid timezone shifting when formatting to yyyy-MM-dd
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  })

  const weekStart = useMemo(() => startOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate])
  const saturday = useMemo(() => addDays(weekStart, 5), [weekStart])
  const cutoffEnd = useMemo(() => {
    // Saturday 16:00 local time (exclusive upper bound)
    const d = new Date(saturday)
    d.setHours(16, 0, 0, 0)
    return d
  }, [saturday])

  const rangeLabel = useMemo(() => {
    const startLabel = format(weekStart, 'dd MMM yyyy')
    const endLabel = format(saturday, 'dd MMM yyyy')
    return `${startLabel} – ${endLabel} (cutoff Sabtu 16:00)`
  }, [weekStart, saturday])

  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [completedOrders, setCompletedOrders] = useState<CompletedOrderRow[]>([])
  const [expenseTx, setExpenseTx] = useState<ExpenseTxRow[]>([])

  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({})
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)

  const incomeTotal = useMemo(() => {
    return completedOrders.reduce((sum, o) => sum + (o.final_amount ?? 0), 0)
  }, [completedOrders])

  const missingCount = useMemo(() => {
    return completedOrders.filter((o) => o.final_amount == null).length
  }, [completedOrders])

  const expenseTotal = useMemo(() => {
    return expenseTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [expenseTx])

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    for (const t of expenseTx) {
      const name = pickFirst(t.expense_categories)?.name || 'Tanpa Kategori'
      const cur = map.get(t.category_id) || { name, total: 0 }
      cur.total += Number(t.amount) || 0
      cur.name = name
      map.set(t.category_id, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [expenseTx])

  const net = useMemo(() => incomeTotal - expenseTotal, [incomeTotal, expenseTotal])

  const fetchAll = async () => {
    setLoading(true)
    try {
      setSetupMissing(null)

      const startIso = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0, 0).toISOString()
      const endIso = cutoffEnd.toISOString()

      // Completed orders within business-week window.
      // NOTE: requires migration 20260110_001_weekly_cashflow_foundation.sql
      const ordersRes = await supabase
        .from('service_orders')
        .select('id, order_number, service_title, completed_at, final_amount, clients(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('completed_at', startIso)
        .lt('completed_at', endIso)
        .order('completed_at', { ascending: false })

      if (ordersRes.error) {
        const msg = (ordersRes.error as any)?.message || String(ordersRes.error)
        if (/column\s+service_orders\.completed_at\s+does not exist/i.test(msg) || /completed_at/i.test(msg)) {
          setSetupMissing(
            'Kolom weekly recap belum ada. Jalankan migrasi: supabase/migrations/20260110_001_weekly_cashflow_foundation.sql'
          )
          setCompletedOrders([])
        } else {
          throw ordersRes.error
        }
      } else {
        setCompletedOrders((ordersRes.data || []) as any)
      }

      // Operational expenses within Mon–Sat date window.
      const startDate = format(weekStart, 'yyyy-MM-dd')
      const endDate = format(saturday, 'yyyy-MM-dd')

      const expRes = await supabase
        .from('expense_transactions')
        .select('id, amount, occurred_date, category_id, expense_categories(name)')
        .eq('tenant_id', tenantId)
        .eq('activity', 'operational')
        .gte('occurred_date', startDate)
        .lte('occurred_date', endDate)
        .order('occurred_date', { ascending: false })

      if (expRes.error) {
        const msg = (expRes.error as any)?.message || String(expRes.error)
        if (/relation\s+"expense_transactions"\s+does not exist/i.test(msg) || /expense_transactions/i.test(msg)) {
          // Expense module might not be applied in some tenants.
          toast.error('Expense module belum terpasang. Jalankan migrasi expense module terlebih dahulu.')
          setExpenseTx([])
        } else {
          throw expRes.error
        }
      } else {
        setExpenseTx((expRes.data || []) as any)
      }

      // Seed editing map for missing amounts
      setEditingAmounts((prev) => {
        const next = { ...prev }
        for (const o of (ordersRes.data || []) as any[]) {
          if (next[o.id] == null) next[o.id] = o.final_amount != null ? String(Math.trunc(Number(o.final_amount) || 0)) : ''
        }
        return next
      })
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Gagal memuat rekap mingguan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, weekStart.getTime(), cutoffEnd.getTime(), refreshKey])

  const shiftWeek = (dir: -1 | 1) => {
    setAnchorDate((d) => (dir === -1 ? subDays(d, 7) : addDays(d, 7)))
  }

  const saveFinalAmount = async (orderId: string) => {
    const n = safeNumberFromInput(editingAmounts[orderId] || '')
    if (n == null) {
      toast.error('Isi nominal terlebih dulu')
      return
    }

    setSavingOrderId(orderId)
    try {
      const res = await supabase
        .from('service_orders')
        .update({ final_amount: n })
        .eq('tenant_id', tenantId)
        .eq('id', orderId)

      if (res.error) throw res.error

      toast.success('Nominal order tersimpan')
      setRefreshKey((k) => k + 1)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Gagal menyimpan nominal')
    } finally {
      setSavingOrderId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rekap Mingguan</CardTitle>
          <CardDescription>
            {rangeLabel}. Income = total nilai order selesai (manual via final_amount). Expense = expense operasional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="space-y-1">
                <div className="text-sm font-medium">Tanggal acuan</div>
                <Input
                  type="date"
                  value={format(anchorDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    const [yy, mm, dd] = v.split('-').map((x) => Number(x))
                    if (!yy || !mm || !dd) return
                    setAnchorDate(new Date(yy, mm - 1, dd, 12, 0, 0, 0))
                  }}
                  className="w-[200px]"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => shiftWeek(-1)}>
                  Minggu sebelumnya
                </Button>
                <Button variant="outline" onClick={() => shiftWeek(1)}>
                  Minggu berikutnya
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>

          {setupMissing && (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-medium">Setup diperlukan</div>
              <div className="text-muted-foreground">{setupMissing}</div>
            </div>
          )}

          <Separator />

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base">Potensi Income</CardTitle>
                <CardDescription>Order selesai di periode ini</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-semibold">{currency(incomeTotal)}</div>
                <div className="text-xs text-muted-foreground">{missingCount} order belum diisi nominal</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base">Expense Operasional</CardTitle>
                <CardDescription>Transaksi expense (Mon–Sat)</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-semibold">{currency(expenseTotal)}</div>
                <div className="text-xs text-muted-foreground">{expenseByCategory.length} kategori terpakai</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base">Selisih</CardTitle>
                <CardDescription>Income - Expense</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-semibold">{currency(net)}</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="font-medium">Expense per Kategori (Operasional)</div>
            {expenseByCategory.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada transaksi expense operasional di periode ini.</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {expenseByCategory.map((c) => (
                  <div key={c.name} className="rounded-md border p-3">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-lg font-semibold">{currency(c.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Order Selesai (untuk input nominal)</div>
              <div className="text-sm text-muted-foreground">Total: {completedOrders.length}</div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada order completed di periode ini.</div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Selesai</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedOrders.map((o) => {
                      const clientName = pickFirst(o.clients)?.name || '-'
                      const completedLabel = o.completed_at
                        ? new Date(o.completed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                        : '-'
                      const isSaving = savingOrderId === o.id
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <div className="font-mono text-sm">{o.order_number}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">{o.service_title || '-'}</div>
                          </TableCell>
                          <TableCell className="text-sm">{clientName}</TableCell>
                          <TableCell className="text-sm">{completedLabel}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              inputMode="numeric"
                              placeholder="0"
                              value={editingAmounts[o.id] ?? ''}
                              onChange={(e) =>
                                setEditingAmounts((prev) => ({
                                  ...prev,
                                  [o.id]: e.target.value,
                                }))
                              }
                              className="w-[160px] ml-auto text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => saveFinalAmount(o.id)}
                              disabled={isSaving || setupMissing != null}
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
