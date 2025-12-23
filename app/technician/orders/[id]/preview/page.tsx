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
      
      const { data: techData } = await supabase
        .from('technicians')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();
      
      if (!techData) {
        toast.error("Teknisi tidak ditemukan");
        return;
      }
      
      // Fetch work log with all data
      const { data: workLog, error } = await supabase
        .from('technician_work_logs')
        .select('*')
        .eq('service_order_id', orderId)
        .eq('technician_id', techData.id)
        .maybeSingle();
      
      if (error || !workLog) {
        toast.error("Data teknis tidak ditemukan");
        router.push("/technician/dashboard");
        return;
      }
      
      // Fetch order data
      const { data: order } = await supabase
        .from('service_orders')
        .select(`
          *,
          clients (
            name,
            address,
            phone
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (order) {
        setOrderData(order);
        
        // Generate PDF
        const pdfBlob = await generateTechnicalReportPDF({
          order_number: order.order_number,
          service_title: order.service_title,
          client_name: order.clients?.name,
          location: order.location_address || order.clients?.address,
          scheduled_date: order.scheduled_date,
          technician_name: techData.full_name || workLog.signature_technician_name,

          problem: workLog.problem,
          tindakan: workLog.tindakan,
          rincian_pekerjaan: workLog.rincian_pekerjaan,
          rincian_kerusakan: workLog.rincian_kerusakan,
          catatan_rekomendasi: workLog.catatan_rekomendasi,
          lama_kerja: workLog.lama_kerja,
          jarak_tempuh: workLog.jarak_tempuh,
          signature_technician: workLog.signature_technician,
          signature_client: workLog.signature_client,
          signature_technician_name: workLog.signature_technician_name,
          signature_client_name: workLog.signature_client_name,
          signature_date: workLog.signature_date,
          photos: workLog.documentation_photos || [],
          photo_captions: workLog.photo_captions || [],
          work_type: workLog.work_type,
          check_type: workLog.check_type,
          ac_units_data: workLog.ac_units_data || [],
          maintenance_units_data: workLog.maintenance_units_data || [],

          // Installation/measurement fields (stored as columns)
          mcb_1: workLog.mcb_1,
          mcb_2: workLog.mcb_2,
          mcb_3: workLog.mcb_3,
          mcb_4: workLog.mcb_4,
          mcb_5: workLog.mcb_5,
          volt_1: workLog.volt_1,
          volt_2: workLog.volt_2,
          volt_3: workLog.volt_3,
          volt_4: workLog.volt_4,
          volt_5: workLog.volt_5,
          ampere_total_1: workLog.ampere_total_1,
          ampere_total_2: workLog.ampere_total_2,
          ampere_total_3: workLog.ampere_total_3,
          ampere_total_4: workLog.ampere_total_4,
          ampere_total_5: workLog.ampere_total_5,
          ampere_kompressor_1: workLog.ampere_kompressor_1,
          ampere_kompressor_2: workLog.ampere_kompressor_2,
          ampere_kompressor_3: workLog.ampere_kompressor_3,
          ampere_kompressor_4: workLog.ampere_kompressor_4,
          ampere_kompressor_5: workLog.ampere_kompressor_5,
          ampere_kipas_1: workLog.ampere_kipas_1,
          ampere_kipas_2: workLog.ampere_kipas_2,
          ampere_kipas_3: workLog.ampere_kipas_3,
          ampere_kipas_4: workLog.ampere_kipas_4,
          ampere_kipas_5: workLog.ampere_kipas_5,
          tekanan_tinggi_1: workLog.tekanan_tinggi_1,
          tekanan_tinggi_2: workLog.tekanan_tinggi_2,
          tekanan_tinggi_3: workLog.tekanan_tinggi_3,
          tekanan_tinggi_4: workLog.tekanan_tinggi_4,
          tekanan_tinggi_5: workLog.tekanan_tinggi_5,
          tekanan_rendah_1: workLog.tekanan_rendah_1,
          tekanan_rendah_2: workLog.tekanan_rendah_2,
          tekanan_rendah_3: workLog.tekanan_rendah_3,
          tekanan_rendah_4: workLog.tekanan_rendah_4,
          tekanan_rendah_5: workLog.tekanan_rendah_5,
          kondensor_in_out_1: workLog.kondensor_in_out_1,
          kondensor_in_out_2: workLog.kondensor_in_out_2,
          kondensor_in_out_3: workLog.kondensor_in_out_3,
          kondensor_in_out_4: workLog.kondensor_in_out_4,
          kondensor_in_out_5: workLog.kondensor_in_out_5,
          evaporator_in_out_1: workLog.evaporator_in_out_1,
          evaporator_in_out_2: workLog.evaporator_in_out_2,
          evaporator_in_out_3: workLog.evaporator_in_out_3,
          evaporator_in_out_4: workLog.evaporator_in_out_4,
          evaporator_in_out_5: workLog.evaporator_in_out_5,
          temp_ruang_1: workLog.temp_ruang_1,
          temp_ruang_2: workLog.temp_ruang_2,
          temp_ruang_3: workLog.temp_ruang_3,
          temp_ruang_4: workLog.temp_ruang_4,
          temp_ruang_5: workLog.temp_ruang_5,
          lain_lain: workLog.lain_lain,
        });

        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error("Gagal memuat PDF");
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
