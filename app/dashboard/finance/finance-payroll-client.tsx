'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(samplePayrollRows.map((row) => toMonthKey(row.date))))
    return keys.sort((a, b) => (a > b ? -1 : 1))
  }, [])

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return samplePayrollRows.filter((row) => {
      const matchesSearch = keyword ? row.employee.toLowerCase().includes(keyword) : true
      const matchesMonth = monthFilter === 'all' ? true : toMonthKey(row.date) === monthFilter
      return matchesSearch && matchesMonth
    })
  }, [search, monthFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Payroll</CardTitle>
              <p className="text-sm text-muted-foreground">Kelola pembayaran gaji karyawan.</p>
            </div>
            <Button>New Payroll</Button>
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
                  paginatedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={(v) => toggleSelectOne(row.id, Boolean(v))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.employee}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.grossPay)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.deduction)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(row.netPay)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.contribution)}</TableCell>
                    </TableRow>
                  ))
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
    </div>
  )
}
