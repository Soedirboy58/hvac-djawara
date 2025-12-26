"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  LogOut,
  User,
  Briefcase,
  Eye,
  Edit3,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OrderTimeline from "@/components/technician/OrderTimeline";
import Image from "next/image";

interface Technician {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  employee_id: string | null;
  role: string;
  total_jobs_completed: number;
  average_rating: number;
  status: string;
  availability_status: string;
  avatar_url?: string | null;
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

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
  assignment_status: string;
  assigned_at: string;
  has_technical_report?: boolean;
}

type TechnicianReimburseRequest = {
  id: string;
  submitted_at: string;
  status: "submitted" | "approved" | "rejected" | "paid" | string;
  amount: number;
  reimburse_categories?: { name: string } | null;
};

export default function TechnicianDashboard() {
  const router = useRouter();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [reimburseRequests, setReimburseRequests] = useState<TechnicianReimburseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHelper, setIsHelper] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/technician/login");
        return;
      }

      // Fetch technician data
      const { data: techData, error: techError } = await supabase
        .from("technicians")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (techError) {
        console.error("Error fetching technician:", techError);
        throw new Error("Teknisi tidak ditemukan. Hubungi admin.");
      }
      
      // Fetch profile data (synced from People Management)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const p = profileData as ProfileRow | null;
      setTechnician({
        ...techData,
        // Prefer admin-managed technicians table (People Management) for identity fields.
        // Use profiles only as fallback (or for avatar), because profiles can be stale.
        full_name: techData.full_name || p?.full_name || user.email || "Technician",
        phone: (techData.phone ?? null) ?? (p?.phone ?? null),
        avatar_url: p?.avatar_url ?? null,
      });

      // Set active tenant for this technician to enable RLS access
      if (techData.tenant_id) {
        await supabase
          .from('profiles')
          .update({ active_tenant_id: techData.tenant_id })
          .eq('id', user.id);
      }

      // Determine whether this user is helper/magang for this tenant
      if (techData.tenant_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_tenant_roles')
          .select('role')
          .eq('tenant_id', techData.tenant_id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
        }

        const role = (roleData as any)?.role as string | undefined;
        setIsHelper((role || '').toLowerCase() === 'helper' || (role || '').toLowerCase() === 'magang');
      }

      // Fetch reimburse status summary (use internal API to avoid direct Supabase REST calls)
      try {
        const res = await fetch("/api/technician/reimburse/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (res.ok) {
          setReimburseRequests((json?.requests || []) as TechnicianReimburseRequest[]);
        } else {
          console.warn("fetch reimburse list failed:", json);
          setReimburseRequests([]);
        }
      } catch (reimErr) {
        console.warn("fetch reimburse list error:", reimErr);
        setReimburseRequests([]);
      }

      // Fetch assigned work orders
      const { data: assignmentsData, error: assignError } = await supabase
        .from("work_order_assignments")
        .select("id, status, assigned_at, service_order_id")
        .eq("technician_id", techData.id)
        .in("status", ["assigned", "accepted", "in_progress"])
        .order("assigned_at", { ascending: false });

      if (assignError) {
        console.error("Error fetching assignments:", assignError);
        throw assignError;
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        setWorkOrders([]);
        return;
      }

      // Fetch service orders separately (include all orders)
      const orderIds = assignmentsData.map(a => a.service_order_id);
      const { data: ordersData, error: ordersError } = await supabase
        .from("service_orders")
        .select("id, order_number, service_title, service_description, location_address, scheduled_date, status, priority, estimated_duration")
        .in("id", orderIds);

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        throw ordersError;
      }

      // Merge assignment data with order data
      const formattedOrders: WorkOrder[] = (assignmentsData || [])
        .map((assignment: { status: string; assigned_at: string; service_order_id: string }) => {
          const order = (ordersData || []).find((o) => o.id === assignment.service_order_id);
          if (!order) return null;

          const merged: WorkOrder = {
            ...order,
            assignment_status: assignment.status,
            assigned_at: assignment.assigned_at,
            has_technical_report: false,
          };

          return merged;
        })
        .filter((o): o is WorkOrder => !!o);

      setWorkOrders(formattedOrders);

      // Try to fetch work logs with technical reports (don't break if fails)
      try {
        const technicianId = techData.id; // Use techData.id from earlier query
        const { data: workLogsData, error: logsError } = await supabase
          .from("technician_work_logs")
          .select("service_order_id, completed_at, problem, tindakan, signature_client")
          .eq("technician_id", technicianId);

        console.log("Work logs fetched:", workLogsData?.length || 0, "records");
        if (logsError) {
          console.error("Work logs error:", logsError);
        }

        // Mark orders that have technical reports (check if signature exists)
        if (workLogsData && workLogsData.length > 0) {
          workLogsData.forEach((log: any) => {
            const existingOrder = formattedOrders.find((o) => o.id === log.service_order_id);
            // Has technical report if has client signature (regardless of work type)
            if (existingOrder && log.signature_client) {
              existingOrder.has_technical_report = true;
              console.log("✓ Order", existingOrder.order_number, "HAS technical report (problem + tindakan + signature)");
            } else if (existingOrder) {
              console.log("⚠ Order", existingOrder.order_number, "incomplete:", {
                problem: !!log.problem,
                tindakan: !!log.tindakan,
                signature: !!log.signature_client
              });
            }
          });
          
          // Re-set orders with updated flags
          setWorkOrders([...formattedOrders]);
        }
      } catch (logsErr) {
        console.log("Could not fetch work logs, skipping technical report badges:", logsErr);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/technician/login");
  };

  const handlePreviewPDF = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation(); // Prevent card click
    
    try {
      const supabase = createClient();
      
      // Check if work log exists
      const { data: workLog, error } = await supabase
        .from('technician_work_logs')
        .select('*')
        .eq('service_order_id', orderId)
        .eq('technician_id', technician?.id)
        .maybeSingle();
      
      if (error || !workLog) {
        toast.error("Belum ada data teknis untuk order ini");
        return;
      }
      
      // Navigate to preview
      router.push(`/technician/orders/${orderId}/preview`);
    } catch (error) {
      console.error('Error checking work log:', error);
      toast.error("Gagal membuka preview");
    }
  };

  const handleEditOrder = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation(); // Prevent card click
    router.push(`/technician/orders/${orderId}`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: "bg-blue-500",
      in_progress: "bg-yellow-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return <Badge className={variants[status] || "bg-gray-500"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      urgent: "bg-red-500",
      high: "bg-orange-500",
      normal: "bg-blue-500",
      low: "bg-gray-500",
    };
    return <Badge className={variants[priority] || "bg-gray-500"}>{priority}</Badge>;
  };

  const getReimburseStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      submitted: { cls: "bg-blue-500", label: "Diproses" },
      approved: { cls: "bg-green-600", label: "Disetujui" },
      rejected: { cls: "bg-red-600", label: "Ditolak" },
      paid: { cls: "bg-emerald-600", label: "Dibayarkan" },
    };
    const v = map[status] || { cls: "bg-gray-500", label: status };
    return <Badge className={v.cls}>{v.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Tugas Baru: Order scheduled/in_progress yang belum complete (exclude completed status)
  const pendingOrders = workOrders.filter((o) => 
    o.status !== "completed" && 
    o.status !== "cancelled" && 
    o.assignment_status === "assigned"
  );
  
  // Dalam Proses: Order yang sedang dikerjakan
  const inProgressOrders = workOrders.filter((o) => 
    o.status === "in_progress" || 
    (o.assignment_status === "in_progress" || o.assignment_status === "accepted")
  );
  
  // Order Completed yang perlu diisi form teknis (tampilkan di Tugas Baru dengan label khusus)
  const completedOrders = workOrders.filter((o) => o.status === "completed");

  const reimburseCounts = reimburseRequests.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "submitted") acc.submitted += 1;
      else if (r.status === "approved") acc.approved += 1;
      else if (r.status === "paid") acc.paid += 1;
      else if (r.status === "rejected") acc.rejected += 1;
      return acc;
    },
    { total: 0, submitted: 0, approved: 0, paid: 0, rejected: 0 }
  );

  const latestReimburse = reimburseRequests[0] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b md:sticky md:top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{technician?.full_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {technician?.employee_id || technician?.email}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
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
                    Tugas ditampilkan untuk monitoring. Hanya teknisi yang bisa membuka dan menindaklanjuti order.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Technician Profile */}
        {technician && (
          <Card>
            <CardHeader>
              <CardTitle>Profil Teknisi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nama</p>
                      <p className="font-medium">{technician.full_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium break-all">{technician.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">ID Karyawan</p>
                      <p className="font-medium">{technician.employee_id || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className="font-medium">{technician.role}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status Akun</p>
                      <div>
                        <Badge
                          className={
                            technician.status === "active" ? "bg-green-500" : "bg-gray-500"
                          }
                        >
                          {technician.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Ketersediaan</p>
                      <div>
                        <Badge
                          className={
                            technician.availability_status === "available"
                              ? "bg-blue-500"
                              : "bg-gray-500"
                          }
                        >
                          {technician.availability_status}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Job Selesai</p>
                      <p className="font-medium">{technician.total_jobs_completed ?? 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Rating Rata-rata</p>
                      <p className="font-medium">⭐ {technician.average_rating?.toFixed(1) || "0.0"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Kontak</p>
                      <p className="font-medium">{technician.phone || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Foto profil (sinkron dari People Management) */}
                <div className="lg:w-56">
                  <div className="relative h-80 lg:h-56 w-full max-w-xs mx-auto lg:mx-0 rounded-xl overflow-hidden border border-border bg-muted p-2">
                    {technician.avatar_url ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={technician.avatar_url}
                          alt={technician.full_name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 1024px) 100vw, 224px"
                        />
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
                        Belum ada foto
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-border" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Tugas Baru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Dalam Proses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {inProgressOrders.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Selesai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {completedOrders.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ⭐ {technician?.average_rating.toFixed(1) || "0.0"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reimburse Indicator */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reimburse</CardTitle>
            <Button type="button" variant="outline" onClick={() => router.push("/technician/reimburse")}
            >
              Lihat
            </Button>
          </CardHeader>
          <CardContent>
            {reimburseCounts.total === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pengajuan reimburse.</p>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Status terakhir</p>
                  {latestReimburse ? (
                    <div className="flex items-center gap-2">
                      {getReimburseStatusBadge(latestReimburse.status)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(latestReimburse.submitted_at).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Diproses: {reimburseCounts.submitted}</Badge>
                  <Badge className="bg-green-600">Disetujui: {reimburseCounts.approved}</Badge>
                  <Badge className="bg-emerald-600">Dibayarkan: {reimburseCounts.paid}</Badge>
                  <Badge className="bg-red-600">Ditolak: {reimburseCounts.rejected}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Tugas</CardTitle>
          </CardHeader>
          <CardContent>
            {workOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada tugas yang diberikan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workOrders.map((order) => (
                  <Card
                    key={order.id}
                    className={isHelper ? "transition-shadow" : "cursor-pointer hover:shadow-md transition-shadow"}
                    onClick={() => {
                      if (isHelper) return;
                      router.push(`/technician/orders/${order.id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{order.order_number}</span>
                            {getStatusBadge(order.status)}
                            {getPriorityBadge(order.priority)}
                          </div>
                          <h3 className="font-medium mb-1">{order.service_title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {order.service_description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">{order.location_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(order.scheduled_date).toLocaleDateString("id-ID", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Estimasi: {order.estimated_duration} jam</span>
                        </div>
                      </div>

                      {/* Action Buttons - Only show for completed orders */}
                      {!isHelper && order.status === "completed" && (
                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => handlePreviewPDF(e, order.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => handleEditOrder(e, order.id)}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      )}

                      <div className="mt-3">
                        <OrderTimeline
                          steps={[
                            {
                              status: order.assignment_status === "assigned" || order.assignment_status === "accepted" || order.status === "in_progress" || order.status === "completed" ? "completed" : "pending",
                              label: "Ditugaskan",
                            },
                            {
                              status: order.status === "in_progress" || order.status === "completed" ? "completed" : order.assignment_status === "in_progress" ? "current" : "pending",
                              label: "Proses",
                            },
                            {
                              status: order.status === "completed" && !order.has_technical_report ? "current" : order.status === "completed" && order.has_technical_report ? "completed" : "pending",
                              label: "Selesai",
                            },
                            {
                              status: order.has_technical_report ? "completed" : "pending",
                              label: "Laporan",
                            },
                          ]}
                        />
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
