'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

type AttendanceRow = {
  clock_in_time: string | null
  clock_out_time: string | null
  total_work_hours: number | null
  is_late: boolean | null
  is_early_leave: boolean | null
  is_auto_checkout: boolean | null
}

type RosterRow = {
  technicianRecordId: string
  userId: string | null
  fullName: string | null
  email: string | null
  staffRole: string | null
  status: string
  attendance: AttendanceRow | null
}

function fmtTime(iso: string | null) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

function fmtHours(hours: number | null) {
  if (hours === null || hours === undefined) return '-'
  const n = Number(hours)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

function statusBadge(status: string) {
  const s = String(status || '')
  if (s === 'Tepat waktu') return <Badge className="bg-green-500 text-white">Tepat waktu</Badge>
  if (s === 'Terlambat') return <Badge variant="secondary" className="bg-orange-500 text-white">Terlambat</Badge>
  if (s === 'Pulang cepat') return <Badge variant="secondary" className="bg-orange-500 text-white">Pulang cepat</Badge>
  if (s === 'Terlambat & pulang cepat') return <Badge variant="secondary" className="bg-orange-500 text-white">Terlambat & pulang cepat</Badge>
  if (s === 'Auto checkout') return <Badge variant="secondary">Auto checkout</Badge>
  if (s === 'Tidak hadir') return <Badge variant="error">Tidak hadir</Badge>
  if (s === 'Belum aktivasi') return <Badge variant="secondary">Belum aktivasi</Badge>
  return <Badge variant="secondary">{s || '—'}</Badge>
}

export function AttendanceRosterCard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [date, setDate] = useState<string>('')
  const [rows, setRows] = useState<RosterRow[]>([])

  const load = async () => {
    try {
      const res = await fetch('/api/admin/attendance-today', { method: 'GET' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Gagal memuat monitoring absensi')
      setDate(String(json?.date || ''))
      setRows((json?.roster || []) as RosterRow[])
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat monitoring absensi')
      setRows([])
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await load()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await load()
      toast.success('Data absensi diperbarui')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monitoring Absensi Hari Ini</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Tanggal: {date || '-'}</p>
        </div>
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading || refreshing}>
          {refreshing ? 'Memuat...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada teknisi/helper terdaftar di tenant ini.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Jam</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.technicianRecordId}>
                    <TableCell>
                      <div className="font-medium">{r.fullName || r.email || '-'}</div>
                      {r.email ? <div className="text-xs text-muted-foreground">{r.email}</div> : null}
                    </TableCell>
                    <TableCell className="capitalize">{r.staffRole || '-'}</TableCell>
                    <TableCell>{fmtTime(r.attendance?.clock_in_time || null)}</TableCell>
                    <TableCell>{fmtTime(r.attendance?.clock_out_time || null)}</TableCell>
                    <TableCell className="text-right">{fmtHours(r.attendance?.total_work_hours ?? null)}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
