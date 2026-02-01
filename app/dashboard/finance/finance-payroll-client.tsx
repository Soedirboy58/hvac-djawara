'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils/formatters'
import { toast } from 'sonner'

const samplePayrollRows = [
  {
    id: 'pay-2025-12-001',
    date: '2025-12-31',
    employee: 'Yukhimauludin',
    grossPay: 3470000,
    deduction: 763000,
    netPay: 2707000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-002',
    date: '2025-12-31',
    employee: 'Febri Setia Ningsih',
    grossPay: 1050000,
    deduction: 0,
    netPay: 1050000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-003',
    date: '2025-12-31',
    employee: 'Nurfad',
    grossPay: 1745000,
    deduction: 43000,
    netPay: 1702000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-004',
    date: '2025-12-31',
    employee: 'Lutfi Arif S.',
    grossPay: 3461000,
    deduction: 733000,
    netPay: 2728000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-005',
    date: '2025-12-31',
    employee: 'Dani Rachmanto',
    grossPay: 2215000,
    deduction: 0,
    netPay: 2215000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-006',
    date: '2025-12-31',
    employee: 'Anjar Putra Kusuma',
    grossPay: 4907500,
    deduction: 763000,
    netPay: 4144500,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-007',
    date: '2025-12-01',
    employee: 'Nurfad',
    grossPay: 1500000,
    deduction: 243000,
    netPay: 1257000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-008',
    date: '2025-12-01',
    employee: 'Anjar Putra Kusuma',
    grossPay: 3654500,
    deduction: 643000,
    netPay: 3011500,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-009',
    date: '2025-12-01',
    employee: 'Dani Rachmanto',
    grossPay: 1975000,
    deduction: 0,
    netPay: 1975000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-010',
    date: '2025-12-01',
    employee: 'Febri Setia Ningsih',
    grossPay: 675000,
    deduction: 0,
    netPay: 675000,
    contribution: 0,
  },
  {
    id: 'pay-2025-12-011',
    date: '2025-12-01',
    employee: 'Yukhimauludin',
    grossPay: 2144000,
    deduction: 313000,
    netPay: 1831000,
    contribution: 0,
  },
  {
    id: 'pay-2025-11-001',
    date: '2025-11-01',
    employee: 'Nurfad',
    grossPay: 1805000,
    deduction: 143000,
    netPay: 1662000,
    contribution: 0,
  },
]

const sampleEmployees = [
  { id: 'emp-001', name: 'Yukhimauludin' },
  { id: 'emp-002', name: 'Febri Setia Ningsih' },
  { id: 'emp-003', name: 'Nurfad' },
  { id: 'emp-004', name: 'Lutfi Arif S.' },
  { id: 'emp-005', name: 'Dani Rachmanto' },
  { id: 'emp-006', name: 'Anjar Putra Kusuma' },
]

const sampleProjects = ['Optional', 'Project A', 'Project B', 'Project C']

const defaultEarningTypes = ['Gaji Pokok', 'Bonus Tahunan', 'Insentif', 'Tunjangan']

type PayrollLine = {
  id: string
  type: string
  description: string
  units: string
  unitPrice: number
  project: string
}

type PayrollRecord = {
  id: string
  date: string
  referenceEnabled: boolean
  reference: string
  description: string
  employeeId: string
  employeeName: string
  earnings: PayrollLine[]
  deductions: PayrollLine[]
  contributions: PayrollLine[]
  showTotals: boolean
  showCustomTitle: boolean
  showFooters: boolean
  customTitle: string
  footerText: string
}

const STORAGE_KEY = 'finance-payroll-records-v1'

function toMonthKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

function formatMonthLabel(value: string) {
  if (!value) return 'Semua Bulan'
  const [year, month] = value.split('-')
  const monthIdx = Number(month) - 1
  if (!Number.isFinite(monthIdx) || monthIdx < 0) return value
  const date = new Date(Number(year), monthIdx, 1)
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export function FinancePayrollClient() {
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [payrollOpen, setPayrollOpen] = useState(false)
  const [earningTypes, setEarningTypes] = useState<string[]>(defaultEarningTypes)
  const [earningTypeModalOpen, setEarningTypeModalOpen] = useState(false)
  const [newEarningType, setNewEarningType] = useState('')
  const [mode, setMode] = useState<'create' | 'edit' | 'clone'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const [payrollForm, setPayrollForm] = useState({
    date: today,
    referenceEnabled: false,
    reference: '',
    description: '',
    employeeId: '',
    showTotals: false,
    showCustomTitle: false,
    showFooters: false,
    customTitle: 'Payslip',
    footerText: '',
  })

  const emptyLine = (): PayrollLine => ({
    id: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: '',
    description: '',
    units: '',
    unitPrice: 0,
    project: 'Optional',
  })

  const getAmount = (units: string, unitPrice: number) => {
    const parsedUnits = Number(units)
    const effectiveUnits = Number.isFinite(parsedUnits) && units !== '' ? parsedUnits : 1
    return effectiveUnits * unitPrice
  }

  const computeTotals = (record: PayrollRecord) => {
    const grossPay = record.earnings.reduce((acc, line) => acc + getAmount(line.units, line.unitPrice), 0)
    const deduction = record.deductions.reduce((acc, line) => acc + getAmount(line.units, line.unitPrice), 0)
    const contribution = record.contributions.reduce((acc, line) => acc + getAmount(line.units, line.unitPrice), 0)
    const netPay = grossPay - deduction
    return { grossPay, deduction, netPay, contribution }
  }

  const buildRecordFromForm = (): PayrollRecord => {
    const employee = sampleEmployees.find((emp) => emp.id === payrollForm.employeeId)
    return {
      id: editingId ?? `pay-${Date.now()}`,
      date: payrollForm.date || today,
      referenceEnabled: payrollForm.referenceEnabled,
      reference: payrollForm.reference,
      description: payrollForm.description,
      employeeId: payrollForm.employeeId,
      employeeName: employee?.name || 'Unknown',
      earnings,
      deductions,
      contributions,
      showTotals: payrollForm.showTotals,
      showCustomTitle: payrollForm.showCustomTitle,
      showFooters: payrollForm.showFooters,
      customTitle: payrollForm.customTitle,
      footerText: payrollForm.footerText,
    }
  }

  const [earnings, setEarnings] = useState<PayrollLine[]>([emptyLine()])
  const [deductions, setDeductions] = useState<PayrollLine[]>([emptyLine()])
  const [contributions, setContributions] = useState<PayrollLine[]>([emptyLine()])

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PayrollRecord[]
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {
      console.warn('Failed to load payroll records:', e)
    }

    return samplePayrollRows.map((row) => ({
      id: row.id,
      date: row.date,
      referenceEnabled: false,
      reference: '',
      description: `Slip Gaji ${row.employee}`,
      employeeId: row.employee,
      employeeName: row.employee,
      earnings: [
        {
          id: `earn-${row.id}`,
          type: 'Gaji Pokok',
          description: '',
          units: '',
          unitPrice: row.grossPay,
          project: 'Optional',
        },
      ],
      deductions: row.deduction > 0
        ? [
            {
              id: `ded-${row.id}`,
              type: 'Potongan',
              description: '',
              units: '',
              unitPrice: row.deduction,
              project: 'Optional',
            },
          ]
        : [emptyLine()],
      contributions: row.contribution > 0
        ? [
            {
              id: `ctr-${row.id}`,
              type: 'Contribution',
              description: '',
              units: '',
              unitPrice: row.contribution,
              project: 'Optional',
            },
          ]
        : [emptyLine()],
      showTotals: false,
      showCustomTitle: false,
      showFooters: false,
      customTitle: 'Payslip',
      footerText: '',
    }))
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payrollRecords))
    } catch (e) {
      console.warn('Failed to store payroll records:', e)
    }
  }, [payrollRecords])

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(payrollRecords.map((row) => toMonthKey(row.date))))
    return keys.sort((a, b) => (a > b ? -1 : 1))
  }, [payrollRecords])

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return payrollRecords.filter((row) => {
      const matchesSearch = keyword ? row.employeeName.toLowerCase().includes(keyword) : true
      const matchesMonth = monthFilter === 'all' ? true : toMonthKey(row.date) === monthFilter
      return matchesSearch && matchesMonth
    })
  }, [search, monthFilter, payrollRecords])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const previewList = filteredRows
  const previewIndex = previewList.findIndex((row) => row.id === previewId)
  const previewRecord = previewIndex >= 0 ? previewList[previewIndex] : null

  const allSelectedOnPage = paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.has(row.id))

  const toggleSelectAll = (checked: boolean) => {
    const next = new Set(selectedIds)
    paginatedRows.forEach((row) => {
      if (checked) next.add(row.id)
      else next.delete(row.id)
    })
    setSelectedIds(next)
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedIds(next)
  }

  const handlePageSizeChange = (value: string) => {
    const nextSize = Number(value)
    if (Number.isFinite(nextSize) && nextSize > 0) {
      setPageSize(nextSize)
      setPage(1)
    }
  }

  const updateLine = (
    list: PayrollLine[],
    setList: React.Dispatch<React.SetStateAction<PayrollLine[]>>,
    id: string,
    patch: Partial<PayrollLine>
  ) => {
    setList(list.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const addLine = (
    setList: React.Dispatch<React.SetStateAction<PayrollLine[]>>,
  ) => {
    setList((prev) => [...prev, emptyLine()])
  }

  const removeLine = (
    list: PayrollLine[],
    setList: React.Dispatch<React.SetStateAction<PayrollLine[]>>,
    id: string
  ) => {
    if (list.length <= 1) return
    setList(list.filter((line) => line.id !== id))
  }

  const copyLine = (
    list: PayrollLine[],
    setList: React.Dispatch<React.SetStateAction<PayrollLine[]>>,
    id: string
  ) => {
    const target = list.find((line) => line.id === id)
    if (!target) return
    setList((prev) => [...prev, { ...target, id: `line-${Date.now()}-${Math.random().toString(16).slice(2)}` }])
  }

  const resetPayrollForm = () => {
    setPayrollForm({
      date: today,
      referenceEnabled: false,
      reference: '',
      description: '',
      employeeId: '',
      showTotals: false,
      showCustomTitle: false,
      showFooters: false,
      customTitle: 'Payslip',
      footerText: '',
    })
    setEarnings([emptyLine()])
    setDeductions([emptyLine()])
    setContributions([emptyLine()])
  }

  const setFormFromRecord = (record: PayrollRecord) => {
    setPayrollForm({
      date: record.date,
      referenceEnabled: record.referenceEnabled,
      reference: record.reference,
      description: record.description,
      employeeId: record.employeeId,
      showTotals: record.showTotals,
      showCustomTitle: record.showCustomTitle,
      showFooters: record.showFooters,
      customTitle: record.customTitle,
      footerText: record.footerText,
    })
    setEarnings(record.earnings.length > 0 ? record.earnings : [emptyLine()])
    setDeductions(record.deductions.length > 0 ? record.deductions : [emptyLine()])
    setContributions(record.contributions.length > 0 ? record.contributions : [emptyLine()])
  }

  const handleSubmitPayroll = (closeAfter: boolean) => {
    const record = buildRecordFromForm()
    if (!record.employeeId) {
      toast.error('Pilih karyawan terlebih dahulu')
      return
    }

    if (mode === 'edit') {
      setPayrollRecords((prev) => prev.map((row) => (row.id === record.id ? record : row)))
    } else {
      const newRecord = { ...record, id: `pay-${Date.now()}` }
      setPayrollRecords((prev) => [newRecord, ...prev])
    }

    toast.success(mode === 'edit' ? 'Payroll diperbarui' : 'Payroll dibuat')

    if (closeAfter) {
      resetPayrollForm()
      setPayrollOpen(false)
      setMode('create')
      setEditingId(null)
    } else {
      resetPayrollForm()
      setMode('create')
      setEditingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Payroll</CardTitle>
              <p className="text-sm text-muted-foreground">Kelola pembayaran gaji karyawan.</p>
            </div>
            <Button
              onClick={() => {
                setMode('create')
                setEditingId(null)
                resetPayrollForm()
                setPayrollOpen(true)
              }}
            >
              New Payroll
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Cari karyawan..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-[220px]"
              />
              <Select value={monthFilter} onValueChange={(value) => {
                setMonthFilter(value)
                setPage(1)
              }}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {formatMonthLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Terpilih: {selectedIds.size}</span>
              <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
                Bulk Action
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]">
                    <Checkbox checked={allSelectedOnPage} onCheckedChange={(v) => toggleSelectAll(Boolean(v))} />
                  </TableHead>
                  <TableHead className="w-[150px]">Aksi</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Deduction</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="text-right">Contribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Tidak ada data payroll.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => {
                    const totals = computeTotals(row)
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={(v) => toggleSelectOne(row.id, Boolean(v))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMode('edit')
                                setEditingId(row.id)
                                setFormFromRecord(row)
                                setPayrollOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPreviewId(row.id)
                                setPreviewOpen(true)
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.employeeName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.grossPay)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.deduction)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(totals.netPay)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.contribution)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
            <span>Halaman {currentPage} dari {totalPages} • Total: {filteredRows.length}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={payrollOpen} onOpenChange={setPayrollOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Edit Payroll' : 'New Payroll'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={payrollForm.date}
                  onChange={(e) => setPayrollForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={payrollForm.referenceEnabled}
                    onCheckedChange={(v) =>
                      setPayrollForm((prev) => ({ ...prev, referenceEnabled: Boolean(v) }))
                    }
                  />
                  <Input
                    placeholder="Optional"
                    value={payrollForm.reference}
                    onChange={(e) => setPayrollForm((prev) => ({ ...prev, reference: e.target.value }))}
                    disabled={!payrollForm.referenceEnabled}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input
                  placeholder="Judul / keterangan pembayaran"
                  value={payrollForm.description}
                  onChange={(e) => setPayrollForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={payrollForm.employeeId}
                  onValueChange={(value) => setPayrollForm((prev) => ({ ...prev, employeeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Earnings</h3>
                <Button variant="outline" size="sm" onClick={() => addLine(setEarnings)}>
                  Add line
                </Button>
              </div>
              <div className="space-y-3">
                {earnings.map((line) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Earning</Label>
                      <Select
                        value={line.type}
                        onValueChange={(value) => updateLine(earnings, setEarnings, line.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setEarningTypeModalOpen(true)}>
                              Buat Baru
                            </Button>
                          </div>
                          {earningTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Optional"
                        value={line.description}
                        onChange={(e) => updateLine(earnings, setEarnings, line.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Units</Label>
                      <Input
                        type="number"
                        value={line.units}
                        onChange={(e) => updateLine(earnings, setEarnings, line.id, { units: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Unit price</Label>
                      <Input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(earnings, setEarnings, line.id, { unitPrice: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Amount</Label>
                      <Input value={formatCurrency(getAmount(line.units, line.unitPrice))} readOnly />
                    </div>
                    <div className="md:col-span-1">
                      <Label className="text-xs">Project</Label>
                      <Select
                        value={line.project}
                        onValueChange={(value) => updateLine(earnings, setEarnings, line.id, { project: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {sampleProjects.map((project) => (
                            <SelectItem key={project} value={project}>
                              {project}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-12 flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyLine(earnings, setEarnings, line.id)}>
                        Copy
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={earnings.length <= 1}
                        onClick={() => removeLine(earnings, setEarnings, line.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Deductions</h3>
                <Button variant="outline" size="sm" onClick={() => addLine(setDeductions)}>
                  Add line
                </Button>
              </div>
              <div className="space-y-3">
                {deductions.map((line) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Deduction</Label>
                      <Select
                        value={line.type}
                        onValueChange={(value) => updateLine(deductions, setDeductions, line.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih" />
                        </SelectTrigger>
                        <SelectContent>
                          {earningTypes.map((type) => (
                            <SelectItem key={`ded-${type}`} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Optional"
                        value={line.description}
                        onChange={(e) => updateLine(deductions, setDeductions, line.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Units</Label>
                      <Input
                        type="number"
                        value={line.units}
                        onChange={(e) => updateLine(deductions, setDeductions, line.id, { units: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Unit price</Label>
                      <Input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(deductions, setDeductions, line.id, { unitPrice: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Amount</Label>
                      <Input value={formatCurrency(getAmount(line.units, line.unitPrice))} readOnly />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyLine(deductions, setDeductions, line.id)}>
                          Copy
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deductions.length <= 1}
                          onClick={() => removeLine(deductions, setDeductions, line.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Contributions</h3>
                <Button variant="outline" size="sm" onClick={() => addLine(setContributions)}>
                  Add line
                </Button>
              </div>
              <div className="space-y-3">
                {contributions.map((line) => (
                  <div key={line.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Optional"
                        value={line.description}
                        onChange={(e) => updateLine(contributions, setContributions, line.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Units</Label>
                      <Input
                        type="number"
                        value={line.units}
                        onChange={(e) => updateLine(contributions, setContributions, line.id, { units: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Unit price</Label>
                      <Input
                        type="number"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(contributions, setContributions, line.id, { unitPrice: Number(e.target.value || 0) })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Amount</Label>
                      <Input value={formatCurrency(getAmount(line.units, line.unitPrice))} readOnly />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyLine(contributions, setContributions, line.id)}>
                          Copy
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={contributions.length <= 1}
                          onClick={() => removeLine(contributions, setContributions, line.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={payrollForm.showTotals}
                  onCheckedChange={(v) => setPayrollForm((prev) => ({ ...prev, showTotals: Boolean(v) }))}
                />
                <Label>Show totals for the period</Label>
              </div>
              {payrollForm.showTotals && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">From</Label>
                    <Input type="date" />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={payrollForm.showCustomTitle}
                  onCheckedChange={(v) => setPayrollForm((prev) => ({ ...prev, showCustomTitle: Boolean(v) }))}
                />
                <Label>Custom title</Label>
              </div>
              {payrollForm.showCustomTitle && (
                <Input
                  value={payrollForm.customTitle}
                  onChange={(e) => setPayrollForm((prev) => ({ ...prev, customTitle: e.target.value }))}
                />
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={payrollForm.showFooters}
                  onCheckedChange={(v) => setPayrollForm((prev) => ({ ...prev, showFooters: Boolean(v) }))}
                />
                <Label>Footers</Label>
              </div>
              {payrollForm.showFooters && (
                <Input
                  value={payrollForm.footerText}
                  onChange={(e) => setPayrollForm((prev) => ({ ...prev, footerText: e.target.value }))}
                />
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmitPayroll(true)}
            >
              Create
            </Button>
            <Button
              onClick={() => handleSubmitPayroll(false)}
            >
              Create & add another
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Payroll Preview</DialogTitle>
          </DialogHeader>
          {previewRecord ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode('edit')
                      setEditingId(previewRecord.id)
                      setFormFromRecord(previewRecord)
                      setPayrollOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode('clone')
                      setEditingId(null)
                      setFormFromRecord(previewRecord)
                      setPayrollOpen(true)
                    }}
                  >
                    Clone
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Copy to</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setMode('clone')
                          setEditingId(null)
                          setFormFromRecord(previewRecord)
                          setPayrollOpen(true)
                        }}
                      >
                        Payroll baru
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.message('Payroll recurring belum tersedia')}>
                        Payroll recurring
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" onClick={() => toast.message('Print belum tersedia')}>Print</Button>
                  <Button variant="outline" onClick={() => toast.message('Export PDF belum tersedia')}>PDF</Button>
                  <Button onClick={() => toast.message('Kirim payroll belum tersedia')}>Kirim</Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={previewIndex <= 0}
                    onClick={() => setPreviewId(previewList[0]?.id || null)}
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={previewIndex <= 0}
                    onClick={() => setPreviewId(previewList[previewIndex - 1]?.id || null)}
                  >
                    ‹
                  </Button>
                  <span>
                    {previewIndex + 1} / {previewList.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={previewIndex >= previewList.length - 1}
                    onClick={() => setPreviewId(previewList[previewIndex + 1]?.id || null)}
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={previewIndex >= previewList.length - 1}
                    onClick={() => setPreviewId(previewList[previewList.length - 1]?.id || null)}
                  >
                    »
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <h2 className="text-2xl font-semibold">{previewRecord.customTitle || 'Payslip'}</h2>
                      <p className="text-sm text-muted-foreground">{previewRecord.description || 'Slip gaji karyawan'}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>Nama: {previewRecord.employeeName}</div>
                      <div>Tanggal: {previewRecord.date}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Earnings</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableBody>
                            {previewRecord.earnings.length === 0 ? (
                              <TableRow>
                                <TableCell className="text-sm text-muted-foreground">Tidak ada data.</TableCell>
                              </TableRow>
                            ) : (
                              previewRecord.earnings.map((line) => (
                                <TableRow key={line.id}>
                                  <TableCell>{line.type || 'Earning'}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(getAmount(line.units, line.unitPrice))}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Deductions</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableBody>
                            {previewRecord.deductions.length === 0 ? (
                              <TableRow>
                                <TableCell className="text-sm text-muted-foreground">Tidak ada data.</TableCell>
                              </TableRow>
                            ) : (
                              previewRecord.deductions.map((line) => (
                                <TableRow key={line.id}>
                                  <TableCell>{line.type || 'Deduction'}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(getAmount(line.units, line.unitPrice))}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:justify-between gap-4 text-sm">
                    <div className="space-y-1 text-muted-foreground">
                      <div>Reference: {previewRecord.referenceEnabled ? previewRecord.reference || '-' : '-'}</div>
                      <div>Contributions: {formatCurrency(computeTotals(previewRecord).contribution)}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div>Gross pay: {formatCurrency(computeTotals(previewRecord).grossPay)}</div>
                      <div>Deduction: {formatCurrency(computeTotals(previewRecord).deduction)}</div>
                      <div className="font-semibold">Net pay: {formatCurrency(computeTotals(previewRecord).netPay)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data payroll tidak ditemukan.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={earningTypeModalOpen} onOpenChange={setEarningTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Earning Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nama earning</Label>
            <Input
              placeholder="Contoh: Bonus Tahunan"
              value={newEarningType}
              onChange={(e) => setNewEarningType(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEarningTypeModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                const trimmed = newEarningType.trim()
                if (!trimmed) return
                if (!earningTypes.includes(trimmed)) {
                  setEarningTypes((prev) => [...prev, trimmed])
                }
                setNewEarningType('')
                setEarningTypeModalOpen(false)
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
