"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Phone, CheckCircle, XCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface Technician {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  employee_id: string | null;
  role: string;
  status: string;
  availability_status: string;
  is_verified: boolean;
  total_jobs_completed: number;
  average_rating: number;
  specializations: string[] | null;
  certifications: string[] | null;
  verification_token: string | null;
  token_expires_at: string | null;
  created_at: string;
}

export default function TeamManagement() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [tokenDialog, setTokenDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    employee_id: "",
    role: "technician",
  });

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      toast.error("Gagal memuat data teknisi");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTechnician = async () => {
    try {
      const supabase = createClient();
      
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userRole } = await supabase
        .from("user_tenant_roles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole) throw new Error("No tenant found");

      // Insert technician
      const { data: newTech, error: insertError } = await supabase
        .from("technicians")
        .insert({
          ...formData,
          tenant_id: userRole.tenant_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Generate token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc("generate_technician_token", { p_technician_id: newTech.id });

      if (tokenError) throw tokenError;

      toast.success("Teknisi berhasil ditambahkan!");
      
      // Show token dialog
      setSelectedTech({ ...newTech, verification_token: tokenData });
      setTokenDialog(true);
      setAddDialog(false);
      
      // Reset form
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        employee_id: "",
        role: "technician",
      });
      
      fetchTechnicians();
    } catch (error: any) {
      console.error("Error adding technician:", error);
      toast.error(error.message || "Gagal menambahkan teknisi");
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copied to clipboard!");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-500",
      inactive: "bg-gray-500",
      suspended: "bg-red-500",
    };
    return <Badge className={variants[status] || "bg-gray-500"}>{status}</Badge>;
  };

  const getAvailabilityBadge = (status: string) => {
    const variants: Record<string, { bg: string; label: string }> = {
      available: { bg: "bg-green-500", label: "Available" },
      busy: { bg: "bg-orange-500", label: "Busy" },
      off_duty: { bg: "bg-gray-500", label: "Off Duty" },
      on_leave: { bg: "bg-blue-500", label: "On Leave" },
    };
    const variant = variants[status] || variants.available;
    return <Badge className={variant.bg}>{variant.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">
            Manage technicians and field workers
          </p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Technician
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicians.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {technicians.filter((t) => t.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {technicians.filter((t) => t.availability_status === "available").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {technicians.filter((t) => t.is_verified).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technicians Table */}
      <Card>
        <CardHeader>
          <CardTitle>Technicians List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No technicians yet. Click "Add Technician" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                technicians.map((tech) => (
                  <TableRow 
                    key={tech.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedTech(tech);
                      setDetailDialog(true);
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{tech.full_name}</p>
                        {tech.employee_id && (
                          <p className="text-sm text-muted-foreground">
                            ID: {tech.employee_id}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {tech.email}
                        </div>
                        {tech.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {tech.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tech.role}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(tech.status)}</TableCell>
                    <TableCell>{getAvailabilityBadge(tech.availability_status)}</TableCell>
                    <TableCell>
                      {tech.is_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <p className="font-medium">{tech.total_jobs_completed}</p>
                        {tech.average_rating > 0 && (
                          <p className="text-sm text-muted-foreground">
                            ⭐ {tech.average_rating.toFixed(1)}
                          </p>
                        )}e) => {
                          e.stopPropagation();
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTech(tech);
                          setTokenDialog(true);
                        }}
                      >
                        View Token
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Technician Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Technician</DialogTitle>
            <DialogDescription>
              Enter technician details. A verification token will be generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+62812..."
              />
            </div>
            <div>
              <Label>Employee ID</Label>
              <Input
                value={formData.employee_id}
                onChange={(e) =>
                  setFormData({ ...formData, employee_id: e.target.value })
                }
                placeholder="EMP001"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_finance">Admin Finance</SelectItem>
                  <SelectItem value="admin_operasional">Admin Operasional</SelectItem>
                  <SelectItem value="supervisor">Supervisor / Chief Engineer</SelectItem>
                  <SelectItem value="senior_technician">Senior Teknisi</SelectItem>
                  <SelectItem value="technician">Teknisi</SelectItem>
                  <SelectItem value="helper">Helper</SelectItem>
                  <SelectItem value="intern">Magang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTechnician}>Add Technician</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
Detail Technician Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Technician Details</DialogTitle>
          </DialogHeader>
          {selectedTech && (
            <div className="space-y-6">
              {/* Profile Section */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Profile Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name:</span>
                        <span className="font-medium">{selectedTech.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Employee ID:</span>
                        <span className="font-medium">{selectedTech.employee_id || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{selectedTech.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{selectedTech.phone || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <Badge variant="secondary">{selectedTech.role}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(selectedTech.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Availability:</span>
                        {getAvailabilityBadge(selectedTech.availability_status)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
                    <div className="space-y-3">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-3xl font-bold">{selectedTech.total_jobs_completed}</p>
                            <p className="text-sm text-muted-foreground">Total Jobs Completed</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-3xl font-bold">
                              {selectedTech.average_rating > 0 
                                ? `⭐ ${selectedTech.average_rating.toFixed(1)}` 
                                : "N/A"}
                            </p>
                            <p className="text-sm text-muted-foreground">Average Rating</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Certifications */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Skills & Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTech.specializations && selectedTech.specializations.length > 0 ? (
                    selectedTech.specializations.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="bg-blue-50">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specializations added yet</p>
                  )}
                </div>
              </div>

              {selectedTech.certifications && selectedTech.certifications.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTech.certifications.map((cert, idx) => (
                      <Badge key={idx} variant="outline" className="bg-green-50">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Status */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Verification Status</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTech.is_verified ? "Account verified" : "Waiting for verification"}
                    </p>
                  </div>
                  <div>
                    {selectedTech.is_verified ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailDialog(false);
                    setTokenDialog(true);
                  }}
                >
                  View Token
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Navigate to edit page
                    toast.info("Edit feature coming soon");
                  }}
                >
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 
      {/* Token Dialog */}
      <Dialog open={tokenDialog} onOpenChange={setTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Technician Verification Token</DialogTitle>
            <DialogDescription>
              Share this token with {selectedTech?.full_name} to verify their account
            </DialogDescription>
          </DialogHeader>
          {selectedTech && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Token:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-sm break-all">
                    {selectedTech.verification_token || "No token available"}
                  </code>
                  {selectedTech.verification_token && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToken(selectedTech.verification_token!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Email:</strong> {selectedTech.email}</p>
                {selectedTech.phone && <p><strong>Phone:</strong> {selectedTech.phone}</p>}
                {selectedTech.token_expires_at && (
                  <p>
                    <strong>Expires:</strong>{" "}
                    {new Date(selectedTech.token_expires_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium mb-1">Technician Verification URL:</p>
                <code className="text-xs bg-white px-2 py-1 rounded block break-all">
                  {typeof window !== 'undefined' && `${window.location.origin}/technician/verify`}
                </code>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this token via WhatsApp or Email to the technician. They will use it to activate their account.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
