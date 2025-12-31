'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type AttendanceDay = {
  date: string
  row: {
    id: string
    date: string
    clock_in_time: string | null
    clock_out_time: string | null
    total_work_hours: number | null
    is_late: boolean | null
    is_early_leave: boolean | null
    is_auto_checkout: boolean | null
    notes?: string | null
  } | null
}

type AttendanceUserResponse = {
  success: true
  month: string
  userId: string
  days: AttendanceDay[]
}

type MonthlyRow = {
  technicianRecordId: string
  userId: string | null
  fullName: string | null
  email: string | null
  daysClockedIn: number
  daysComplete: number
  missingClockOut: number
  totalHours: number
  avgHoursPerCompleteDay: number
  lateCount: number
  earlyLeaveCount: number
  autoCheckoutCount: number
}

type MonthlyResponse = {
  month: string
  start: string
  endExclusive: string
  totals: {
    headcount: number
    daysClockedIn: number
    daysComplete: number
    missingClockOut: number
    totalHours: number
    lateCount: number
    earlyLeaveCount: number
    autoCheckoutCount: number
  }
  roster: MonthlyRow[]
}

function fmtHours(value: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

function monthLabel(monthKey: string) {
  // monthKey = YYYY-MM
  const [y, m] = monthKey.split('-').map((v) => Number(v))
  const dt = new Date(Date.UTC(y || 1970, (m || 1) - 1, 1))
  return dt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })
}

function addMonths(monthKey: string, delta: number) {
  const [y0, m0] = monthKey.split('-').map((v) => Number(v))
  const dt = new Date(Date.UTC(y0 || 1970, (m0 - 1) + delta, 1))
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function badgeForMissing(missing: number) {
  if (missing <= 0) return <Badge className="bg-green-500 text-white">OK</Badge>
  return <Badge variant="error">{missing} missing</Badge>
}

export function AttendanceMonthlyCard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<MonthlyResponse | null>(null)

  const [detailLoading, setDetailLoading] = useState(false)
  const [selected, setSelected] = useState<{ userId: string; name: string } | null>(null)
  const [detail, setDetail] = useState<AttendanceUserResponse | null>(null)

  const month = useMemo(() => {
    // Default to current Jakarta month if API not loaded yet.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
    return parts.slice(0, 7)
  }, [])

  const [activeMonth, setActiveMonth] = useState<string>(month)

  const load = async (monthKey: string) => {
    const res = await fetch(`/api/admin/attendance-monthly?month=${encodeURIComponent(monthKey)}`, { method: 'GET' })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Gagal memuat rekap absensi bulanan')
    setData(json as MonthlyResponse)
  }

  const loadUserDetail = async (monthKey: string, userId: string) => {
    const res = await fetch(
      `/api/admin/attendance-user?month=${encodeURIComponent(monthKey)}&userId=${encodeURIComponent(userId)}`,
      { method: 'GET' }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Gagal memuat detail absensi')
    setDetail(json as AttendanceUserResponse)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await load(activeMonth)
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Gagal memuat rekap bulanan')
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth])

  const onRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await load(activeMonth)
      toast.success('Rekap bulanan diperbarui')
    } catch (e: any) {
      toast.error(e?.message || 'Gagal refresh')
    } finally {
      setRefreshing(false)
    }
  }

  const onPrev = () => setActiveMonth((m) => addMonths(m, -1))
  const onNext = () => setActiveMonth((m) => addMonths(m, 1))

  const onSelectRow = async (r: MonthlyRow) => {
    if (!r.userId) return
    setSelected({ userId: r.userId, name: r.fullName || r.email || r.userId })
    setDetailLoading(true)
    try {
      await loadUserDetail(activeMonth, r.userId)
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat detail')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Rekap Bulanan</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ringkasan jam kerja & status absensi per orang (bulan: <span className="font-medium">{monthLabel(activeMonth)}</span>)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onPrev} disabled={loading || refreshing}>
              Prev
            </Button>
            <Button type="button" variant="secondary" onClick={onNext} disabled={loading || refreshing}>
              Next
            </Button>
            <Button type="button" onClick={onRefresh} disabled={loading || refreshing}>
              {refreshing ? 'Memuat...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat rekap...
            </div>
          ) : !data ? (
            <p className="text-sm text-muted-foreground">Tidak ada data.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Total anggota</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1">{data.totals.headcount}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Total hari clock-in</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1">{data.totals.daysClockedIn}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Total jam kerja</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1">{fmtHours(data.totals.totalHours)} jam</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-gray-500">Missing clock-out</div>
                  <div className="text-xl font-semibold text-gray-900 mt-1">{data.totals.missingClockOut}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">Terlambat: {data.totals.lateCount}</Badge>
                <Badge variant="secondary">Pulang cepat: {data.totals.earlyLeaveCount}</Badge>
                <Badge variant="secondary">Auto checkout: {data.totals.autoCheckoutCount}</Badge>
                <Badge variant="secondary">Hari lengkap: {data.totals.daysComplete}</Badge>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-right">Hari clock-in</TableHead>
                      <TableHead className="text-right">Hari lengkap</TableHead>
                      <TableHead className="text-right">Missing clock-out</TableHead>
                      <TableHead className="text-right">Total jam</TableHead>
                      <TableHead className="text-right">Rata-rata jam/hari</TableHead>
                      <TableHead className="text-right">Terlambat</TableHead>
                      <TableHead className="text-right">Pulang cepat</TableHead>
                      <TableHead className="text-right">Auto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.roster.map((r) => (
                      <TableRow
                        key={r.technicianRecordId}
                        className={r.userId ? 'cursor-pointer hover:bg-muted/50' : undefined}
                        onClick={() => onSelectRow(r)}
                      >
                        <TableCell>
                          <div className="font-medium">{r.fullName || r.email || '-'}</div>
                          {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                        </TableCell>
                        <TableCell className="text-right">{r.daysClockedIn}</TableCell>
                        <TableCell className="text-right">{r.daysComplete}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{r.missingClockOut}</span>
                            {badgeForMissing(r.missingClockOut)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{fmtHours(r.totalHours)}</TableCell>
                        <TableCell className="text-right">{fmtHours(r.avgHoursPerCompleteDay)}</TableCell>
                        <TableCell className="text-right">{r.lateCount}</TableCell>
                        <TableCell className="text-right">{r.earlyLeaveCount}</TableCell>
                        <TableCell className="text-right">{r.autoCheckoutCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selected ? (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Detail absensi</div>
                      <div className="text-base font-semibold">{selected.name}</div>
                      <div className="text-xs text-muted-foreground">Bulan: {monthLabel(activeMonth)}</div>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => { setSelected(null); setDetail(null) }}>
                      Tutup
                    </Button>
                  </div>

                  {detailLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat detail...
                    </div>
                  ) : !detail ? (
                    <p className="text-sm text-muted-foreground">Tidak ada data detail.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Clock-in</TableHead>
                            <TableHead>Clock-out</TableHead>
                            <TableHead className="text-right">Total (jam)</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.days.map((d) => {
                            const row = d.row
                            const status = !row || !row.clock_in_time
                              ? 'Tidak hadir'
                              : row.is_auto_checkout
                                ? 'Auto checkout'
                                : row.is_late && row.is_early_leave
                                  ? 'Terlambat & pulang cepat'
                                  : row.is_late
                                    ? 'Terlambat'
                                    : row.is_early_leave
                                      ? 'Pulang cepat'
                                      : 'Tepat waktu'

                            const fmt = (iso: string | null) => {
                              if (!iso) return '-'
                              const dt = new Date(iso)
                              return dt.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
                            }

                            return (
                              <TableRow key={d.date}>
                                <TableCell>{new Date(`${d.date}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                                <TableCell>{fmt(row?.clock_in_time || null)}</TableCell>
                                <TableCell>{fmt(row?.clock_out_time || null)}</TableCell>
                                <TableCell className="text-right">{row?.total_work_hours != null ? fmtHours(row.total_work_hours) : '-'}</TableCell>
                                <TableCell>{status}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Catatan: perhitungan “terlambat/pulang cepat” mengikuti konfigurasi jam kerja tenant (Asia/Jakarta). Total jam kerja dihitung dari selisih clock-in/out.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
