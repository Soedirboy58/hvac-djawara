"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar, AlertCircle, CheckCircle, Clock, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UpcomingMaintenance {
  schedule_id: string;
  client_name: string;
  property_name: string;
  property_address: string;
  frequency: string;
  next_scheduled_date: string;
  days_until: number;
  unit_count: number;
  order_exists: boolean;
  latest_order_id: string | null;
}

export default function UpcomingMaintenanceWidget() {
  const [upcoming, setUpcoming] = useState<UpcomingMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduleDialog, setRescheduleDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<UpcomingMaintenance | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Bulk selection state
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    try {
      const response = await fetch("/api/maintenance/auto-generate");
      const result = await response.json();
      if (result.success) {
        setUpcoming(result.upcoming_maintenance);
      }
    } catch (error) {
      console.error("Error fetching upcoming maintenance:", error);
      toast.error("Gagal memuat jadwal maintenance");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOrders = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/maintenance/auto-generate", {
        method: "POST",
      });
      const result = await response.json();

      if (result.success) {
        const count = result.count || 0;
        if (count > 0) {
          toast.success(`${count} service order berhasil dibuat!`);
        } else {
          toast.info("Tidak ada order yang perlu dibuat saat ini");
        }
        fetchUpcoming();
        setSelectedSchedules([]); // Clear selection
      } else {
        toast.error(result.error || "Gagal generate orders");
      }
    } catch (error) {
      console.error("Error generating orders:", error);
      toast.error("Terjadi kesalahan");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSelect = (scheduleId: string) => {
    setSelectedSchedules(prev =>
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSelectAll = () => {
    const pageItems = paginatedData.filter(m => !m.order_exists);
    const pageIds = pageItems.map(m => m.schedule_id);
    
    if (pageIds.every(id => selectedSchedules.includes(id))) {
      // Deselect all on current page
      setSelectedSchedules(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedSchedules(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleReschedule = async () => {
    if (!selectedOrder?.latest_order_id || !rescheduleDate) {
      toast.error("Tanggal reschedule wajib diisi");
      return;
    }

    try {
      const response = await fetch("/api/maintenance/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedOrder.latest_order_id,
          new_date: rescheduleDate,
          reason: rescheduleReason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Jadwal berhasil diubah!");
        setRescheduleDialog(false);
        setRescheduleDate("");
        setRescheduleReason("");
        fetchUpcoming();
      } else {
        toast.error("Gagal reschedule");
      }
    } catch (error) {
      console.error("Error rescheduling:", error);
      toast.error("Terjadi kesalahan");
    }
  };

  const getUrgencyBadge = (daysUntil: number, orderExists: boolean) => {
    if (orderExists && daysUntil > 30) {
      return <Badge className="bg-green-500">✅ Order Created</Badge>;
    } else if (daysUntil < -3) {
      return <Badge variant="destructive">Overdue ({Math.abs(daysUntil)}d)</Badge>;
    } else if (daysUntil >= -3 && daysUntil <= 0) {
      return <Badge className="bg-orange-500">Due Soon ({Math.abs(daysUntil)}d)</Badge>;
    } else if (daysUntil <= 3) {
      return <Badge className="bg-orange-500">Urgent ({daysUntil}d)</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-yellow-500">Soon ({daysUntil}d)</Badge>;
    } else {
      return <Badge variant="secondary">{daysUntil} days</Badge>;
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      monthly: "Bulanan",
      quarterly: "3 Bulan",
      semi_annual: "6 Bulan",
      annual: "Tahunan",
      custom: "Custom",
    };
    return labels[freq] || freq;
  };

  // Group by urgency (Overdue = lewat >3 hari)
  const overdue = upcoming.filter((m) => m.days_until < -3);
  const urgent = upcoming.filter((m) => m.days_until >= -3 && m.days_until <= 7);
  const upcoming30 = upcoming.filter((m) => m.days_until > 7 && m.days_until <= 30);
  const recentlyCompleted = upcoming.filter((m) => m.order_exists && m.days_until > 30);

  const needsAction = upcoming.filter((m) => !m.order_exists && m.days_until <= 7);
  
  // Combine data for display: show overdue, urgent, upcoming30, AND recently completed
  const displayData = [...overdue, ...urgent, ...upcoming30, ...recentlyCompleted];

  // Pagination (use displayData instead of upcoming)
  const totalPages = Math.ceil(displayData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = displayData.slice(startIndex, endIndex);

  // Check if all items on current page are selected
  const pageSelectableItems = paginatedData.filter(m => !m.order_exists);
  const isAllPageSelected = pageSelectableItems.length > 0 && 
    pageSelectableItems.every(m => selectedSchedules.includes(m.schedule_id));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdue.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Urgent (≤7d)</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{urgent.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Next 30 Days</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{upcoming30.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Needs Action</CardTitle>
              <CheckCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{needsAction.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Bar */}
        {selectedSchedules.length > 0 && (
          <Card className="border-blue-500 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {selectedSchedules.length} schedule dipilih
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pilih action untuk schedule yang dipilih
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSchedules([])}
                  >
                    Clear Selection
                  </Button>
                  <Button onClick={handleGenerateOrders} disabled={generating}>
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`}
                    />
                    {generating ? "Generating..." : "Generate Selected"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        {needsAction.length > 0 && selectedSchedules.length === 0 && (
          <Card className="border-yellow-500 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">
                    {needsAction.length} jadwal perlu dibuatkan service order
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Klik tombol di samping untuk auto-generate service orders
                  </p>
                </div>
                <Button onClick={handleGenerateOrders} disabled={generating}>
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`}
                  />
                  {generating ? "Generating..." : "Generate All"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Maintenance Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada jadwal maintenance dalam 30 hari ke depan
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={isAllPageSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Client / Property</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => (
                    <TableRow key={item.schedule_id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedSchedules.includes(item.schedule_id)}
                          onCheckedChange={() => handleToggleSelect(item.schedule_id)}
                          disabled={item.order_exists}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.property_name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getFrequencyLabel(item.frequency)}</TableCell>
                      <TableCell>
                        <div>
                          <p>
                            {new Date(item.next_scheduled_date).toLocaleDateString("id-ID")}
                          </p>
                          {getUrgencyBadge(item.days_until, item.order_exists)}
                        </div>
                      </TableCell>
                      <TableCell>{item.unit_count} units</TableCell>
                      <TableCell>
                        {item.order_exists ? (
                          <Badge className="bg-green-500">Order Created</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.order_exists && item.latest_order_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(item);
                              setRescheduleDialog(true);
                            }}
                          >
                            Reschedule
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Generate single order
                              handleGenerateOrders();
                            }}
                          >
                            Create Order
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Pagination */}
            {upcoming.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, upcoming.length)} of {upcoming.length} schedules
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Maintenance</DialogTitle>
            <DialogDescription>
              {selectedOrder?.client_name} - {selectedOrder?.property_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Date</Label>
              <p className="text-sm font-medium">
                {selectedOrder?.next_scheduled_date
                  ? new Date(selectedOrder.next_scheduled_date).toLocaleDateString("id-ID")
                  : "-"}
              </p>
            </div>
            <div>
              <Label>New Date *</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                rows={3}
                placeholder="Alasan reschedule (optional)"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRescheduleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule}>Reschedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
