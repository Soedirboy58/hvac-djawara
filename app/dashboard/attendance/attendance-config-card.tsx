'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Config = {
  work_start_time: string
  work_end_time: string
  overtime_rate_per_hour: number
  max_overtime_hours_per_day: number
}

function toTimeInputValue(value: string) {
  // TIME from DB usually HH:MM:SS, input wants HH:MM
  const parts = String(value || '').split(':')
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  return '09:00'
}

export function AttendanceConfigCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)

  const form = useMemo(() => {
    if (!config) return null
    return {
      workStart: toTimeInputValue(config.work_start_time),
      workEnd: toTimeInputValue(config.work_end_time),
      overtimeRate: String(config.overtime_rate_per_hour ?? 5000),
      maxOvertime: String(config.max_overtime_hours_per_day ?? 4),
    }
  }, [config])

  const [workStart, setWorkStart] = useState('09:00')
  const [workEnd, setWorkEnd] = useState('18:00')
  const [overtimeRate, setOvertimeRate] = useState('5000')
  const [maxOvertime, setMaxOvertime] = useState('4')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/working-hours-config', { method: 'GET' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Gagal memuat konfigurasi jam kerja')

        const cfg = json?.config as Config
        if (!cancelled) {
          setConfig(cfg)
          setWorkStart(toTimeInputValue(cfg.work_start_time))
          setWorkEnd(toTimeInputValue(cfg.work_end_time))
          setOvertimeRate(String(cfg.overtime_rate_per_hour ?? 5000))
          setMaxOvertime(String(cfg.max_overtime_hours_per_day ?? 4))
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Gagal memuat konfigurasi')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/working-hours-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workStartTime: workStart,
          workEndTime: workEnd,
          overtimeRatePerHour: overtimeRate,
          maxOvertimeHoursPerDay: maxOvertime,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Gagal menyimpan konfigurasi')

      const updated = (json?.config || null) as any
      if (updated) {
        setConfig({
          work_start_time: String(updated.work_start_time || '09:00:00'),
          work_end_time: String(updated.work_end_time || '17:00:00'),
          overtime_rate_per_hour: Number(updated.overtime_rate_per_hour ?? 5000),
          max_overtime_hours_per_day: Number(updated.max_overtime_hours_per_day ?? 4),
        })
      }

      toast.success('Konfigurasi kehadiran tersimpan')
    } catch (e: any) {
      toast.error(e?.message || 'Gagal menyimpan konfigurasi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontrol Kehadiran (Jam Kerja)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pengaturan ini berlaku untuk semua teknisi termasuk helper/magang (mereka masuk sebagai data teknisi di tenant aktif).
          Perhitungan status terlambat/pulang cepat mengikuti zona waktu Asia/Jakarta.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Jam Masuk Standar</Label>
            <Input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label>Jam Pulang Standar</Label>
            <Input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              disabled={loading || saving}
            />
            <p className="text-xs text-muted-foreground">
              Jika lupa clock-out sampai jam ini, sistem akan menandai <span className="font-medium">Auto checkout</span>.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tarif Lembur per Jam (Rp)</Label>
            <Input
              inputMode="numeric"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value)}
              disabled={loading || saving}
              placeholder="5000"
            />
          </div>

          <div className="space-y-2">
            <Label>Maksimal Lembur per Hari (Jam)</Label>
            <Input
              inputMode="numeric"
              value={maxOvertime}
              onChange={(e) => setMaxOvertime(e.target.value)}
              disabled={loading || saving}
              placeholder="4"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onSave} disabled={loading || saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
          {form && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setWorkStart(form.workStart)
                setWorkEnd(form.workEnd)
                setOvertimeRate(form.overtimeRate)
                setMaxOvertime(form.maxOvertime)
              }}
              disabled={loading || saving}
            >
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
