"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export interface ACUnitData {
  id: string;
  source?: "inventory" | "manual";
  inventory_unit_id?: string;
  unit_code?: string;
  property_id?: string;
  property_name?: string;
  model_ac?: string;
  nama_ruang: string;
  merk_ac: string;
  kapasitas_ac: string;
  jenis_unit: string;
  deskripsi_lain: string;
  saveToInventory?: boolean; // Flag untuk simpan ke inventory client
  inventorySaved?: boolean; // Flag apakah sudah tersimpan
}

interface ACUnitDataTableProps {
  data: ACUnitData[];
  onChange: (data: ACUnitData[]) => void;
  orderId?: string;
}

// Helper function to save units to inventory (export for external use)
export async function saveUnitsToInventory(
  units: ACUnitData[],
  orderId: string
): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  const supabase = createClient();
  const errors: string[] = [];
  let savedCount = 0;

  try {
    // Get client_id and property info from order
    const { data: orderData, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        client_id,
        property_id,
        tenant_id,
        properties (
          name,
          address
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return { success: false, savedCount: 0, errors: ['Order tidak ditemukan'] };
    }

    const normalizeAcType = (raw: string | undefined | null) => {
      const v = String(raw || "").trim();
      if (!v) return "split_wall";
      const lower = v.toLowerCase();

      const known = new Set([
        "split_wall",
        "split_duct",
        "cassette",
        "floor_standing",
        "vrv_vrf",
        "chiller",
        "ahu",
        "fcu",
        "other",
      ]);
      if (known.has(lower)) return lower;

      const map: Record<string, string> = {
        "split wall": "split_wall",
        "split duct": "split_duct",
        "floor standing": "floor_standing",
        "vrv/vrf": "vrv_vrf",
        "vrv": "vrv_vrf",
        "vrf": "vrv_vrf",
        "lainnya": "other",
        "lain-lain": "other",
      };
      return map[lower] || "other";
    };

    // Filter units that should be saved to inventory (manual units)
    const unitsToSave = units.filter((unit) => unit.saveToInventory && !unit.inventorySaved);

    if (unitsToSave.length === 0) {
      return { success: true, savedCount: 0, errors: [] };
    }

    // Save each unit to inventory
    for (const unit of unitsToSave) {
      try {
        // Generate unique unit code
        const unitCode = `AC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        
        const locationDetail = unit.nama_ruang;
        const propertyIdToUse = unit.property_id || orderData.property_id;

        if (!propertyIdToUse) {
          errors.push(`Gagal simpan unit ${unit.nama_ruang}: property belum dipilih`);
          continue;
        }

        const capacityPkRaw = (unit.kapasitas_ac || "").replace(",", ".");
        const capacityPk = parseFloat(capacityPkRaw);
        const capacityPkSafe = Number.isFinite(capacityPk) ? capacityPk : 1;

        const { error: insertError } = await supabase
          .from('ac_units')
          .insert({
            unit_code: unitCode,
            client_id: orderData.client_id,
            property_id: propertyIdToUse,
            tenant_id: orderData.tenant_id,
            room_name: locationDetail,
            unit_name: locationDetail,
            location_detail: locationDetail,
            brand: unit.merk_ac,
            model: unit.model_ac || unit.merk_ac,
            ac_type: normalizeAcType(unit.jenis_unit),
            capacity_pk: capacityPkSafe,
            capacity_btu: Math.round(capacityPkSafe * 9000),
            install_date: new Date().toISOString().split('T')[0],
            last_service_date: new Date().toISOString().split('T')[0],
            condition_status: 'good',
            is_active: true,
            notes: unit.deskripsi_lain || `Unit ditambahkan oleh teknisi dari order ${orderId}`,
          });

        if (insertError) {
          console.error('Error saving unit to inventory:', insertError);
          errors.push(`Gagal simpan unit ${unit.nama_ruang}: ${insertError.message}`);
        } else {
          savedCount++;
        }
      } catch (err: any) {
        console.error('Error processing unit:', err);
        errors.push(`Error pada unit ${unit.nama_ruang}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      savedCount,
      errors,
    };
  } catch (error: any) {
    console.error('Error in saveUnitsToInventory:', error);
    return {
      success: false,
      savedCount: 0,
      errors: [error.message || 'Terjadi kesalahan'],
    };
  }
}

const AC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "split_wall", label: "Split Wall" },
  { value: "split_duct", label: "Split Duct" },
  { value: "cassette", label: "Cassette" },
  { value: "floor_standing", label: "Floor Standing" },
  { value: "vrv_vrf", label: "VRV/VRF" },
  { value: "chiller", label: "Chiller" },
  { value: "ahu", label: "AHU" },
  { value: "fcu", label: "FCU" },
  { value: "other", label: "Lainnya" },
];

const acTypeLabel = (value: string | undefined | null) => {
  const v = String(value || "").trim();
  if (!v) return "-";
  const found = AC_TYPE_OPTIONS.find((o) => o.value === v);
  return found ? found.label : v;
};

export function ACUnitDataTable({ data, onChange, orderId }: ACUnitDataTableProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Array<{ id: string; property_name: string }>>([]);
  const [defaultPropertyId, setDefaultPropertyId] = useState<string | null>(null);

  // Fetch inventory when dialog opens
  useEffect(() => {
    if (searchOpen && orderId) {
      fetchInventory();
    }
  }, [searchOpen, orderId]);

  // Fetch client properties for manual unit creation
  useEffect(() => {
    if (orderId) {
      fetchClientProperties();
    }
  }, [orderId]);

  const fetchClientProperties = async () => {
    if (!orderId) return;

    try {
      const supabase = createClient();

      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .select("client_id, property_id")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData?.client_id) {
        return;
      }

      setDefaultPropertyId(orderData.property_id || null);

      const { data: propsData, error: propsError } = await supabase
        .from("client_properties")
        .select("id, property_name")
        .eq("client_id", orderData.client_id)
        .order("is_primary", { ascending: false });

      if (propsError) throw propsError;
      setProperties(propsData || []);
    } catch (error) {
      console.error("Error fetching client properties:", error);
    }
  };

  const fetchInventory = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get client_id from order
      const { data: orderData } = await supabase
        .from('service_orders')
        .select('client_id')
        .eq('id', orderId)
        .single();
      
      if (!orderData?.client_id) {
        toast.error("Client ID tidak ditemukan");
        return;
      }
      
      // Fetch inventory for this client (include property name)
      const { data: inventoryData, error } = await supabase
        .from('ac_units')
        .select(`
          id,
          unit_code,
          property_id,
          room_name,
          unit_name,
          location_detail,
          brand,
          model,
          ac_type,
          capacity_pk,
          notes,
          client_properties(property_name)
        `)
        .eq('client_id', orderData.client_id)
        .order('unit_code', { ascending: true });
      
      if (error) throw error;
      
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error("Gagal memuat inventory");
    } finally {
      setLoading(false);
    }
  };

  const selectFromInventory = (unit: any) => {
    const newUnit: ACUnitData = {
      id: `unit-${Date.now()}`,
      source: "inventory",
      inventory_unit_id: unit.id,
      unit_code: unit.unit_code,
      property_id: unit.property_id,
      property_name: unit.client_properties?.property_name,
      nama_ruang: unit.room_name || unit.unit_name || unit.location_detail || "",
      merk_ac: unit.brand || "",
      model_ac: unit.model || "",
      kapasitas_ac: unit.capacity_pk ? String(unit.capacity_pk) : "",
      jenis_unit: unit.ac_type || "",
      deskripsi_lain: unit.notes || "",
      saveToInventory: false,
      inventorySaved: true,
    };
    onChange([...data, newUnit]);
    setSearchOpen(false);
    setSearchQuery("");
    toast.success(`Unit ${unit.unit_code} ditambahkan`);
  };

  const addUnit = () => {
    const newUnit: ACUnitData = {
      id: `unit-${Date.now()}`,
      source: "manual",
      property_id: defaultPropertyId || undefined,
      nama_ruang: "",
      merk_ac: "",
      kapasitas_ac: "",
      jenis_unit: "split_wall",
      deskripsi_lain: "",
      saveToInventory: Boolean(orderId),
      inventorySaved: false,
    };
    onChange([...data, newUnit]);
  };

  const updateUnit = (id: string, field: keyof ACUnitData, value: string) => {
    const updated = data.map((unit) =>
      unit.id === id ? { ...unit, [field]: value } : unit
    );
    onChange(updated);
    console.log(`📝 Unit updated - ${field}:`, value, '| Unit ID:', id);
  };

  const deleteUnit = (id: string) => {
    onChange(data.filter((unit) => unit.id !== id));
    toast.success("Data unit dihapus");
  };

  const filteredInventory = inventory.filter(unit =>
    unit.unit_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.unit_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.location_detail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Data Unit AC</h3>
        <div className="flex gap-2">
          {orderId && (
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Pilih dari Inventory
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Pilih Unit AC dari Inventory</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Cari unit code, property, atau lokasi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredInventory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Tidak ada unit ditemukan
                        </p>
                      ) : (
                        filteredInventory.map((unit) => (
                          <div
                            key={unit.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => selectFromInventory(unit)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{unit.unit_name || unit.location_detail}</h4>
                                <p className="text-sm text-gray-600">{unit.location_detail}</p>
                                <div className="flex gap-4 mt-2 text-sm">
                                  <span className="text-gray-500">
                                    <strong>Merk:</strong> {unit.brand || '-'}
                                  </span>
                                  <span className="text-gray-500">
                                    <strong>Kapasitas:</strong> {unit.capacity_pk ? `${unit.capacity_pk} PK` : '-'}
                                  </span>
                                  <span className="text-gray-500">
                                    <strong>Tipe:</strong> {unit.ac_type || '-'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {unit.unit_code}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button type="button" onClick={addUnit} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Manual
          </Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Belum ada data unit. Klik "Pilih dari Inventory" atau "Tambah Manual".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((unit) => (
            <div
              key={unit.id}
              className="border rounded-lg p-4 space-y-4 bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm text-gray-700">
                  Unit {data.indexOf(unit) + 1}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteUnit(unit.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {unit.source === "inventory" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{unit.nama_ruang || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {unit.property_name ? `Property: ${unit.property_name}` : ""}
                      </div>
                    </div>
                    {unit.unit_code ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {unit.unit_code}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="mr-4"><strong>Merk:</strong> {unit.merk_ac || "-"}</span>
                    <span className="mr-4"><strong>Model:</strong> {unit.model_ac || "-"}</span>
                    <span className="mr-4"><strong>Kapasitas:</strong> {unit.kapasitas_ac ? `${unit.kapasitas_ac} PK` : "-"}</span>
                    <span><strong>Jenis:</strong> {acTypeLabel(unit.jenis_unit)}</span>
                  </div>
                  {unit.deskripsi_lain ? (
                    <div className="text-xs text-muted-foreground">Catatan: {unit.deskripsi_lain}</div>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderId && properties.length > 0 ? (
                    <div className="md:col-span-2">
                      <Label>Property <span className="text-red-500">*</span></Label>
                      <Select
                        value={unit.property_id || ""}
                        onValueChange={(value) => updateUnit(unit.id, "property_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.property_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Unit manual akan dibuat sebagai aset baru di inventory client saat work log disubmit
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <Label>Nama Ruang <span className="text-red-500">*</span></Label>
                    <Input
                      value={unit.nama_ruang}
                      onChange={(e) => updateUnit(unit.id, "nama_ruang", e.target.value)}
                      placeholder="Contoh: Ruang Meeting Lt. 2"
                    />
                  </div>

                  <div>
                    <Label>Merk <span className="text-red-500">*</span></Label>
                    <Input
                      value={unit.merk_ac}
                      onChange={(e) => updateUnit(unit.id, "merk_ac", e.target.value)}
                      placeholder="Contoh: Daikin, Panasonic, LG"
                    />
                  </div>

                  <div>
                    <Label>Model</Label>
                    <Input
                      value={unit.model_ac || ""}
                      onChange={(e) => updateUnit(unit.id, "model_ac", e.target.value)}
                      placeholder="Contoh: FTKC, CS-PN, ..."
                    />
                  </div>

                  <div>
                    <Label>Kapasitas (PK) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={unit.kapasitas_ac}
                      onChange={(e) => updateUnit(unit.id, "kapasitas_ac", e.target.value)}
                      placeholder="Contoh: 1.5"
                    />
                  </div>

                  <div>
                    <Label>Jenis Unit <span className="text-red-500">*</span></Label>
                    <Select
                      value={unit.jenis_unit}
                      onValueChange={(value) => updateUnit(unit.id, "jenis_unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {AC_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Catatan (Opsional)</Label>
                    <Textarea
                      value={unit.deskripsi_lain}
                      onChange={(e) => updateUnit(unit.id, "deskripsi_lain", e.target.value)}
                      placeholder="Catatan tambahan tentang unit ini..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
