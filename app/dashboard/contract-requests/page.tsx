"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Send, CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import QuotationForm from "@/components/QuotationForm";

interface ContractRequest {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  city?: string;
  unit_count: number;
  location_count: number;
  preferred_frequency: string;
  notes?: string;
  status: string;
  quotation_amount?: number;
  quotation_notes?: string;
  created_at: string;
}

export default function ContractRequestsPage() {
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ContractRequest | null>(null);
  const [quotationAmount, setQuotationAmount] = useState("");
  const [quotationNotes, setQuotationNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationRequest, setQuotationRequest] = useState<ContractRequest | null>(null);
  const [tenantId, setTenantId] = useState<string>("");

  const fetchRequests = async () => {
    try {
      const supabase = createClient();
      
      // Get user's tenant
      const { data: userData } = await supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (userData) {
        setTenantId(userData.tenant_id);
      }

      const { data, error } = await supabase
        .from("contract_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSendQuotation = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("contract_requests")
        .update({
          quotation_amount: parseFloat(quotationAmount),
          quotation_notes: quotationNotes,
          quotation_sent_at: new Date().toISOString(),
          status: "quoted",
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("Penawaran berhasil dikirim!");
      setSelectedRequest(null);
      setQuotationAmount("");
      setQuotationNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error sending quotation:", error);
      toast.error("Gagal mengirim penawaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("contract_requests")
        .update({ status: "approved" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Kontrak disetujui!");
      fetchRequests();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Gagal menyetujui");
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("contract_requests")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Permintaan ditolak");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Gagal menolak");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "Pending" },
      quoted: { variant: "default", label: "Penawaran Dikirim" },
      approved: { variant: "default", label: "Disetujui", className: "bg-green-500" },
      rejected: { variant: "destructive", label: "Ditolak" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: "Bulanan",
      quarterly: "3 Bulan",
      semi_annual: "6 Bulan",
      custom: "Custom",
    };
    return labels[freq] || freq;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permintaan Kontrak Maintenance</h1>
        <p className="text-muted-foreground mt-1">
          Kelola permintaan kontrak dari pelanggan
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">Belum ada permintaan kontrak</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Frekuensi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{request.company_name}</p>
                      <p className="text-xs text-muted-foreground">{request.city}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{request.contact_person}</p>
                      <p className="text-muted-foreground">{request.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.unit_count} unit
                    {request.location_count > 1 && ` · ${request.location_count} lokasi`}
                  </TableCell>
                  <TableCell>{getFrequencyLabel(request.preferred_frequency)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(request.created_at).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {request.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => {
                              setQuotationRequest(request);
                              setShowQuotationForm(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Buat Penawaran
                          </Button>
                        </>
                      )}
                      {request.status === "quoted" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Permintaan Kontrak</DialogTitle>
            <DialogDescription>
              {selectedRequest?.company_name}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Perusahaan</Label>
                  <p className="font-medium">{selectedRequest.company_name}</p>
                </div>
                <div>
                  <Label>Kontak</Label>
                  <p className="font-medium">{selectedRequest.contact_person}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.phone}</p>
                </div>
                <div>
                  <Label>Jumlah Unit</Label>
                  <p className="font-medium">{selectedRequest.unit_count} unit</p>
                </div>
                <div>
                  <Label>Jumlah Lokasi</Label>
                  <p className="font-medium">{selectedRequest.location_count} cabang</p>
                </div>
                <div>
                  <Label>Frekuensi</Label>
                  <p className="font-medium">{getFrequencyLabel(selectedRequest.preferred_frequency)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <Label>Catatan</Label>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Buat Penawaran</h4>
                  <div>
                    <Label>Nilai Penawaran (Rp)</Label>
                    <Input
                      type="number"
                      placeholder="5000000"
                      value={quotationAmount}
                      onChange={(e) => setQuotationAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Detail Penawaran</Label>
                    <Textarea
                      rows={4}
                      placeholder="Rincian harga per unit, frekuensi, dll..."
                      value={quotationNotes}
                      onChange={(e) => setQuotationNotes(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSendQuotation}
                    disabled={isSubmitting || !quotationAmount}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Mengirim..." : "Kirim Penawaran"}
                  </Button>
                </div>
              )}

              {selectedRequest.quotation_amount && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Penawaran Terkirim</h4>
                  <p className="font-bold text-lg">Rp {selectedRequest.quotation_amount.toLocaleString("id-ID")}</p>
                  {selectedRequest.quotation_notes && (
                    <p className="text-sm mt-2">{selectedRequest.quotation_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quotation Form Dialog */}
      <Dialog open={showQuotationForm} onOpenChange={setShowQuotationForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Surat Penawaran</DialogTitle>
            <DialogDescription>
              Buat penawaran professional untuk {quotationRequest?.company_name}
            </DialogDescription>
          </DialogHeader>
          {quotationRequest && tenantId && (
            <QuotationForm
              contractRequest={quotationRequest}
              tenantId={tenantId}
              onSuccess={() => {
                setShowQuotationForm(false);
                fetchRequests();
              }}
              onCancel={() => setShowQuotationForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
