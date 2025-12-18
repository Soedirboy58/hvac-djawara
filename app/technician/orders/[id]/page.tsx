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
  XCircle,
  Loader2,
  Upload,
  MapPinned,
  FileText,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import TechnicalDataForm from "@/components/technician/TechnicalDataForm";

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
  const [notes, setNotes] = useState("");
  const [photoBefore, setPhotoBefore] = useState<File | null>(null);
  const [photoAfter, setPhotoAfter] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchWorkOrderData();
  }, [orderId]);

  const fetchWorkOrderData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/technician/login");
        return;
      }

      // Get technician ID
      const { data: techData } = await supabase
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!techData) throw new Error("Technician not found");
      setTechnicianId(techData.id);

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
      setUploading(true);
      const location = await getCurrentLocation();
      const supabase = createClient();

      const { data, error } = await supabase
        .from("technician_work_logs")
        .insert({
          service_order_id: orderId,
          technician_id: technicianId,
          check_in_time: new Date().toISOString(),
          location_lat: location.lat,
          location_lng: location.lng,
          notes: notes,
        })
        .select()
        .single();

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
      await supabase
        .from("service_orders")
        .update({ status: "in_progress" })
        .eq("id", orderId);

    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(error.message || "Check-in gagal");
    } finally {
      setUploading(false);
    }
  };

  const uploadPhoto = async (file: File, type: "before" | "after") => {
    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${orderId}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `${technicianId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("work-photos")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("work-photos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleCheckOut = async () => {
    try {
      setUploading(true);
      const location = await getCurrentLocation();
      const supabase = createClient();

      let photoBeforeUrl = workLog?.photo_before_url;
      let photoAfterUrl = workLog?.photo_after_url;

      // Upload photos if provided
      if (photoBefore && !photoBeforeUrl) {
        photoBeforeUrl = await uploadPhoto(photoBefore, "before");
      }
      if (photoAfter) {
        photoAfterUrl = await uploadPhoto(photoAfter, "after");
      }

      // Update work log
      const { error } = await supabase
        .from("technician_work_logs")
        .update({
          check_out_time: new Date().toISOString(),
          location_lat: location.lat,
          location_lng: location.lng,
          notes: notes,
          photo_before_url: photoBeforeUrl,
          photo_after_url: photoAfterUrl,
        })
        .eq("id", workLog!.id);

      if (error) throw error;

      toast.success("Check-out berhasil!");

      // Update assignment status
      await supabase
        .from("work_order_assignments")
        .update({ assignment_status: "completed" })
        .eq("service_order_id", orderId)
        .eq("technician_id", technicianId);

      // Update order status
      await supabase
        .from("service_orders")
        .update({ status: "completed" })
        .eq("id", orderId);

      router.push("/technician/dashboard");
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast.error(error.message || "Check-out gagal");
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
        {workLog && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Pekerjaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Check-in: {new Date(workLog.check_in_time!).toLocaleString("id-ID")}
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

            <TechnicalDataForm
              orderId={orderId}
              technicianId={technicianId}
              onSuccess={() => {
                toast.success("Data teknis berhasil disimpan!");
                router.push("/technician/dashboard");
              }}
            />
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

            {/* Photos */}
            {isCheckedIn && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Foto Pekerjaan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="photo-before">Foto Sebelum</Label>
                    <Input
                      id="photo-before"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setPhotoBefore(e.target.files?.[0] || null)}
                      disabled={isCompleted || !!workLog?.photo_before_url}
                    />
                    {workLog?.photo_before_url && (
                      <p className="text-xs text-green-600 mt-1">✓ Foto sudah diupload</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="photo-after">Foto Sesudah</Label>
                    <Input
                      id="photo-after"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setPhotoAfter(e.target.files?.[0] || null)}
                      disabled={isCompleted}
                    />
                    {workLog?.photo_after_url && (
                      <p className="text-xs text-green-600 mt-1">✓ Foto sudah diupload</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-3 pb-6">
              {!workLog && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckIn}
                  disabled={uploading}
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
                  disabled={uploading || !photoBefore}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Check-out & Selesaikan
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
