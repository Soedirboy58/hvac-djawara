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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";

export interface ACUnitData {
  id: string;
  nama_ruang: string;
  merk_ac: string;
  kapasitas_ac: string;
  jenis_unit: string;
  voltage_supply: string;
  arus_supply: string;
  tekanan_refrigerant: string;
  temperatur_supply: string;
  temperatur_return: string;
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

    // Filter units that should be saved to inventory
    const unitsToSave = units.filter(unit => 
      unit.saveToInventory && !unit.inventorySaved
    );

    if (unitsToSave.length === 0) {
      return { success: true, savedCount: 0, errors: [] };
    }

    // Save each unit to ac_inventory
    for (const unit of unitsToSave) {
      try {
        // Generate unique unit code
        const unitCode = `AC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        
        // Parse property name and location from nama_ruang
        const roomParts = unit.nama_ruang.split(' - ');
        const propertyInfo = orderData.properties && Array.isArray(orderData.properties) && orderData.properties.length > 0 
          ? orderData.properties[0] 
          : orderData.properties;
        const propertyName = roomParts[0] || (propertyInfo && !Array.isArray(propertyInfo) ? propertyInfo.name : 'Property');
        const locationDetail = roomParts[1] || unit.nama_ruang;

        const { error: insertError } = await supabase
          .from('ac_units')
          .insert({
            unit_code: unitCode,
            client_id: orderData.client_id,
            property_id: orderData.property_id,
            tenant_id: orderData.tenant_id,
            unit_name: locationDetail,
            location_detail: locationDetail,
            brand: unit.merk_ac,
            model: unit.merk_ac,
            ac_type: unit.jenis_unit,
            capacity_pk: parseFloat(unit.kapasitas_ac) || 1,
            capacity_btu: Math.round((parseFloat(unit.kapasitas_ac) || 1) * 9000),
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

const JENIS_UNIT_OPTIONS = [
  "Split Wall",
  "Split Duct",
  "Cassette",
  "Floor Standing",
  "VRV/VRF",
  "Chiller",
  "AHU",
  "FCU",
  "Lainnya",
];

export function ACUnitDataTable({ data, onChange, orderId }: ACUnitDataTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch inventory when dialog opens
  useEffect(() => {
    if (searchOpen && orderId) {
      fetchInventory();
    }
  }, [searchOpen, orderId]);

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
      
      // Fetch inventory for this client
      const { data: inventoryData, error } = await supabase
        .from('ac_units')
        .select('*')
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
      nama_ruang: unit.location_detail || unit.unit_name || "",
      merk_ac: unit.brand || "",
      kapasitas_ac: unit.capacity_pk ? `${unit.capacity_pk} PK` : "",
      jenis_unit: unit.ac_type || "",
      voltage_supply: unit.voltage || "",
      arus_supply: "",
      tekanan_refrigerant: "",
      temperatur_supply: "",
      temperatur_return: "",
      deskripsi_lain: unit.notes || "",
    };
    onChange([...data, newUnit]);
    setSearchOpen(false);
    setSearchQuery("");
    toast.success(`Unit ${unit.unit_code} ditambahkan`);
  };

  const addUnit = () => {
    const newUnit: ACUnitData = {
      id: `unit-${Date.now()}`,
      nama_ruang: "",
      merk_ac: "",
      kapasitas_ac: "",
      jenis_unit: "",
      voltage_supply: "",
      arus_supply: "",
      tekanan_refrigerant: "",
      temperatur_supply: "",
      temperatur_return: "",
      deskripsi_lain: "",
      saveToInventory: false,
      inventorySaved: false,
    };
    onChange([...data, newUnit]);
    setEditingId(newUnit.id);
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
        <h3 className="font-semibold">Data Kinerja Unit AC</h3>
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
          <p>Belum ada data unit. Klik "Tambah Unit" untuk menambah.</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nama Ruang *</Label>
                  <Input
                    value={unit.nama_ruang}
                    onChange={(e) =>
                      updateUnit(unit.id, "nama_ruang", e.target.value)
                    }
                    placeholder="Contoh: Ruang Meeting Lt. 2"
                  />
                </div>

                <div>
                  <Label>Merk AC *</Label>
                  <Input
                    value={unit.merk_ac}
                    onChange={(e) =>
                      updateUnit(unit.id, "merk_ac", e.target.value)
                    }
                    placeholder="Contoh: Daikin, Panasonic, LG"
                  />
                </div>

                <div>
                  <Label>Kapasitas AC *</Label>
                  <Input
                    value={unit.kapasitas_ac}
                    onChange={(e) =>
                      updateUnit(unit.id, "kapasitas_ac", e.target.value)
                    }
                    placeholder="Contoh: 2 PK, 1.5 PK"
                  />
                </div>

                <div>
                  <Label>Jenis Unit *</Label>
                  <Select
                    value={unit.jenis_unit}
                    onValueChange={(value) =>
                      updateUnit(unit.id, "jenis_unit", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Voltage Supply (V)</Label>
                  <Input
                    type="number"
                    value={unit.voltage_supply}
                    onChange={(e) =>
                      updateUnit(unit.id, "voltage_supply", e.target.value)
                    }
                    placeholder="Contoh: 220"
                  />
                </div>

                <div>
                  <Label>Arus Supply (A)</Label>
                  <Input
                    type="number"
                    value={unit.arus_supply}
                    onChange={(e) =>
                      updateUnit(unit.id, "arus_supply", e.target.value)
                    }
                    placeholder="Contoh: 10.5"
                  />
                </div>

                <div>
                  <Label>Tekanan Refrigerant (PSI)</Label>
                  <Input
                    value={unit.tekanan_refrigerant}
                    onChange={(e) =>
                      updateUnit(unit.id, "tekanan_refrigerant", e.target.value)
                    }
                    placeholder="Contoh: 65/250"
                  />
                </div>

                <div>
                  <Label>Temperatur Supply (°C)</Label>
                  <Input
                    type="number"
                    value={unit.temperatur_supply}
                    onChange={(e) =>
                      updateUnit(unit.id, "temperatur_supply", e.target.value)
                    }
                    placeholder="Contoh: 12"
                  />
                </div>

                <div>
                  <Label>Temperatur Return (°C)</Label>
                  <Input
                    type="number"
                    value={unit.temperatur_return}
                    onChange={(e) =>
                      updateUnit(unit.id, "temperatur_return", e.target.value)
                    }
                    placeholder="Contoh: 24"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Deskripsi Lain-lain</Label>
                  <Textarea
                    value={unit.deskripsi_lain}
                    onChange={(e) =>
                      updateUnit(unit.id, "deskripsi_lain", e.target.value)
                    }
                    placeholder="Catatan tambahan tentang unit ini..."
                    rows={2}
                  />
                </div>

                {/* Checkbox untuk simpan ke inventory */}
                {orderId && !unit.inventorySaved && (
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Checkbox
                        id={`save-inventory-${unit.id}`}
                        checked={unit.saveToInventory || false}
                        onCheckedChange={(checked) =>
                          updateUnit(unit.id, "saveToInventory", checked as any)
                        }
                      />
                      <label
                        htmlFor={`save-inventory-${unit.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        💾 Tambahkan unit ini ke Inventory Client (unit baru akan tersedia untuk kunjungan berikutnya)
                      </label>
                    </div>
                    {unit.saveToInventory && (
                      <p className="text-xs text-blue-600 mt-2">
                        ✓ Unit ini akan disimpan ke inventory client saat work log disubmit
                      </p>
                    )}
                  </div>
                )}

                {unit.inventorySaved && (
                  <div className="md:col-span-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      ✓ Unit ini sudah tersimpan di inventory client
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
