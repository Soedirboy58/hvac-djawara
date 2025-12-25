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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Job = {
  id: string;
  order_number: string;
  service_title: string;
  scheduled_date: string;
  status: string;
};

type OvertimeRequest = {
  id: string;
  request_date: string;
  reason: string;
  estimated_start_time: string;
  estimated_end_time: string;
  estimated_hours: number | null;
  status: "pending" | "approved" | "rejected" | "completed";
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  job_id: string | null;
  service_orders?: { order_number: string; service_title: string } | null;
};

function statusBadge(status: OvertimeRequest["status"]) {
  switch (status) {
    case "pending":
      return { label: "Menunggu", variant: "secondary" as const };
    case "approved":
      return { label: "Disetujui", variant: "default" as const };
    case "rejected":
      return { label: "Ditolak", variant: "error" as const };
    case "completed":
      return { label: "Selesai", variant: "default" as const };
    default:
      return { label: status, variant: "secondary" as const };
  }
}

export default function TechnicianOvertimePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);

  const [jobId, setJobId] = useState<string>("");
  const [requestDate, setRequestDate] = useState<string>("");
  const [estimatedStart, setEstimatedStart] = useState<string>("17:00");
  const [estimatedEnd, setEstimatedEnd] = useState<string>("18:00");
  const [reason, setReason] = useState<string>("");

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

      // Default date = today (local)
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setRequestDate(`${yyyy}-${mm}-${dd}`);

      await Promise.all([fetchMeta(), fetchList()]);
    } catch (e: any) {
      console.error("overtime init error:", e);
      toast.error(e?.message || "Gagal memuat halaman lembur");
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    const res = await fetch("/api/technician/overtime/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error || "Gagal memuat daftar pekerjaan");
      setJobs([]);
      return;
    }

    setJobs((json.jobs || []) as Job[]);
  };

  const fetchList = async () => {
    const res = await fetch("/api/technician/overtime/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error || "Gagal memuat pengajuan lembur");
      setRequests([]);
      return;
    }

    setRequests((json.requests || []) as OvertimeRequest[]);
  };

  const submitRequest = async () => {
    if (!jobId) {
      toast.error("Pilih pekerjaan (order) terlebih dulu");
      return;
    }

    if (!requestDate) {
      toast.error("Tanggal lembur wajib diisi");
      return;
    }

    if (!estimatedStart || !estimatedEnd) {
      toast.error("Jam mulai & selesai wajib diisi");
      return;
    }

    if (!reason.trim()) {
      toast.error("Alasan lembur wajib diisi");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/technician/overtime/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          requestDate,
          reason,
          estimatedStartTime: estimatedStart,
          estimatedEndTime: estimatedEnd,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Gagal mengajukan lembur");
        return;
      }

      toast.success("Pengajuan lembur terkirim");
      setReason("");
      await fetchList();
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
        <h1 className="text-xl font-semibold text-gray-900">Lembur</h1>
        <p className="text-sm text-gray-600">Ajukan lembur (estimasi) dan pantau status persetujuan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajukan lembur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pekerjaan (Order)</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger>
                  <SelectValue placeholder={jobs.length ? "Pilih order" : "Tidak ada order"} />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.order_number} — {j.service_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Estimasi mulai</Label>
              <Input type="time" value={estimatedStart} onChange={(e) => setEstimatedStart(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Estimasi selesai</Label>
              <Input type="time" value={estimatedEnd} onChange={(e) => setEstimatedEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alasan</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: pekerjaan belum selesai; perlu test ulang; tunggu sparepart"
              rows={3}
              disabled={submitting}
            />
          </div>

          <Button type="button" onClick={submitRequest} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Kirim pengajuan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat pengajuan</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-sm text-gray-600">Belum ada pengajuan lembur.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Estimasi</th>
                    <th className="py-2 pr-3">Jam</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const b = statusBadge(r.status);
                    const orderLabel = r.service_orders?.order_number
                      ? `${r.service_orders.order_number}`
                      : r.job_id
                      ? r.job_id.slice(0, 8)
                      : "-";

                    return (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {orderLabel}
                          {r.service_orders?.service_title ? (
                            <div className="text-xs text-gray-500 truncate max-w-[320px]">
                              {r.service_orders.service_title}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.request_date}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {r.estimated_start_time}–{r.estimated_end_time}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {typeof r.estimated_hours === "number" ? r.estimated_hours.toFixed(2) : "-"}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <Badge variant={b.variant}>{b.label}</Badge>
                          {r.status === "rejected" && r.rejection_reason ? (
                            <div className="text-xs text-gray-600 mt-1 max-w-[360px]">
                              Alasan: {r.rejection_reason}
                            </div>
                          ) : null}
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
