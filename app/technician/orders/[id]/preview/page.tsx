"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateTechnicalReportPDF } from "@/lib/pdf-generator";

export default function PreviewPDFPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    loadPDFData();
  }, [orderId]);

  useEffect(() => {
    // When coming back from edit screen, refresh so preview shows the latest saved data.
    const onFocus = () => {
      if (!loading) loadPDFData();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loading, orderId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const loadPDFData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get technician ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User tidak ditemukan");
        router.push("/technician/login");
        return;
      }

      // IMPORTANT: Use the same API as client document downloads.
      // This avoids accidentally selecting an empty check-in/out log and ensures spareparts/photos/signatures are included.
      const response = await fetch(`/api/reports/${orderId}/pdf`, { cache: 'no-store' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        throw new Error(errorData?.error || 'Data teknis tidak ditemukan');
      }

      const reportData = await response.json();
      setOrderData({ order_number: reportData.orderNumber || reportData.order_number || '' });

      const pdfBlob = await generateTechnicalReportPDF(reportData);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error(error instanceof Error ? error.message : "Gagal memuat PDF");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  const handleDownload = () => {
    if (pdfUrl && orderData) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Laporan-Teknis-${orderData.order_number}.pdf`;
      link.click();
      toast.success("PDF berhasil diunduh");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Memuat PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/technician/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg">Preview Laporan Teknis</h1>
                <p className="text-sm text-muted-foreground">
                  {orderData?.order_number}
                </p>
              </div>
            </div>
            <Button onClick={handleDownload} disabled={!pdfUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* PDF Viewer */}
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-0">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[calc(100vh-180px)] border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Tidak ada PDF untuk ditampilkan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
