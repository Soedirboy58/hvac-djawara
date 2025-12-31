"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type AttendanceRow = {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_work_hours: number | null;
  is_late: boolean;
  is_early_leave: boolean;
  is_auto_checkout: boolean;
  notes: string | null;
};

function formatDate(dateISO: string) {
  // dateISO = YYYY-MM-DD
  const [y, m, d] = dateISO.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString("id-ID", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(ts: string | null) {
  if (!ts) return "-";
  const dt = new Date(ts);
  return dt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadge(row: AttendanceRow | null) {
  if (!row?.clock_in_time) return { label: "Belum absen", variant: "secondary" as const };
  if (row.is_auto_checkout) return { label: "Auto checkout", variant: "secondary" as const };
  if (row.is_late && row.is_early_leave) return { label: "Terlambat & pulang cepat", variant: "error" as const };
  if (row.is_late) return { label: "Terlambat", variant: "error" as const };
  if (row.is_early_leave) return { label: "Pulang cepat", variant: "error" as const };
  return { label: "On time", variant: "default" as const };
}

export default function TechnicianAttendancePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayISO, setTodayISO] = useState<string>("");

  const [todayRow, setTodayRow] = useState<AttendanceRow | null>(null);
  const [recent, setRecent] = useState<AttendanceRow[]>([]);

  const [recentPage, setRecentPage] = useState(1);
  const recentPageSize = 7;

  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/technician/login");
        return;
      }

      await refresh();
    } catch (e: any) {
      console.error("attendance init error:", e);
      toast.error(e?.message || "Gagal memuat halaman kehadiran");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    const res = await fetch("/api/technician/attendance/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error || "Gagal memuat data kehadiran");
      return;
    }

    setTodayISO(json.today as string);
    setTodayRow((json.todayRow || null) as AttendanceRow | null);
    setRecent((json.recent || []) as AttendanceRow[]);

    // Reset pagination after refresh to show newest rows first.
    setRecentPage(1);

    const nextNotes = (json.todayRow?.notes as string | null) || "";
    setNotes(nextNotes);
  };

  const onClockIn = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/technician/attendance/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Clock-in gagal");
        return;
      }

      toast.success("Clock-in berhasil");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onClockOut = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/technician/attendance/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Clock-out gagal");
        return;
      }

      toast.success("Clock-out berhasil");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const badge = statusBadge(todayRow);
  const canClockIn = !todayRow?.clock_in_time;
  const canClockOut = Boolean(todayRow?.clock_in_time) && !todayRow?.clock_out_time;

  const recentTotalPages = Math.max(1, Math.ceil(recent.length / recentPageSize));
  const safeRecentPage = Math.min(Math.max(1, recentPage), recentTotalPages);
  const recentStart = (safeRecentPage - 1) * recentPageSize;
  const recentEnd = recentStart + recentPageSize;
  const recentSlice = recent.slice(recentStart, recentEnd);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kehadiran</h1>
          <p className="text-sm text-gray-600">Absensi harian & riwayat</p>
        </div>
        {todayISO ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hari ini{todayISO ? ` — ${formatDate(todayISO)}` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Clock-in</div>
              <div className="text-sm font-medium text-gray-900 mt-1">
                {formatDateTime(todayRow?.clock_in_time || null)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Clock-out</div>
              <div className="text-sm font-medium text-gray-900 mt-1">
                {formatDateTime(todayRow?.clock_out_time || null)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-gray-500">Total jam kerja</div>
              <div className="text-sm font-medium text-gray-900 mt-1">
                {typeof todayRow?.total_work_hours === "number"
                  ? `${todayRow.total_work_hours.toFixed(2)} jam`
                  : "-"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Catatan</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: mulai kerja di lokasi A / kendala transport"
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              onClick={onClockIn}
              disabled={!canClockIn || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Clock-in
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClockOut}
              disabled={!canClockOut || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Clock-out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Riwayat (14 hari terakhir)</CardTitle>
            {recent.length > 0 ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                  disabled={safeRecentPage <= 1}
                >
                  Prev
                </Button>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  Hal {safeRecentPage} / {recentTotalPages}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRecentPage((p) => Math.min(recentTotalPages, p + 1))}
                  disabled={safeRecentPage >= recentTotalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-sm text-gray-600">Belum ada data kehadiran.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Clock-in</th>
                    <th className="py-2 pr-3">Clock-out</th>
                    <th className="py-2 pr-3">Jam</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSlice.map((r) => {
                    const b = statusBadge(r);
                    return (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatDateTime(r.clock_in_time)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatDateTime(r.clock_out_time)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {typeof r.total_work_hours === "number" ? r.total_work_hours.toFixed(2) : "-"}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <Badge variant={b.variant}>{b.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
