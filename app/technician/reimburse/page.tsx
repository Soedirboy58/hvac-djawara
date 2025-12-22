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
import { FileText, Upload } from "lucide-react";

type ReimburseCategory = {
  id: string;
  name: string;
};

type ReimburseRequest = {
  id: string;
  created_at: string;
  status: string;
  amount: number;
  description: string | null;
  receipt_path: string;
  reimburse_categories?: { name: string } | null;
};

type TechnicianRow = {
  id: string;
  tenant_id: string;
  full_name: string;
};

export default function TechnicianReimbursePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [technician, setTechnician] = useState<TechnicianRow | null>(null);

  const [categories, setCategories] = useState<ReimburseCategory[]>([]);
  const [requests, setRequests] = useState<ReimburseRequest[]>([]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("id, tenant_id, full_name")
        .eq("user_id", user.id)
        .single();

      if (techError || !techData) {
        throw new Error("Teknisi tidak ditemukan. Hubungi admin.");
      }

      setTechnician(techData);

      // Set active tenant (for RLS-based queries)
      await supabase
        .from("profiles")
        .update({ active_tenant_id: techData.tenant_id })
        .eq("id", user.id);

      await Promise.all([fetchCategories(techData.tenant_id), fetchRequests(techData.tenant_id, user.id)]);
    } catch (e: any) {
      console.error("init reimburse error:", e);
      toast.error(e?.message || "Gagal memuat halaman reimburse");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (tenantId: string) => {
    const { data, error } = await supabase
      .from("reimburse_categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("fetchCategories error:", error);
      // If table/policy not ready, show friendly message but keep page usable
      toast.error("Kategori reimburse belum siap. Pastikan SQL module reimburse sudah dijalankan di Supabase.");
      setCategories([]);
      return;
    }

    setCategories((data || []) as ReimburseCategory[]);
  };

  const fetchRequests = async (tenantId: string, userId: string) => {
    const { data, error } = await supabase
      .from("reimburse_requests")
      .select("id, created_at, status, amount, description, receipt_path, reimburse_categories(name)")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchRequests error:", error);
      setRequests([]);
      return;
    }

    setRequests((data || []) as ReimburseRequest[]);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: "bg-blue-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
      paid: "bg-emerald-600",
    };

    return <Badge className={map[status] || "bg-gray-500"}>{status}</Badge>;
  };

  const handleSubmit = async () => {
    try {
      if (!technician) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/technician/login");
        return;
      }

      if (!categoryId) {
        toast.error("Pilih kategori terlebih dahulu");
        return;
      }

      const amountNumber = Number(amount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        toast.error("Masukkan nominal yang valid");
        return;
      }

      if (!receiptFile) {
        toast.error("Nota/struk wajib diupload");
        return;
      }

      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!validTypes.includes(receiptFile.type)) {
        toast.error("File harus berupa PDF/JPG/PNG/WebP");
        return;
      }

      setSubmitting(true);

      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const receiptPath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("reimburse-receipts")
        .upload(receiptPath, receiptFile, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("reimburse_requests").insert({
        tenant_id: technician.tenant_id,
        user_id: user.id,
        category_id: categoryId,
        amount: amountNumber,
        description: description || null,
        receipt_path: receiptPath,
        status: "submitted",
      });

      if (insertError) throw insertError;

      toast.success("Pengajuan reimburse berhasil dikirim");
      setCategoryId("");
      setAmount("");
      setDescription("");
      setReceiptFile(null);

      await fetchRequests(technician.tenant_id, user.id);
    } catch (e: any) {
      console.error("submit reimburse error:", e);
      toast.error(e?.message || "Gagal mengirim pengajuan reimburse");
    } finally {
      setSubmitting(false);
    }
  };

  const openReceipt = async (receiptPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("reimburse-receipts")
        .createSignedUrl(receiptPath, 60);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Signed URL not generated");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("openReceipt error:", e);
      toast.error("Gagal membuka nota");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Reimburse</h1>
          <p className="text-sm text-muted-foreground">
            Ajukan penggantian biaya operasional. Nota/struk wajib.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pengajuan Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? "Pilih kategori" : "Kategori belum tersedia"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Nominal</Label>
              <Input
                inputMode="numeric"
                placeholder="Contoh: 150000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Keterangan (opsional)</Label>
              <Textarea
                placeholder="Contoh: Parkir, tol, pembelian sparepart kecil"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Upload Nota/Struk (wajib)</Label>
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              {receiptFile && (
                <p className="text-xs text-muted-foreground">
                  File: {receiptFile.name}
                </p>
              )}
            </div>

            <Button onClick={handleSubmit} disabled={submitting}>
              <Upload className="w-4 h-4 mr-2" />
              {submitting ? "Mengirim..." : "Kirim Pengajuan"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pengajuan Saya</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada pengajuan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">Rp {Number(r.amount).toLocaleString("id-ID")}</span>
                            {getStatusBadge(r.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {r.reimburse_categories?.name || "(Kategori)"} • {new Date(r.created_at).toLocaleDateString("id-ID")}
                          </p>
                          {r.description && (
                            <p className="text-sm mt-2">{r.description}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReceipt(r.receipt_path)}
                        >
                          Lihat Nota
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
