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
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, RefreshCw } from 'lucide-react'

type ExpenseCategory = {
  id: string
  tenant_id: string
  activity: 'operational' | 'financing' | 'investing'
  name: string
  is_active: boolean
}

type ExpenseTx = {
  id: string
  tenant_id: string
  activity: 'operational' | 'financing' | 'investing'
  category_id: string
  amount: number
  occurred_date: string
  description: string | null
  counterparty_name: string | null
  source_type: string | null
  source_id: string | null
  expense_categories?: { name: string } | Array<{ name: string }> | null
}

type ReimburseCategory = {
  id: string
  name: string
  is_active: boolean
}

type ReimburseMapRow = {
  reimburse_category_id: string
  expense_category_id: string
}

type PaidReimburseRow = {
  id: string
  category_id: string
  amount: number
  description: string | null
  decided_at: string | null
  submitted_at: string
}

type TechnicianRow = {
  id: string
  full_name: string
}

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  )

const pickFirst = <T,>(v: T | T[] | null | undefined): T | null => {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

const normalizeName = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s/()_-]/g, '')
    .trim()

const amountFromInput = (v: string) => {
  const cleaned = String(v || '').replace(/[^0-9]/g, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return 0
  return n
}

const formatRupiahInput = (v: string) => {
  const n = amountFromInput(v)
  if (!n) return ''
  // Indonesian: thousand separator '.'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
}

export function FinanceExpenseClient({ tenantId }: { tenantId: string }) {
  const supabase = useMemo(() => createClient(), [])

  const [ready, setReady] = useState(false)
  const [setupMissing, setSetupMissing] = useState<string | null>(null)

  const [tab, setTab] = useState<'operational' | 'financing' | 'investing'>('operational')

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [loadingCats, setLoadingCats] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)
  const [quickAdding, setQuickAdding] = useState(false)

  const [reimburseCategories, setReimburseCategories] = useState<ReimburseCategory[]>([])
  const [mapRows, setMapRows] = useState<ReimburseMapRow[]>([])
  const [loadingMap, setLoadingMap] = useState(false)
  const [savingMapId, setSavingMapId] = useState<string | null>(null)

  const [syncingPaid, setSyncingPaid] = useState(false)

  const [transactions, setTransactions] = useState<ExpenseTx[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [txPage, setTxPage] = useState(0)
  const [txPageSize] = useState(30)
  const [txTotalCount, setTxTotalCount] = useState(0)
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(() => new Set())

  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')
  const [txTotalAmount, setTxTotalAmount] = useState(0)
  const [txTotalAmountCapped, setTxTotalAmountCapped] = useState(false)
  const [loadingTxTotal, setLoadingTxTotal] = useState(false)
  const [txTotalKey, setTxTotalKey] = useState('')

  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [txDialogMode, setTxDialogMode] = useState<'preview' | 'edit'>('preview')
  const [activeTx, setActiveTx] = useState<ExpenseTx | null>(null)

  const [editCategoryId, setEditCategoryId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCounterparty, setEditCounterparty] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteIdsPending, setDeleteIdsPending] = useState<string[]>([])

  const [manualType, setManualType] = useState<'supplier_material' | 'supplier_sparepart' | 'payroll' | 'other'>('supplier_material')
  const [manualCategoryId, setManualCategoryId] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualDate, setManualDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [manualCounterparty, setManualCounterparty] = useState('')
  const [manualSupplierId, setManualSupplierId] = useState('')
  const [manualTechnicianId, setManualTechnicianId] = useState('')
  const [manualDesc, setManualDesc] = useState('')
  const [creatingTx, setCreatingTx] = useState(false)

  const [technicians, setTechnicians] = useState<TechnicianRow[]>([])

  const [supplierChoices, setSupplierChoices] = useState<Array<{ id: string; name: string }>>([])

  // Show all operational categories (including non-active), because the UI currently doesn't provide a way
  // to reactivate categories; hiding them makes users think categories are missing.
  const operationalCategories = expenseCategories.filter((c) => c.activity === 'operational')

  const categoryOptionsByType = useMemo(() => {
    const keywordsByType: Record<string, string[]> = {
      payroll: ['payroll', 'upah', 'lembur', 'uang makan', 'gaji', 'insentif', 'thr', 'tunjangan', 'bonus'],
      supplier_material: ['stok', 'habis pakai', 'material', 'ongkir', 'transport'],
      supplier_sparepart: ['sparepart', 'spare', 'part', 'komponen', 'stok'],
      other: [],
    }

    const keywords = keywordsByType[manualType] || []
    if (!keywords.length) return operationalCategories

    const matches = operationalCategories.filter((c) => {
      const n = normalizeName(c.name)
      return keywords.some((k) => n.includes(normalizeName(k)))
    })

    // If no match at all (e.g. tenant hasn't created the suggested categories), fall back to all
    return matches.length ? matches : operationalCategories
  }, [manualType, operationalCategories])

  const preferredCategoryIdByType = useMemo(() => {
    const exact = new Map(operationalCategories.map((c) => [normalizeName(c.name), c.id]))
    const findByIncludes = (needle: string) => {
      const n = normalizeName(needle)
      for (const c of operationalCategories) {
        if (normalizeName(c.name).includes(n)) return c.id
      }
      return ''
    }

    return {
      supplier_material: exact.get('stok habis pakai') || findByIncludes('stok') || exact.get('sparepart') || '',
      supplier_sparepart: exact.get('sparepart') || findByIncludes('spare') || exact.get('stok habis pakai') || '',
      payroll: exact.get('payroll / upah') || exact.get('payroll') || findByIncludes('upah') || findByIncludes('gaji') || '',
      other: '',
    } as Record<string, string>
  }, [operationalCategories])

  useEffect(() => {
    // If current selection is not in list (e.g. categories changed), clear it.
    if (manualCategoryId && !operationalCategories.some((c) => c.id === manualCategoryId)) {
      setManualCategoryId('')
      return
    }

    // If current selection is not in the filtered options for this type, auto-adjust.
    if (manualCategoryId && !categoryOptionsByType.some((c) => c.id === manualCategoryId)) {
      const preferred = preferredCategoryIdByType[manualType]
      const next = (preferred && categoryOptionsByType.some((c) => c.id === preferred))
        ? preferred
        : (categoryOptionsByType[0]?.id || '')
      setManualCategoryId(next)
      return
    }

    // Auto-pick category when user hasn't chosen any.
    if (!manualCategoryId) {
      const preferred = preferredCategoryIdByType[manualType]
      const next = (preferred && categoryOptionsByType.some((c) => c.id === preferred))
        ? preferred
        : (categoryOptionsByType[0]?.id || '')
      if (next) setManualCategoryId(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualType, operationalCategories.length, categoryOptionsByType.length])

  const probeSetup = async (): Promise<boolean> => {
    try {
      const res = await supabase.from('expense_categories').select('id').eq('tenant_id', tenantId).limit(1)
      if (res.error) throw res.error
      setSetupMissing(null)
      setReady(true)
      return true
    } catch (e: any) {
      console.warn('expense module probe error:', e)
      setSetupMissing(e?.message || 'Expense module belum di-setup')
      setReady(false)
      return false
    }
  }

  const fetchSuppliersIfAvailable = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(100)

      if (error) throw error
      setSupplierChoices(((data || []) as any[]).map((r) => ({ id: r.id, name: r.name })))
    } catch {
      setSupplierChoices([])
    }
  }

  const fetchExpenseCategories = async () => {
    setLoadingCats(true)
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, tenant_id, activity, name, is_active')
        .eq('tenant_id', tenantId)
        .order('activity', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setExpenseCategories((data || []) as ExpenseCategory[])
    } catch (e: any) {
      console.error('fetchExpenseCategories error:', e)
      toast.error(e?.message || 'Gagal memuat expense categories')
    } finally {
      setLoadingCats(false)
    }
  }

  const fetchReimburseMapping = async () => {
    setLoadingMap(true)
    try {
      const [catsRes, mapRes] = await Promise.all([
        supabase
          .from('reimburse_categories')
          .select('id, name, is_active')
          .eq('tenant_id', tenantId)
          .order('name', { ascending: true }),
        supabase
          .from('reimburse_category_expense_map')
          .select('reimburse_category_id, expense_category_id')
          .eq('tenant_id', tenantId),
      ])

      if (catsRes.error) throw catsRes.error
      if (mapRes.error) throw mapRes.error

      setReimburseCategories((catsRes.data || []) as ReimburseCategory[])
      setMapRows((mapRes.data || []) as ReimburseMapRow[])
    } catch (e: any) {
      console.error('fetchReimburseMapping error:', e)
      toast.error(e?.message || 'Gagal memuat mapping reimburse')
    } finally {
      setLoadingMap(false)
    }
  }

  const fetchTotalAmount = async (totalCount: number) => {
    setLoadingTxTotal(true)
    try {
      let total = 0
      const pageSize = 1000
      const maxRows = 10000
      const target = Math.min(totalCount || 0, maxRows)
      let fetched = 0

      while (fetched < target) {
        const from = fetched
        const to = Math.min(target - 1, fetched + pageSize - 1)

        let q = supabase
          .from('expense_transactions')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('activity', 'operational')
          .order('occurred_date', { ascending: false })
          .range(from, to)

        if (txDateFrom) q = q.gte('occurred_date', txDateFrom)
        if (txDateTo) q = q.lte('occurred_date', txDateTo)

        const { data, error } = await q
        if (error) throw error

        for (const row of (data || []) as any[]) total += Number(row.amount) || 0

        if (!data || data.length === 0) break
        fetched += data.length
      }

      setTxTotalAmount(total)
      setTxTotalAmountCapped((totalCount || 0) > maxRows)
    } catch (e: any) {
      console.error('fetchTotalAmount error:', e)
      setTxTotalAmount(0)
      setTxTotalAmountCapped(false)
    } finally {
      setLoadingTxTotal(false)
    }
  }

  const fetchTransactions = async () => {
    setLoadingTx(true)
    try {
      if (txDateFrom && txDateTo && txDateFrom > txDateTo) {
        toast.error('Filter tanggal tidak valid: tanggal mulai > tanggal akhir')
        setTransactions([])
        setTxTotalCount(0)
        return
      }

      const from = txPage * txPageSize
      const to = from + txPageSize - 1

      let q = supabase
        .from('expense_transactions')
        .select(
          'id, tenant_id, activity, category_id, amount, occurred_date, description, counterparty_name, source_type, source_id, expense_categories(name)',
          { count: 'exact' }
        )
        .eq('tenant_id', tenantId)
        .eq('activity', 'operational')

      if (txDateFrom) q = q.gte('occurred_date', txDateFrom)
      if (txDateTo) q = q.lte('occurred_date', txDateTo)

      const { data, error, count } = await q
        .order('occurred_date', { ascending: false })
        .range(from, to)

      if (error) throw error
      setTransactions((data || []) as ExpenseTx[])
      setTxTotalCount(count || 0)
      setSelectedTxIds(new Set())

      // Total nominal for current filter. Keep it lightweight: cap at 10k rows.
      // For large datasets, users should narrow date range first.
      const nextKey = `${tenantId}|${txDateFrom}|${txDateTo}`
      if (txPage === 0 && (nextKey !== txTotalKey || (count || 0) !== txTotalCount)) {
        setTxTotalKey(nextKey)
        void fetchTotalAmount(count || 0)
      }
    } catch (e: any) {
      console.error('fetchTransactions error:', e)
      toast.error(e?.message || 'Gagal memuat expense transactions')
    } finally {
      setLoadingTx(false)
    }
  }

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('id, full_name')
        .eq('tenant_id', tenantId)
        .order('full_name', { ascending: true })

      if (error) throw error
      setTechnicians((data || []) as TechnicianRow[])
    } catch (e) {
      // ignore; payroll can still be typed into notes
    }
  }

  const refreshAll = async () => {
    const ok = await probeSetup()
    if (!ok) return
    await Promise.all([fetchExpenseCategories(), fetchReimburseMapping(), fetchTransactions(), fetchTechnicians(), fetchSuppliersIfAvailable()])
  }

  useEffect(() => {
    void (async () => {
      try {
        setTxPage(0)
        const ok = await probeSetup()
        if (!ok) return
        await Promise.all([fetchExpenseCategories(), fetchReimburseMapping(), fetchTransactions(), fetchTechnicians(), fetchSuppliersIfAvailable()])
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  useEffect(() => {
    if (!ready) return
    void fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txPage, txDateFrom, txDateTo])

  const createCategory = async () => {
    const name = newCatName.trim()
    if (!name) {
      toast.error('Nama kategori wajib diisi')
      return
    }

    setCreatingCat(true)
    try {
      const { error } = await supabase.from('expense_categories').insert({
        tenant_id: tenantId,
        activity: 'operational',
        name,
        is_active: true,
      })

      if (error) throw error
      setNewCatName('')
      toast.success('Kategori expense berhasil dibuat')
      await fetchExpenseCategories()
    } catch (e: any) {
      console.error('createCategory error:', e)
      toast.error(e?.message || 'Gagal membuat kategori expense')
    } finally {
      setCreatingCat(false)
    }
  }

  const quickAddOperationalTemplates = async () => {
    const templates = [
      'BBM',
      'Tol / Parkir',
      'Uang Makan',
      'Payroll / Upah',
      'Lembur',
      'Gaji Bulanan',
      'Insentif',
      'THR',
      'Ongkir / Transport',
      'Stok Habis Pakai',
      'Sparepart',
      'Tools / Perawatan Alat',
      'Service Kendaraan',
      'Listrik',
      'Air (PDAM)',
      'Internet',
      'Sewa',
      'Kebersihan',
      'ATK / Administrasi',
    ]

    setQuickAdding(true)
    try {
      const rows = templates.map((name) => ({
        tenant_id: tenantId,
        activity: 'operational',
        name,
        is_active: true,
      }))

      // Idempotent: add missing categories, ignore duplicates
      const { error } = await supabase
        .from('expense_categories')
        .upsert(rows, { onConflict: 'tenant_id,activity,name', ignoreDuplicates: true })

      if (error) throw error

      toast.success('Template kategori operasional dipastikan tersedia')
      await fetchExpenseCategories()
    } catch (e: any) {
      console.error('quickAddOperationalTemplates error:', e)
      toast.error(e?.message || 'Gagal menambah template kategori (mungkin sebagian sudah ada)')
      await fetchExpenseCategories()
    } finally {
      setQuickAdding(false)
    }
  }

  const getMappedExpenseCategoryId = (reimburseCategoryId: string) =>
    mapRows.find((m) => m.reimburse_category_id === reimburseCategoryId)?.expense_category_id || ''

  const upsertMapping = async (reimburseCategoryId: string, expenseCategoryId: string) => {
    setSavingMapId(reimburseCategoryId)
    try {
      // Upsert semantics: delete existing then insert (simple with RLS)
      await supabase
        .from('reimburse_category_expense_map')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('reimburse_category_id', reimburseCategoryId)

      const { error } = await supabase.from('reimburse_category_expense_map').insert({
        tenant_id: tenantId,
        reimburse_category_id: reimburseCategoryId,
        expense_category_id: expenseCategoryId,
      })

      if (error) throw error
      toast.success('Mapping tersimpan')
      await fetchReimburseMapping()
    } catch (e: any) {
      console.error('upsertMapping error:', e)
      toast.error(e?.message || 'Gagal menyimpan mapping')
    } finally {
      setSavingMapId(null)
    }
  }

  const syncPaidReimburse = async () => {
    setSyncingPaid(true)
    try {
      const { data: paid, error: paidErr } = await supabase
        .from('reimburse_requests')
        .select('id, category_id, amount, description, decided_at, submitted_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'paid')
        .order('decided_at', { ascending: false })
        .limit(200)

      if (paidErr) throw paidErr

      const paidRows = ((paid || []) as unknown) as PaidReimburseRow[]
      if (!paidRows.length) {
        toast.message('Tidak ada reimburse paid untuk disinkronkan')
        return
      }

      const paidIds = paidRows.map((r) => r.id)

      const { data: existing, error: existErr } = await supabase
        .from('expense_transactions')
        .select('source_id')
        .eq('tenant_id', tenantId)
        .eq('source_type', 'reimburse')
        .in('source_id', paidIds)

      if (existErr) throw existErr
      const existingIds = new Set((existing || []).map((r: any) => r.source_id).filter(Boolean))

      const mapByReimburseCategory = new Map(mapRows.map((m) => [m.reimburse_category_id, m.expense_category_id]))

      const toInsert = paidRows
        .filter((r) => !existingIds.has(r.id))
        .map((r) => {
          const mappedCat = mapByReimburseCategory.get(r.category_id)
          if (!mappedCat) return null
          const occurred = (r.decided_at || r.submitted_at || new Date().toISOString()).slice(0, 10)
          return {
            tenant_id: tenantId,
            activity: 'operational',
            category_id: mappedCat,
            amount: r.amount,
            occurred_date: occurred,
            description: r.description || 'Reimburse paid',
            counterparty_name: 'Reimburse',
            source_type: 'reimburse',
            source_id: r.id,
          }
        })
        .filter(Boolean) as any[]

      const skippedNoMapping = paidRows.filter(
        (r) => !existingIds.has(r.id) && !mapByReimburseCategory.get(r.category_id)
      ).length

      if (!toInsert.length) {
        if (skippedNoMapping > 0) {
          toast.error(`Tidak ada yang bisa disync. ${skippedNoMapping} reimburse belum punya mapping kategori.`)
        } else {
          toast.message('Semua reimburse paid sudah tersinkron')
        }
        return
      }

      const ins = await supabase.from('expense_transactions').insert(toInsert)
      if (ins.error) throw ins.error

      toast.success(`Sync berhasil: ${toInsert.length} expense dibuat${skippedNoMapping ? `, ${skippedNoMapping} dilewati (belum mapping)` : ''}`)
      await fetchTransactions()
    } catch (e: any) {
      console.error('syncPaidReimburse error:', e)
      toast.error(e?.message || 'Gagal sync reimburse paid')
    } finally {
      setSyncingPaid(false)
    }
  }

  const createManualExpense = async () => {
    if (!manualCategoryId) {
      toast.error('Kategori expense wajib dipilih')
      return
    }

    const amount = amountFromInput(manualAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Nominal tidak valid')
      return
    }

    if (!manualDate) {
      toast.error('Tanggal wajib diisi')
      return
    }

    if (manualType === 'payroll' && !manualTechnicianId) {
      toast.error('Pilih teknisi/helper untuk payroll')
      return
    }

    if (manualType === 'supplier_material' || manualType === 'supplier_sparepart') {
      const usingMaster = supplierChoices.length > 0
      if (usingMaster && !manualSupplierId) {
        toast.error('Pilih supplier terlebih dulu')
        return
      }
      if (!usingMaster && !manualCounterparty.trim()) {
        toast.error('Nama supplier wajib diisi')
        return
      }
    }

    setCreatingTx(true)
    try {
      const selectedSupplierName = supplierChoices.find((s) => s.id === manualSupplierId)?.name

      const counterparty =
        manualType === 'payroll'
          ? `Payroll: ${technicians.find((t) => t.id === manualTechnicianId)?.full_name || 'Teknisi/Helper'}`
          : (selectedSupplierName || manualCounterparty.trim()) || null

      const payload: any = {
        tenant_id: tenantId,
        activity: 'operational',
        category_id: manualCategoryId,
        amount,
        occurred_date: manualDate,
        description: manualDesc.trim() || null,
        counterparty_name: counterparty,
        source_type: 'manual',
        source_id: null,
      }

      if (manualType === 'payroll') {
        payload.related_technician_id = manualTechnicianId
      }

      const { error } = await supabase.from('expense_transactions').insert(payload)
      if (error) throw error

      toast.success('Expense operasional berhasil ditambahkan')
      setManualAmount('')
      setManualDesc('')
      setManualCounterparty('')
      setManualSupplierId('')
      setManualTechnicianId('')
      await fetchTransactions()
    } catch (e: any) {
      console.error('createManualExpense error:', e)
      toast.error(e?.message || 'Gagal membuat expense')
    } finally {
      setCreatingTx(false)
    }
  }

  const txTotalPages = Math.max(1, Math.ceil((txTotalCount || 0) / txPageSize))
  const canPrev = txPage > 0
  const canNext = txPage + 1 < txTotalPages

  const selectedCount = selectedTxIds.size
  const pageAllSelected = transactions.length > 0 && selectedCount === transactions.length
  const pageSomeSelected = selectedCount > 0 && selectedCount < transactions.length

  const toggleSelectAllPage = (checked: boolean) => {
    if (!checked) {
      setSelectedTxIds(new Set())
      return
    }
    setSelectedTxIds(new Set(transactions.map((t) => t.id)))
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const openPreviewTx = (tx: ExpenseTx) => {
    setActiveTx(tx)
    setTxDialogMode('preview')
    setTxDialogOpen(true)
  }

  const openEditTx = (tx: ExpenseTx) => {
    setActiveTx(tx)
    setTxDialogMode('edit')
    setEditCategoryId(tx.category_id)
    setEditAmount(formatRupiahInput(String(Math.trunc(Number(tx.amount) || 0))))
    setEditDate(tx.occurred_date)
    setEditCounterparty(tx.counterparty_name || '')
    setEditDesc(tx.description || '')
    setTxDialogOpen(true)
  }

  const saveEditTx = async () => {
    if (!activeTx) return
    const amount = amountFromInput(editAmount)
    if (!amount) {
      toast.error('Nominal tidak valid')
      return
    }
    if (!editDate) {
      toast.error('Tanggal wajib diisi')
      return
    }
    if (!editCategoryId) {
      toast.error('Kategori wajib dipilih')
      return
    }

    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('expense_transactions')
        .update({
          category_id: editCategoryId,
          amount,
          occurred_date: editDate,
          counterparty_name: editCounterparty.trim() || null,
          description: editDesc.trim() || null,
        })
        .eq('tenant_id', tenantId)
        .eq('id', activeTx.id)

      if (error) throw error
      toast.success('Expense berhasil diupdate')
      setTxDialogOpen(false)
      await fetchTransactions()
    } catch (e: any) {
      console.error('saveEditTx error:', e)
      toast.error(e?.message || 'Gagal update expense')
    } finally {
      setSavingEdit(false)
    }
  }

  const requestDelete = (ids: string[]) => {
    setDeleteIdsPending(ids)
    setConfirmDeleteOpen(true)
  }

  const doDelete = async () => {
    if (deleteIdsPending.length === 0) return
    try {
      const { error } = await supabase
        .from('expense_transactions')
        .delete()
        .eq('tenant_id', tenantId)
        .in('id', deleteIdsPending)

      if (error) throw error

      toast.success(deleteIdsPending.length === 1 ? 'Expense dihapus' : `${deleteIdsPending.length} expense dihapus`)
      setSelectedTxIds(new Set())
      setConfirmDeleteOpen(false)
      setDeleteIdsPending([])
      await fetchTransactions()
    } catch (e: any) {
      console.error('doDelete error:', e)
      toast.error(e?.message || 'Gagal menghapus expense')
    }
  }

  if (setupMissing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense</CardTitle>
          <CardDescription>
            Modul expense belum aktif di database. Jalankan migration SQL dulu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Error probe: {setupMissing}</p>
          <p className="text-sm text-muted-foreground">
            File SQL: <span className="font-mono">supabase/migrations/20260105_001_create_expense_module.sql</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="operational">Operasional</TabsTrigger>
          <TabsTrigger value="financing">Pendanaan</TabsTrigger>
          <TabsTrigger value="investing">Investasi</TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="mt-4 space-y-4">
          <div className="flex items-center justify-end">
            <Button variant="outline" onClick={refreshAll} disabled={loadingCats || loadingTx || loadingMap}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sinkron Reimburse → Expense</CardTitle>
              <CardDescription>
                Reimburse yang sudah <b>paid</b> akan menjadi expense operasional berdasarkan mapping kategori.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button onClick={syncPaidReimburse} disabled={syncingPaid || loadingMap}>
                  {syncingPaid && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sync reimburse paid
                </Button>
                <p className="text-xs text-muted-foreground">
                  Otomatis juga terjadi saat status reimburse berubah menjadi paid (via trigger), jika mapping sudah ada.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="font-medium">Mapping Kategori Reimburse → Kategori Expense (Operasional)</p>
                  <p className="text-xs text-muted-foreground">
                    Atur 1 mapping per kategori reimburse. Reimburse paid tanpa mapping akan dilewati.
                  </p>
                </div>

                {loadingMap || loadingCats ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new_expense_category">Buat Kategori Expense Operasional</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="new_expense_category"
                          placeholder="Contoh: BBM, Uang Makan, Stok Habis Pakai"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                        />
                        <Button onClick={createCategory} disabled={creatingCat}>
                          {creatingCat && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Tambah
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Ingin cepat? Tambahkan template kategori operasional.
                        </p>
                        <Button variant="outline" size="sm" onClick={quickAddOperationalTemplates} disabled={quickAdding}>
                          {quickAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Tambah Template
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori Reimburse</TableHead>
                            <TableHead>Kategori Expense</TableHead>
                            <TableHead className="w-[140px]">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reimburseCategories.filter((c) => c.is_active).map((rc) => {
                            const mapped = getMappedExpenseCategoryId(rc.id)
                            return (
                              <TableRow key={rc.id}>
                                <TableCell className="font-medium">{rc.name}</TableCell>
                                <TableCell>
                                  <Select
                                    value={mapped}
                                    onValueChange={(v) => {
                                      void upsertMapping(rc.id, v)
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih kategori expense" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operationalCategories.map((ec) => (
                                        <SelectItem key={ec.id} value={ec.id}>
                                          {ec.name}{ec.is_active ? '' : ' (nonaktif)'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm" disabled={savingMapId === rc.id}>
                                    {savingMapId === rc.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Simpan
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          {!reimburseCategories.filter((c) => c.is_active).length && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-sm text-muted-foreground">
                                Belum ada kategori reimburse.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Input Expense Operasional</CardTitle>
              <CardDescription>
                <span>
                  <b>Jenis</b> = sumber/transaksi (supplier/payroll/lainnya). <b>Kategori</b> = pengelompokan untuk laporan (BBM, stok habis pakai, listrik, dll.).
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {operationalCategories.length === 0 && (
                <div className="rounded-md border p-3 text-sm space-y-2">
                  <div className="font-medium">Kategori belum tersedia</div>
                  <div className="text-muted-foreground">
                    Agar input cepat, tambahkan template kategori operasional atau buat kategori sendiri.
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={quickAddOperationalTemplates} disabled={quickAdding}>
                      {quickAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Tambah Template
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_expense_category_inline">Buat Kategori Expense Operasional</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new_expense_category_inline"
                        placeholder="Contoh: BBM, Uang Makan, Stok Habis Pakai"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                      />
                      <Button onClick={createCategory} disabled={creatingCat}>
                        {creatingCat && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">Panduan cepat</div>
                <div className="text-muted-foreground">
                  Contoh: bayar supplier material → <b>Jenis</b> “Supplier Material”, <b>Kategori</b> “Stok Habis Pakai/Sparepart”. Payroll teknisi → <b>Jenis</b> “Payroll”, <b>Kategori</b> “Payroll/Upah”.
                </div>
              </div>

              {operationalCategories.length > 0 && (
                <div className="rounded-md border p-3 text-sm space-y-2">
                  <div className="font-medium">Pilih cepat kategori</div>
                  <div className="flex flex-wrap gap-2">
                    {(manualType === 'payroll'
                      ? ['Uang Makan', 'Lembur', 'Gaji Bulanan', 'Insentif', 'THR', 'Payroll / Upah']
                      : manualType === 'supplier_material'
                        ? ['Stok Habis Pakai', 'Ongkir / Transport', 'BBM', 'Tol / Parkir']
                        : manualType === 'supplier_sparepart'
                          ? ['Sparepart', 'Ongkir / Transport']
                          : ['BBM', 'Tol / Parkir', 'Uang Makan', 'Stok Habis Pakai', 'Sparepart', 'Payroll / Upah', 'Lembur']
                    ).map((name) => {
                      const id = operationalCategories.find((c) => normalizeName(c.name) === normalizeName(name))?.id
                      if (!id) return null
                      const selected = manualCategoryId === id
                      return (
                        <Button
                          key={name}
                          type="button"
                          size="sm"
                          variant={selected ? 'default' : 'outline'}
                          onClick={() => setManualCategoryId(id)}
                        >
                          {name}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Jenis</Label>
                  <Select value={manualType} onValueChange={(v) => setManualType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier_material">Bayar Supplier Material</SelectItem>
                      <SelectItem value="supplier_sparepart">Bayar Supplier Sparepart</SelectItem>
                      <SelectItem value="payroll">Payroll Teknisi/Helper</SelectItem>
                      <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kategori Expense</Label>
                  <Select value={manualCategoryId} onValueChange={setManualCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptionsByType.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.is_active ? '' : ' (nonaktif)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nominal</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="Contoh: 150.000"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(formatRupiahInput(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                </div>

                {(manualType === 'supplier_material' || manualType === 'supplier_sparepart') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nama Supplier</Label>
                    {supplierChoices.length > 0 ? (
                      <Select value={manualSupplierId} onValueChange={setManualSupplierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {supplierChoices.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={manualCounterparty} onChange={(e) => setManualCounterparty(e.target.value)} placeholder="Contoh: CV Sumber Jaya" />
                    )}
                  </div>
                )}

                {manualType === 'payroll' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Teknisi/Helper</Label>
                    <Select value={manualTechnicianId} onValueChange={setManualTechnicianId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih teknisi/helper" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label>Keterangan (optional)</Label>
                  <Textarea value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder="Catatan tambahan..." rows={3} />
                </div>
              </div>

              <Button onClick={createManualExpense} disabled={creatingTx || operationalCategories.length === 0}>
                {creatingTx && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Expense
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Daftar Expense Operasional</CardTitle>
                  <CardDescription>
                    Total {txTotalCount} data • Halaman {Math.min(txPage + 1, txTotalPages)} / {txTotalPages} • Total nominal:{' '}
                    {loadingTxTotal ? 'Loading...' : currency(txTotalAmount)}
                    {txTotalAmountCapped ? ' (maks 10.000 data)' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setTxPage((p) => Math.max(0, p - 1))} disabled={loadingTx || !canPrev}>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTxPage((p) => p + 1)} disabled={loadingTx || !canNext}>
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Dari</div>
                    <Input
                      type="date"
                      value={txDateFrom}
                      onChange={(e) => {
                        setTxPage(0)
                        setTxDateFrom(e.target.value)
                      }}
                      className="w-[200px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Sampai</div>
                    <Input
                      type="date"
                      value={txDateTo}
                      onChange={(e) => {
                        setTxPage(0)
                        setTxDateTo(e.target.value)
                      }}
                      className="w-[200px]"
                    />
                  </div>
                </div>

                {(txDateFrom || txDateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTxPage(0)
                      setTxDateFrom('')
                      setTxDateTo('')
                    }}
                    disabled={loadingTx}
                  >
                    Reset filter
                  </Button>
                )}
              </div>

              {selectedCount > 0 && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <div>
                    <span className="font-medium">{selectedCount}</span> dipilih
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedTxIds(new Set())}>
                      Batal
                    </Button>
                    <Button size="sm" onClick={() => requestDelete(Array.from(selectedTxIds))}>
                      Hapus (bulk)
                    </Button>
                  </div>
                </div>
              )}

              {loadingTx ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[44px]">
                          <Checkbox
                            checked={pageAllSelected ? true : pageSomeSelected ? 'indeterminate' : false}
                            onCheckedChange={(v) => toggleSelectAllPage(Boolean(v))}
                            aria-label="Pilih semua"
                          />
                        </TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Counterparty</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => {
                        const cat = pickFirst(tx.expense_categories)?.name || '-'
                        const checked = selectedTxIds.has(tx.id)
                        return (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => toggleSelectOne(tx.id, Boolean(v))}
                                aria-label="Pilih baris"
                              />
                            </TableCell>
                            <TableCell>{tx.occurred_date}</TableCell>
                            <TableCell className="font-medium">{cat}</TableCell>
                            <TableCell>{tx.counterparty_name || '-'}</TableCell>
                            <TableCell className="max-w-[420px] truncate">{tx.description || '-'}</TableCell>
                            <TableCell className="text-right">{currency(tx.amount)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{tx.source_type || 'manual'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openPreviewTx(tx)}>
                                  Preview
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEditTx(tx)}>
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => requestDelete([tx.id])}>
                                  Hapus
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {!transactions.length && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-sm text-muted-foreground">
                            Belum ada data expense.
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

        <TabsContent value="financing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Pendanaan</CardTitle>
              <CardDescription>Tampilan dulu (belum konfigurasi)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Akan mencakup: cicilan pokok/bunga, biaya bank/fee pendanaan, dividen, dll.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Investasi</CardTitle>
              <CardDescription>Tampilan dulu (belum konfigurasi)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Akan mencakup: pembelian aset, renovasi, perangkat IT, deposit/jaminan, dll.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txDialogMode === 'edit' ? 'Edit Expense' : 'Preview Expense'}</DialogTitle>
          </DialogHeader>

          {activeTx ? (
            txDialogMode === 'edit' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {operationalCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.is_active ? '' : ' (nonaktif)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nominal</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="Contoh: 150.000"
                      value={editAmount}
                      onChange={(e) => setEditAmount(formatRupiahInput(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Counterparty</Label>
                  <Input value={editCounterparty} onChange={(e) => setEditCounterparty(e.target.value)} placeholder="Nama pihak terkait" />
                </div>

                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Tanggal:</span> {activeTx.occurred_date}</div>
                <div><span className="font-medium">Kategori:</span> {pickFirst(activeTx.expense_categories)?.name || '-'}</div>
                <div><span className="font-medium">Counterparty:</span> {activeTx.counterparty_name || '-'}</div>
                <div><span className="font-medium">Nominal:</span> {currency(activeTx.amount)}</div>
                <div><span className="font-medium">Sumber:</span> {activeTx.source_type || 'manual'}</div>
                <div><span className="font-medium">Keterangan:</span> {activeTx.description || '-'}</div>
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">Tidak ada data.</div>
          )}

          <DialogFooter>
            {txDialogMode === 'edit' ? (
              <>
                <Button variant="outline" onClick={() => setTxDialogOpen(false)} disabled={savingEdit}>
                  Batal
                </Button>
                <Button onClick={saveEditTx} disabled={savingEdit}>
                  {savingEdit && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan
                </Button>
              </>
            ) : (
              <Button onClick={() => setTxDialogOpen(false)}>Tutup</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIdsPending.length === 1
                ? 'Data expense ini akan dihapus permanen.'
                : `${deleteIdsPending.length} data expense akan dihapus permanen.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIdsPending([])}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
