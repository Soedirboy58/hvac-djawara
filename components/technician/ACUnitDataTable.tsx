"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export function ACUnitDataTable({ data, onChange }: ACUnitDataTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Data Kinerja Unit AC</h3>
        <Button type="button" onClick={addUnit} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Unit
        </Button>
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
