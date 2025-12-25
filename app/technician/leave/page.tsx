"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type AvailabilityRow = {
  id: string;
  date: string;
  is_available: boolean;
  max_jobs_per_day: number | null;
  reason: string | null;
  created_at?: string;
  updated_at?: string;
};

function formatDate(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString("id-ID", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(isAvailable: boolean) {
  if (isAvailable) return { label: "Tersedia", variant: "default" as const };
  return { label: "Cuti/Izin", variant: "error" as const };
}

export default function TechnicianLeavePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const [rows, setRows] = useState<AvailabilityRow[]>([]);

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
      console.error("leave init error:", e);
      toast.error(e?.message || "Gagal memuat halaman cuti");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    const res = await fetch("/api/technician/leave/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error || "Gagal memuat data cuti");
      setRows([]);
      return;
    }

    setRows((json.rows || []) as AvailabilityRow[]);

    if (!date) {
      const today = (json.today as string | undefined) || "";
      if (today) setDate(today);
    }
  };

  const submitLeave = async () => {
    if (!date) {
      toast.error("Tanggal cuti wajib diisi");
      return;
    }

    if (!reason.trim()) {
      toast.error("Alasan cuti/izin wajib diisi");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/technician/leave/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, isAvailable: false, reason }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Gagal mengajukan cuti/izin");
        return;
      }

      toast.success("Pengajuan cuti/izin tersimpan");
      setReason("");
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Cuti</h1>
        <p className="text-sm text-gray-600">Ajukan cuti/izin dan lihat jadwal ketersediaan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajukan cuti/izin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="h-10 flex items-center">
                <Badge variant="error">Cuti/Izin</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alasan</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: sakit / urusan keluarga / keperluan administrasi"
              rows={3}
              disabled={submitting}
            />
          </div>

          <Button type="button" onClick={submitLeave} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Kirim pengajuan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jadwal (60 hari ke depan)</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-gray-600">Belum ada jadwal cuti/izin.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const b = statusBadge(r.is_available);
                    return (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <Badge variant={b.variant}>{b.label}</Badge>
                        </td>
                        <td className="py-2 pr-3">{r.reason || "-"}</td>
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
