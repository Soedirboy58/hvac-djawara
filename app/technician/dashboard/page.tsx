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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Technician {
  id: string;
  full_name: string;
  email: string;
  employee_id: string | null;
  role: string;
  total_jobs_completed: number;
  average_rating: number;
  status: string;
  availability_status: string;
}

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
}

export default function TechnicianDashboard() {
  const router = useRouter();
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      setTechnician(techData);

      // Set active tenant for this technician to enable RLS access
      if (techData.tenant_id) {
        await supabase
          .from('profiles')
          .update({ active_tenant_id: techData.tenant_id })
          .eq('id', user.id);
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
      const formattedOrders = assignmentsData.map((assignment: any) => {
        const order = ordersData?.find(o => o.id === assignment.service_order_id);
        return {
          ...order,
          assignment_status: assignment.status,
          assigned_at: assignment.assigned_at,
        };
      }).filter(order => order && order.id); // Filter out any orders not found

      setWorkOrders(formattedOrders);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/technician/orders/${order.id}`)}
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

                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
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

                      <div className="mt-3">
                        {order.status === "completed" && (
                          <Badge className="bg-green-100 text-green-800">
                            ✓ Selesai - Lengkapi Data Teknis
                          </Badge>
                        )}
                        {order.assignment_status === "assigned" && order.status !== "completed" && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Tugas Baru - Tap untuk detail
                          </Badge>
                        )}
                        {(order.assignment_status === "in_progress" || order.assignment_status === "accepted") && order.status !== "completed" && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Dalam Proses
                          </Badge>
                        )}
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
