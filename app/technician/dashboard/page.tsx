"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as BigCalendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar as CalendarIcon,
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
import AutoAttendancePrompt from "@/components/technician/AutoAttendancePrompt";

const localizer = momentLocalizer(moment)

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
  scheduled_time?: string | null;
  status: string;
  priority: string;
  estimated_duration: number;
  estimated_end_date?: string | null;
  estimated_end_time?: string | null;
  assignment_status: string;
  assigned_at: string;
  has_technical_report?: boolean;
}

type WaitingListItem = {
  order: {
    id: string
    order_number: string
    service_title: string
    location_address: string
    created_at: string
    status: string
    priority: string
    client: {
      id: string
      name: string
      phone: string | null
    } | null
  }
  lastService: null | {
    order_id: string
    order_number: string
    service_title: string
    completed_at_hint: string | null
    pic_name: string | null
    assistant_names: string[]
  }
  maskClient: boolean
}

type TechnicianCalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource: {
    orderId: string
    status: string
    isAssigned: boolean
  }
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
  const [calendarEvents, setCalendarEvents] = useState<TechnicianCalendarEvent[]>([]);
  const [waitingList, setWaitingList] = useState<WaitingListItem[]>([]);
  const [unassignedRecurring, setUnassignedRecurring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHelper, setIsHelper] = useState(false);
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  const [waitingListPage, setWaitingListPage] = useState(0);
  const [recurringPage, setRecurringPage] = useState(0);
  const [completedSearch, setCompletedSearch] = useState("");
  const [completedWorkDate, setCompletedWorkDate] = useState("");
  const [completedPage, setCompletedPage] = useState(0);

  const WAITING_PAGE_SIZE = 5;
  const RECURRING_PAGE_SIZE = 5;
  const COMPLETED_PAGE_SIZE = 5;

  const parseLocalDate = (value: any): Date | null => {
    if (!value) return null;
    const str = String(value);
    // Prefer a stable local parse for date-only values from Postgres (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const d = new Date(`${str}T00:00:00`);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isInCurrentMonth = (value: any): boolean => {
    const d = parseLocalDate(value);
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const currentMonthUnassignedRecurring = unassignedRecurring.filter((u) =>
    isInCurrentMonth(u?.next_scheduled_date)
  );

  const normalizeDateOnly = (value: any): string => {
    if (!value) return "";
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (str.length >= 10) return str.slice(0, 10);
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };

  const formatRoleLabel = (value?: string | null) => {
    const role = String(value || '').toLowerCase();
    if (!role) return '-';
    if (role === 'magang' || role === 'trainee') return 'Magang';
    if (role === 'helper') return 'Helper';
    if (role === 'technician' || role === 'teknisi') return 'Technician';
    if (role === 'tech_head') return 'Tech Head';
    if (role === 'supervisor') return 'Supervisor';
    return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const completedQuery = completedSearch.trim().toLowerCase();
  const activeOrders = workOrders.filter((o) => o.status !== "completed");
  const completedOrdersForList = workOrders.filter((o) => o.status === "completed");
  const filteredCompletedOrders = completedOrdersForList
    .filter((o) => {
      if (!completedQuery) return true;
      const haystack = [
        o.order_number,
        o.service_title,
        o.service_description,
        o.location_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(completedQuery);
    })
    .filter((o) => {
      if (!completedWorkDate) return true;
      return normalizeDateOnly(o.scheduled_date) === completedWorkDate;
    });

  const completedTotalPages = Math.max(1, Math.ceil(filteredCompletedOrders.length / COMPLETED_PAGE_SIZE));
  const completedStart = completedPage * COMPLETED_PAGE_SIZE;
  const completedPageItems = filteredCompletedOrders.slice(completedStart, completedStart + COMPLETED_PAGE_SIZE);

  const waitingListTotalPages = Math.max(1, Math.ceil(waitingList.length / WAITING_PAGE_SIZE));
  const waitingListStart = waitingListPage * WAITING_PAGE_SIZE;
  const waitingListPageItems = waitingList.slice(waitingListStart, waitingListStart + WAITING_PAGE_SIZE);

  const recurringTotalPages = Math.max(1, Math.ceil(currentMonthUnassignedRecurring.length / RECURRING_PAGE_SIZE));
  const recurringStart = recurringPage * RECURRING_PAGE_SIZE;
  const recurringPageItems = currentMonthUnassignedRecurring.slice(recurringStart, recurringStart + RECURRING_PAGE_SIZE);

  useEffect(() => {
    setWaitingListPage(0);
  }, [waitingList.length]);

  useEffect(() => {
    setRecurringPage(0);
  }, [currentMonthUnassignedRecurring.length]);

  useEffect(() => {
    setCompletedPage(0);
  }, [completedSearch, completedWorkDate]);

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
        setDisplayRole(role || null);
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

      let formattedOrders: WorkOrder[] = [];
      if (!assignmentsData || assignmentsData.length === 0) {
        setWorkOrders([]);
      } else {
        // Fetch service orders separately (include all orders)
        const orderIds = assignmentsData.map((a) => a.service_order_id);
        const { data: ordersData, error: ordersError } = await supabase
          .from("service_orders")
          .select("id, order_number, service_title, service_description, location_address, scheduled_date, scheduled_time, status, priority, estimated_duration, estimated_end_date, estimated_end_time")
          .in("id", orderIds);

        if (ordersError) {
          console.error("Error fetching orders:", ordersError);
          throw ordersError;
        }

        // Merge assignment data with order data
        formattedOrders = (assignmentsData || [])
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

      }

      // Build calendar events for all technicians (mask client data for non-assigned tech)
      if (techData.tenant_id) {
        const { data: scheduledOrders, error: scheduledOrdersError } = await supabase
          .from('service_orders')
          .select('id, order_number, service_title, scheduled_date, scheduled_time, status, estimated_duration, estimated_end_date, estimated_end_time')
          .eq('tenant_id', techData.tenant_id)
          .not('scheduled_date', 'is', null)
          .in('status', ['scheduled', 'in_progress', 'completed'])

        if (scheduledOrdersError) {
          console.warn('Error fetching scheduled orders:', scheduledOrdersError)
        }

        const scheduleRows = (scheduledOrders || []) as any[]
        const scheduleIds = scheduleRows.map((o) => o.id)
        const assignmentsByOrder = new Map<string, Set<string>>()

        if (scheduleIds.length > 0) {
          const { data: assignedRows, error: assignedRowsError } = await supabase
            .from('work_order_assignments')
            .select('service_order_id, technician_id')
            .in('service_order_id', scheduleIds)

          if (assignedRowsError) {
            console.warn('Error fetching schedule assignments:', assignedRowsError)
          }

          ;(assignedRows || []).forEach((row: any) => {
            const orderId = String(row.service_order_id || '')
            const techId = String(row.technician_id || '')
            if (!orderId || !techId) return
            const set = assignmentsByOrder.get(orderId) || new Set<string>()
            set.add(techId)
            assignmentsByOrder.set(orderId, set)
          })
        }

        const calendar: TechnicianCalendarEvent[] = scheduleRows
          .filter((o) => !!o.scheduled_date)
          .map((order) => {
            const startDateTime = new Date(`${order.scheduled_date}T00:00:00`)
            if (order.scheduled_time) {
              const [hours, minutes] = order.scheduled_time.split(':')
              startDateTime.setHours(parseInt(hours), parseInt(minutes))
            } else {
              startDateTime.setHours(9, 0, 0, 0)
            }

            let endDateTime: Date
            let allDay = false

            if (order.estimated_end_date) {
              const endInclusive = new Date(`${order.estimated_end_date}T00:00:00`)
              if (order.estimated_end_time) {
                const [endHours, endMinutes] = order.estimated_end_time.split(':')
                endInclusive.setHours(parseInt(endHours), parseInt(endMinutes))
              } else {
                endInclusive.setHours(23, 59, 0, 0)
              }

              const startYMD = `${startDateTime.getFullYear()}-${startDateTime.getMonth()}-${startDateTime.getDate()}`
              const endYMD = `${endInclusive.getFullYear()}-${endInclusive.getMonth()}-${endInclusive.getDate()}`

              if (startYMD !== endYMD) {
                allDay = true
                const endExclusive = new Date(endInclusive)
                endExclusive.setHours(0, 0, 0, 0)
                endExclusive.setDate(endExclusive.getDate() + 1)
                endDateTime = endExclusive
                startDateTime.setHours(0, 0, 0, 0)
              } else {
                endDateTime = endInclusive
              }
            } else {
              endDateTime = new Date(startDateTime)
              const duration = order.estimated_duration || 120
              endDateTime.setMinutes(endDateTime.getMinutes() + duration)
            }

            const assignedSet = assignmentsByOrder.get(order.id) || new Set<string>()
            const isAssigned = assignedSet.has(techData.id)

            return {
              id: order.id,
              title: isAssigned ? `${order.order_number} - ${order.service_title}` : 'Terjadwal (order lain)',
              start: startDateTime,
              end: endDateTime,
              allDay,
              resource: {
                orderId: order.id,
                status: order.status,
                isAssigned,
              },
            }
          })

        setCalendarEvents(calendar)
      }

      // Fetch shared waiting list: orders still in admin pipeline (listing/pending) and not yet assigned.
      // We also attach last completed service (PIC + all assistants).
      if (techData.tenant_id) {
        const { data: scheduledOrders, error: scheduledOrdersError } = await supabase
          .from('service_orders')
          .select(`
            id,
            order_number,
            service_title,
            location_address,
            created_at,
            status,
            priority,
            client_id,
            client:clients!client_id(id, name, phone)
          `)
          .eq('tenant_id', techData.tenant_id)
          .in('status', ['listing', 'pending'])
          .order('created_at', { ascending: false })
          .limit(50)

        if (scheduledOrdersError) {
          console.warn('Error fetching waiting list orders:', scheduledOrdersError)
        }

        const scheduledOrderRows = (scheduledOrders || []) as any[]
        const scheduledIds = scheduledOrderRows.map((o) => o.id)

        let assignedSet = new Set<string>()
        if (scheduledIds.length > 0) {
          const { data: anyAssignments, error: anyAssignmentsError } = await supabase
            .from('work_order_assignments')
            .select('service_order_id')
            .in('service_order_id', scheduledIds)

          if (anyAssignmentsError) {
            console.warn('Error fetching waiting list assignments:', anyAssignmentsError)
          }

          ;(anyAssignments || []).forEach((a: any) => assignedSet.add(a.service_order_id))
        }

        const waitingOrders = scheduledOrderRows.filter((o) => !assignedSet.has(o.id))
        const waitingClientIds = Array.from(new Set(waitingOrders.map((o) => o.client_id).filter(Boolean)))

        // Fetch a pool of completed orders for these clients; pick the latest per client.
        const latestCompletedByClient = new Map<string, any>()
        if (waitingClientIds.length > 0) {
          const { data: completedPool, error: completedPoolError } = await supabase
            .from('service_orders')
            .select('id, client_id, order_number, service_title, actual_end_time, scheduled_date, updated_at')
            .in('client_id', waitingClientIds)
            .eq('status', 'completed')
            .order('actual_end_time', { ascending: false })
            .order('scheduled_date', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(200)

          if (completedPoolError) {
            console.warn('Error fetching last completed pool:', completedPoolError)
          }

          ;(completedPool || []).forEach((o: any) => {
            if (!o?.client_id) return
            if (!latestCompletedByClient.has(o.client_id)) latestCompletedByClient.set(o.client_id, o)
          })
        }

        // Fetch executors (PIC + assistants) for those latest completed orders.
        const latestCompletedOrderIds = Array.from(new Set(Array.from(latestCompletedByClient.values()).map((o: any) => o.id)))
        const executorsByOrderId = new Map<string, { pic: string | null; assistants: string[] }>()
        if (latestCompletedOrderIds.length > 0) {
          const { data: executorRows, error: executorError } = await supabase
            .from('work_order_assignments')
            .select('service_order_id, role_in_order, technician:technicians(id, full_name)')
            .in('service_order_id', latestCompletedOrderIds)

          if (executorError) {
            console.warn('Error fetching last executors:', executorError)
          }

          ;(executorRows || []).forEach((row: any) => {
            const orderId = row.service_order_id as string
            if (!orderId) return
            const name = row?.technician?.full_name || null
            const role = (row?.role_in_order || '').toLowerCase()

            const existing = executorsByOrderId.get(orderId) || { pic: null, assistants: [] }
            if (role === 'primary') {
              existing.pic = name
            } else if (role === 'assistant' && name) {
              existing.assistants.push(name)
            }
            executorsByOrderId.set(orderId, existing)
          })
        }

        const items: WaitingListItem[] = waitingOrders.map((o: any) => {
          const last = o?.client_id ? latestCompletedByClient.get(o.client_id) : null
          const exec = last?.id ? executorsByOrderId.get(last.id) : null

          return {
            order: {
              id: o.id,
              order_number: o.order_number,
              service_title: o.service_title,
              location_address: o.location_address,
              created_at: o.created_at,
              status: o.status,
              priority: o.priority,
              client: o.client || null,
            },
            lastService: last
              ? {
                  order_id: last.id,
                  order_number: last.order_number,
                  service_title: last.service_title,
                  completed_at_hint: last.actual_end_time || last.scheduled_date || last.updated_at || null,
                  pic_name: exec?.pic || null,
                  assistant_names: (exec?.assistants || []).filter(Boolean),
                }
              : null,
            maskClient: true,
          }
        })

        setWaitingList(items)
      }

      // Read-only recurring maintenance schedules that have not generated an order yet.
      try {
        const resp = await fetch('/api/maintenance/auto-generate')
        const json = await resp.json()
        if (resp.ok && json?.success) {
          const upcoming = (json?.upcoming_maintenance || []) as any[]
          setUnassignedRecurring(upcoming.filter((u) => !u.order_exists))
        } else {
          setUnassignedRecurring([])
        }
      } catch (err) {
        console.warn('Error fetching upcoming maintenance:', err)
        setUnassignedRecurring([])
      }

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
        .order('completed_at', { ascending: false })
        .limit(1)
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
      listing: "bg-gray-500",
      pending: "bg-amber-500",
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

  const calendarEventStyleGetter = (event: TechnicianCalendarEvent) => {
    const status = (event.resource?.status || '').toLowerCase()
    let backgroundColor = '#3b82f6'
    if (status === 'in_progress') backgroundColor = '#8b5cf6'
    if (status === 'completed') backgroundColor = '#10b981'
    if (status === 'cancelled') backgroundColor = '#ef4444'

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AutoAttendancePrompt />
      <style jsx global>{`
        @media (max-width: 640px) {
          .tech-calendar .rbc-toolbar {
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
          }
          .tech-calendar .rbc-toolbar-label {
            order: -1;
            width: 100%;
            text-align: center;
            font-size: 0.95rem;
          }
          .tech-calendar .rbc-btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .tech-calendar .rbc-btn-group button {
            padding: 6px 10px;
            font-size: 0.75rem;
            line-height: 1;
          }
          .tech-calendar .rbc-header {
            padding: 4px 0;
            font-size: 0.75rem;
          }
          .tech-calendar .rbc-date-cell {
            padding-right: 6px;
            font-size: 0.75rem;
          }
          .tech-calendar .rbc-event {
            padding: 1px 3px;
            font-size: 0.7rem;
            line-height: 1.1;
          }
        }
      `}</style>
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
                      <p className="font-medium">{formatRoleLabel(displayRole || technician.role)}</p>
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

        {/* Calendar Kerja + Waiting List (shared) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Kalender Kerja & Waiting List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Semua jadwal teknisi</p>
                  <Badge className="bg-blue-500">Shared</Badge>
                </div>
                <div className="rounded-lg border bg-white p-2 tech-calendar">
                  <div className="h-[420px] sm:h-[520px]">
                    <BigCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: '100%' }}
                      views={['month', 'week', 'day'] as View[]}
                      defaultView={'month' as View}
                      toolbar
                      selectable={false}
                      popup
                      eventPropGetter={(e: any) => calendarEventStyleGetter(e as TechnicianCalendarEvent)}
                      onSelectEvent={(e: any) => {
                        if (isHelper) return
                        const resource = (e as any)?.resource
                        if (!resource?.isAssigned) {
                          return
                          return
                        }
                        const orderId = resource?.orderId
                        if (orderId) router.push(`/technician/orders/${orderId}`)
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    Waiting List (Belum Ditugaskan) ({waitingList.length})
                  </p>
                  {waitingList.length > WAITING_PAGE_SIZE ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setWaitingListPage((p) => Math.max(0, p - 1))}
                        disabled={waitingListPage <= 0}
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWaitingListPage((p) => Math.min(waitingListTotalPages - 1, p + 1))
                        }
                        disabled={waitingListPage >= waitingListTotalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {waitingList.length === 0 ? (
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-sm text-muted-foreground">Tidak ada waiting list saat ini.</p>
                    </div>
                  ) : (
                    waitingListPageItems.map((item) => {
                      const o = item.order
                      const last = item.lastService
                      const assistants = last?.assistant_names?.length ? last.assistant_names.join(', ') : '-'
                      const masked = item.maskClient

                      return (
                        <div key={o.id} className="rounded-lg border bg-white p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {masked ? 'Pelanggan' : (o.client?.name || 'Pelanggan')}{' '}
                                <span className="text-muted-foreground">({o.order_number})</span>
                              </p>
                              <p className="text-sm text-muted-foreground truncate">{o.service_title}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getPriorityBadge(o.priority)}
                              {getStatusBadge(o.status)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{masked ? '-' : (o.location_address || '-')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {new Date(o.created_at).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              Kontak: {masked ? '-' : (o.client?.phone || '-')}
                            </p>
                            <p>
                              Riwayat service terakhir:{' '}
                              {last
                                ? `${last.order_number} • ${last.service_title} • ${last.completed_at_hint ? new Date(last.completed_at_hint).toLocaleDateString('id-ID') : '-'}`
                                : 'Belum ada data completed'}
                            </p>
                            <p>
                              Teknisi terakhir: {last?.pic_name || '-'} | Asisten terakhir: {assistants}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      Recurring Maintenance (Belum Ditugaskan) ({currentMonthUnassignedRecurring.length})
                    </p>
                    {currentMonthUnassignedRecurring.length > RECURRING_PAGE_SIZE ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRecurringPage((p) => Math.max(0, p - 1))}
                          disabled={recurringPage <= 0}
                        >
                          Prev
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRecurringPage((p) => Math.min(recurringTotalPages - 1, p + 1))}
                          disabled={recurringPage >= recurringTotalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {currentMonthUnassignedRecurring.length === 0 ? (
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-sm text-muted-foreground">Tidak ada jadwal recurring yang belum ditugaskan.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-white divide-y">
                      {recurringPageItems.map((u) => (
                        <div key={u.schedule_id} className="p-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{u.client_name} • {u.property_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.property_address}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm">{new Date(`${u.next_scheduled_date}T00:00:00`).toLocaleDateString('id-ID')}</p>
                            <Badge className="bg-gray-500">Unassigned</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <div className="space-y-6">
                {/* Tugas Aktif */}
                <div className="space-y-3">
                  {activeOrders.length === 0 ? (
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-sm text-muted-foreground">Tidak ada tugas aktif.</p>
                    </div>
                  ) : (
                    activeOrders.map((order) => (
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
                          <CalendarIcon className="h-4 w-4" />
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
                    ))
                  )}
                </div>

                {/* Tugas Selesai (Pagination + Filter) */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Tugas Selesai</p>
                      <p className="text-xs text-muted-foreground">
                        Cari berdasarkan nama/order/lokasi dan tanggal kerja.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Input
                        value={completedSearch}
                        onChange={(e) => setCompletedSearch(e.target.value)}
                        placeholder="Cari nama / order / lokasi"
                        className="sm:w-64"
                      />
                      <Input
                        type="date"
                        value={completedWorkDate}
                        onChange={(e) => setCompletedWorkDate(e.target.value)}
                        className="sm:w-44"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Menampilkan {filteredCompletedOrders.length} tugas selesai</p>
                    {filteredCompletedOrders.length > COMPLETED_PAGE_SIZE ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCompletedPage((p) => Math.max(0, p - 1))}
                          disabled={completedPage <= 0}
                        >
                          Prev
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCompletedPage((p) => Math.min(completedTotalPages - 1, p + 1))}
                          disabled={completedPage >= completedTotalPages - 1}
                        >
                          Next
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {filteredCompletedOrders.length === 0 ? (
                    <div className="rounded-lg border bg-white p-4">
                      <p className="text-sm text-muted-foreground">Tidak ada tugas selesai yang cocok.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedPageItems.map((order) => (
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
                                <CalendarIcon className="h-4 w-4" />
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
                                    status:
                                      order.assignment_status === "assigned" ||
                                      order.assignment_status === "accepted" ||
                                      order.status === "in_progress" ||
                                      order.status === "completed"
                                        ? "completed"
                                        : "pending",
                                    label: "Ditugaskan",
                                  },
                                  {
                                    status:
                                      order.status === "in_progress" || order.status === "completed"
                                        ? "completed"
                                        : order.assignment_status === "in_progress"
                                          ? "current"
                                          : "pending",
                                    label: "Proses",
                                  },
                                  {
                                    status:
                                      order.status === "completed" && !order.has_technical_report
                                        ? "current"
                                        : order.status === "completed" && order.has_technical_report
                                          ? "completed"
                                          : "pending",
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
