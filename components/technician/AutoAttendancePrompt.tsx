"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type AttendanceRow = {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  notes: string | null;
};

type TodayResponse = {
  today: string;
  todayRow: AttendanceRow | null;
};

function getJakartaMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function formatJakartaDateLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map((v) => Number(v));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Mode = "clock-in" | "clock-out";

const STORAGE_PREFIX = "hvac:auto_attendance_prompt";

export default function AutoAttendancePrompt() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayISO, setTodayISO] = useState<string>("");
  const [todayRow, setTodayRow] = useState<AttendanceRow | null>(null);
  const [notes, setNotes] = useState<string>("");

  const sessionKey = useMemo(() => {
    const day = todayISO || "unknown";
    return `${STORAGE_PREFIX}:${day}`;
  }, [todayISO]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoading(true);
        const res = await fetch("/api/technician/attendance/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const json = (await res.json()) as Partial<TodayResponse> & { error?: string };
        if (!res.ok) {
          // Don't block dashboard; just skip prompt.
          return;
        }

        if (cancelled) return;

        const day = String(json.today || "");
        const row = (json.todayRow || null) as AttendanceRow | null;
        setTodayISO(day);
        setTodayRow(row);
        setNotes((row?.notes as string | null) || "");

        const canClockIn = !row?.clock_in_time;
        const canClockOut = Boolean(row?.clock_in_time) && !row?.clock_out_time;

        const nowMinutes = getJakartaMinutes();
        const isSore = nowMinutes >= 17 * 60; // >= 17:00 WIB

        const alreadyPrompted = (() => {
          try {
            const raw = sessionStorage.getItem(sessionKey);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as { clockIn?: boolean; clockOut?: boolean };
            if (canClockIn) return Boolean(parsed.clockIn);
            if (canClockOut && isSore) return Boolean(parsed.clockOut);
            return false;
          } catch {
            return false;
          }
        })();

        if (alreadyPrompted) return;

        if (canClockIn) {
          setMode("clock-in");
          setOpen(true);
          return;
        }

        if (canClockOut && isSore) {
          setMode("clock-out");
          setOpen(true);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
    // sessionKey depends on todayISO, which is set by init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  const dismiss = () => {
    if (!todayISO || !mode) {
      setOpen(false);
      return;
    }

    try {
      const raw = sessionStorage.getItem(sessionKey);
      const parsed = raw ? (JSON.parse(raw) as any) : {};
      const next = {
        ...parsed,
        ...(mode === "clock-in" ? { clockIn: true } : {}),
        ...(mode === "clock-out" ? { clockOut: true } : {}),
      };
      sessionStorage.setItem(sessionKey, JSON.stringify(next));
    } catch {
      // ignore
    }

    setOpen(false);
  };

  const submit = async () => {
    if (!mode) return;

    try {
      setSubmitting(true);
      const url = mode === "clock-in" ? "/api/technician/attendance/clock-in" : "/api/technician/attendance/clock-out";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || (mode === "clock-in" ? "Clock-in gagal" : "Clock-out gagal"));
        return;
      }

      toast.success(mode === "clock-in" ? "Clock-in berhasil" : "Clock-out berhasil");

      // Mark prompted so it doesn't reopen immediately.
      try {
        const raw = sessionStorage.getItem(sessionKey);
        const parsed = raw ? (JSON.parse(raw) as any) : {};
        const next = {
          ...parsed,
          ...(mode === "clock-in" ? { clockIn: true } : {}),
          ...(mode === "clock-out" ? { clockOut: true } : {}),
        };
        sessionStorage.setItem(sessionKey, JSON.stringify(next));
      } catch {
        // ignore
      }

      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!mode) return null;

  const title = mode === "clock-in" ? "Clock-in" : "Clock-out";
  const description =
    mode === "clock-in"
      ? "Anda belum absen masuk hari ini. Silakan clock-in untuk memulai aktivitas."
      : "Waktunya pulang. Silakan clock-out untuk menyelesaikan absensi hari ini.";

  const dateLabel = todayISO ? formatJakartaDateLabel(todayISO) : "";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}{dateLabel ? ` — ${dateLabel}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Catatan (opsional)</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: mulai kerja di lokasi A / kendala transport"
              rows={3}
              disabled={submitting}
            />
          </div>

          {mode === "clock-out" && todayRow?.clock_in_time ? (
            <p className="text-xs text-muted-foreground">
              Clock-in terdeteksi: {new Date(todayRow.clock_in_time).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={dismiss} disabled={submitting}>
            Nanti
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "clock-in" ? "Clock-in" : "Clock-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
