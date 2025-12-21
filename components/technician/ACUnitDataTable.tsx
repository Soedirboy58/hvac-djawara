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
}

interface ACUnitDataTableProps {
  data: ACUnitData[];
  onChange: (data: ACUnitData[]) => void;
  orderId?: string;
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
        .from('ac_inventory')
        .select('*')
        .eq('client_id', orderData.client_id)
        .order('property_name', { ascending: true });
      
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
      nama_ruang: `${unit.property_name} - ${unit.location_detail}`,
      merk_ac: unit.brand || "",
      kapasitas_ac: unit.capacity || "",
      jenis_unit: unit.ac_type || "",
      voltage_supply: "",
      arus_supply: "",
      tekanan_refrigerant: "",
      temperatur_supply: "",
      temperatur_return: "",
      deskripsi_lain: unit.notes || "",
    };
    onChange([...data, newUnit]);
    setSearchOpen(false);
    setSearchQuery("");
    toast.success(`Unit ${unit.property_name} ditambahkan`);
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
    };
    onChange([...data, newUnit]);
    setEditingId(newUnit.id);
  };

  const updateUnit = (id: string, field: keyof ACUnitData, value: string) => {
    const updated = data.map((unit) =>
      unit.id === id ? { ...unit, [field]: value } : unit
    );
    onChange(updated);
  };

  const deleteUnit = (id: string) => {
    onChange(data.filter((unit) => unit.id !== id));
    toast.success("Data unit dihapus");
  };

  const filteredInventory = inventory.filter(unit =>
    unit.unit_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.location_detail.toLowerCase().includes(searchQuery.toLowerCase())
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
                                <h4 className="font-medium">{unit.property_name}</h4>
                                <p className="text-sm text-gray-600">{unit.location_detail}</p>
                                <div className="flex gap-4 mt-2 text-sm">
                                  <span className="text-gray-500">
                                    <strong>Merk:</strong> {unit.brand || '-'}
                                  </span>
                                  <span className="text-gray-500">
                                    <strong>Kapasitas:</strong> {unit.capacity || '-'}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
