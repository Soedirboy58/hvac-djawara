"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Upload,
  MapPinned,
  FileText,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import EnhancedTechnicalDataForm from "@/components/technician/EnhancedTechnicalDataForm";

interface WorkOrder {
  id: string;
  order_number: string;
  service_title: string;
  service_description: string;
  location_address: string;
  scheduled_date: string;
  status: string;
  priority: string;
  estimated_duration: number;
}

interface WorkLog {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
}

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [workLog, setWorkLog] = useState<WorkLog | null>(null);
  const [technicianId, setTechnicianId] = useState<string>("");
  const [isHelper, setIsHelper] = useState(false);
  const [roleInOrder, setRoleInOrder] = useState<string | null>(null);
  const [isPicInOrder, setIsPicInOrder] = useState<boolean>(true);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchWorkOrderData();
  }, [orderId]);

  const fetchWorkOrderData = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Auth error:", authError);
        toast.error("Sesi login telah berakhir");
        router.push("/technician/login");
        return;
      }

      console.log("✓ User authenticated:", user.id);

      // Determine if current user is helper/magang (read-only)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      if (profileData?.active_tenant_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_tenant_roles')
          .select('role')
          .eq('tenant_id', profileData.active_tenant_id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (roleError) {
          console.error('Role error:', roleError);
        }

        const role = (roleData as any)?.role as string | undefined;
        setIsHelper((role || '').toLowerCase() === 'helper' || (role || '').toLowerCase() === 'magang');
      }

      // Get technician ID
      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (techError || !techData) {
        console.error("Technician not found:", techError);
        toast.error("Data teknisi tidak ditemukan");
        return;
      }
      
      console.log("✓ Technician ID:", techData.id);
      setTechnicianId(techData.id);

      // Determine per-order role (PIC vs helper) from assignments
      try {
        const { data: assignmentRow, error: assignmentErr } = await supabase
          .from('work_order_assignments')
          .select('role_in_order')
          .eq('service_order_id', orderId)
          .eq('technician_id', techData.id)
          .maybeSingle()

        if (assignmentErr) {
          console.error('Assignment role error:', assignmentErr)
        }

        const role = String((assignmentRow as any)?.role_in_order || 'primary').toLowerCase()
        setRoleInOrder(role)
        setIsPicInOrder(role === 'primary' || role === 'supervisor')
      } catch (e) {
        // Backward compatibility: if assignments missing, allow as PIC (same as previous behavior)
        setRoleInOrder(null)
        setIsPicInOrder(true)
      }

      // Fetch work order
      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      setWorkOrder(orderData);

      // Fetch work log if exists
      const { data: logData } = await supabase
        .from("technician_work_logs")
        .select("*")
        .eq("service_order_id", orderId)
        .eq("technician_id", techData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logData) {
        setWorkLog(logData);
        setNotes(logData.notes || "");
      }
    } catch (error: any) {
      console.error("Error fetching work order:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation tidak tersedia"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  const handleCheckIn = async () => {
    try {
      if (isHelper) {
        toast.error('Akun helper hanya bisa melihat (read-only)');
        return;
      }
      setUploading(true);
      const location = await getCurrentLocation();
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      // Reuse an existing open work log row if present (avoid duplicates)
      const { data: existingLog } = await supabase
        .from('technician_work_logs')
        .select('id, check_in_time, check_out_time')
        .eq('service_order_id', orderId)
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let data: any = null;
      let error: any = null;

      if (existingLog?.id && !existingLog.check_out_time) {
        const updateRes = await supabase
          .from('technician_work_logs')
          .update({
            check_in_time: existingLog.check_in_time || nowIso,
            location_lat: location.lat,
            location_lng: location.lng,
            notes: notes,
          })
          .eq('id', existingLog.id)
          .select()
          .single();
        data = updateRes.data;
        error = updateRes.error;
      } else {
        const insertRes = await supabase
          .from("technician_work_logs")
          .insert({
            service_order_id: orderId,
            technician_id: technicianId,
            check_in_time: nowIso,
            location_lat: location.lat,
            location_lng: location.lng,
            notes: notes,
          })
          .select()
          .single();
        data = insertRes.data;
        error = insertRes.error;
      }

      if (error) throw error;

      setWorkLog(data);
      toast.success("Check-in berhasil!");

      // Update assignment status
      await supabase
        .from("work_order_assignments")
        .update({ assignment_status: "in_progress" })
        .eq("service_order_id", orderId)
        .eq("technician_id", technicianId);

      // Update order status
      // Best-effort set actual_start_time if column exists.
      {
        let soUpd = await supabase
          .from("service_orders")
          .update({ status: "in_progress", actual_start_time: nowIso })
          .eq("id", orderId);
        if (soUpd.error) {
          soUpd = await supabase
            .from("service_orders")
            .update({ status: "in_progress" })
            .eq("id", orderId);
        }
      }

    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(error.message || "Check-in gagal");
    } finally {
      setUploading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      if (isHelper) {
        toast.error('Akun helper hanya bisa melihat (read-only)');
        return;
      }
      setUploading(true);
      const supabase = createClient();
      const nowIso = new Date().toISOString();

      // Update work log (notes only). Photo before is temporarily disabled in UI.
      const { error } = await supabase
        .from("technician_work_logs")
        .update({
          notes: notes,
        })
        .eq("id", workLog!.id);

      if (error) throw error;

      toast.success("Data tersimpan. Silakan lanjut isi laporan teknis!");

      // Update assignment status to completed so technician can fill technical report
      await supabase
        .from("work_order_assignments")
        .update({ assignment_status: "completed" })
        .eq("service_order_id", orderId)
        .eq("technician_id", technicianId);

      // Update order status to completed - will trigger technical form display
      // Best-effort set completion timestamps if columns exist.
      {
        let soUpd = await supabase
          .from("service_orders")
          .update({ status: "completed", actual_end_time: nowIso, completed_at: nowIso })
          .eq("id", orderId);
        if (soUpd.error) {
          soUpd = await supabase
            .from("service_orders")
            .update({ status: "completed" })
            .eq("id", orderId);
        }
      }

      // Refresh the page to show technical form
      fetchWorkOrderData();
      
    } catch (error: any) {
      console.error("Save photo error:", error);
      toast.error(error.message || "Gagal menyimpan data");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Work order tidak ditemukan</p>
      </div>
    );
  }

  const isCheckedIn = workLog?.check_in_time && !workLog?.check_out_time;
  const isCompleted = workLog?.check_out_time;
  const isOrderCompleted = workOrder.status === "completed";
  const canFillTechnical = !isHelper && isPicInOrder;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">Detail Tugas</h1>
              <p className="text-sm text-muted-foreground">{workOrder.order_number}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {isHelper && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-amber-700" />
                <div>
                  <h3 className="font-semibold text-amber-900">Mode Helper (Read-only)</h3>
                  <p className="text-sm text-amber-800">
                    Helper bisa melihat detail order dan assignment, tapi tidak bisa check-in/out dan tidak bisa mengisi data teknis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Work Order Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{workOrder.service_title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {workOrder.service_description}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-blue-500">{workOrder.status}</Badge>
                <Badge className="bg-orange-500">{workOrder.priority}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{workOrder.location_address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(workOrder.scheduled_date).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Estimasi: {workOrder.estimated_duration} jam</span>
            </div>
          </CardContent>
        </Card>

        {/* Work Log Status */}
        {workLog && workLog.check_in_time && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Pekerjaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Check-in: {new Date(workLog.check_in_time).toLocaleString("id-ID")}
                </span>
              </div>
              {workLog.check_out_time && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">
                    Check-out: {new Date(workLog.check_out_time).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              {workLog.location_lat && workLog.location_lng && (
                <div className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">
                    Lokasi: {workLog.location_lat.toFixed(6)}, {workLog.location_lng.toFixed(6)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Show different content based on order status */}
        {isOrderCompleted ? (
          // Technical Data Form for completed orders
          <>
            {!canFillTechnical ? (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-gray-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Data Teknis</h3>
                      <p className="text-sm text-gray-700">
                        {isHelper
                          ? 'Akun helper tidak dapat mengisi laporan teknis.'
                          : 'Anda bukan PIC untuk order ini. Hanya PIC yang dapat mengisi laporan teknis.'}
                      </p>
                      {!isHelper && roleInOrder ? (
                        <p className="text-xs text-gray-500 mt-1">Role di order: {roleInOrder}</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-blue-900">Lengkapi Data Teknis</h3>
                        <p className="text-sm text-blue-700">
                          Order ini sudah selesai. Silakan lengkapi data teknis dan dokumentasi pekerjaan.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <EnhancedTechnicalDataForm
                  orderId={orderId}
                  technicianId={technicianId}
                  onSuccess={() => {
                    toast.success("Laporan pekerjaan berhasil disimpan!");
                    // Force hard navigation to dashboard with timestamp to bust cache
                    setTimeout(() => {
                      window.location.href = "/technician/dashboard?refresh=" + Date.now();
                    }, 500);
                  }}
                />
              </>
            )}
          </>
        ) : (
          <>
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catatan Pekerjaan</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tulis catatan pekerjaan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  disabled={isCompleted}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3 pb-6">
              {!workLog && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckIn}
                  disabled={uploading || isHelper}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MapPinned className="mr-2 h-5 w-5" />
                      Check-in & Mulai Pekerjaan
                    </>
                  )}
                </Button>
              )}

              {isCheckedIn && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckOut}
                  disabled={uploading || isHelper}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Simpan & Lanjut ke Laporan Teknis
                    </>
                  )}
                </Button>
              )}

              {isCompleted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Pekerjaan Selesai</p>
                  <p className="text-sm text-green-600">
                    Terima kasih atas kerja kerasnya!
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
