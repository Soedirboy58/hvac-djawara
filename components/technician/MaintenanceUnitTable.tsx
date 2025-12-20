"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface MaintenanceUnitData {
  id: string;
  nama_ruang: string;
  merk_ac: string;
  kapasitas_ac: string;
  kondisi_ac: string;
  deskripsi_lain: string;
}

interface MaintenanceUnitTableProps {
  data: MaintenanceUnitData[];
  onChange: (data: MaintenanceUnitData[]) => void;
}

const KONDISI_AC_OPTIONS = [
  { value: "kotor_ringan", label: "Kotor Ringan" },
  { value: "kotor_sedang", label: "Kotor Sedang" },
  { value: "kotor_berat", label: "Kotor Berat (Berlendir)" },
  { value: "bersih", label: "Bersih" },
];

export function MaintenanceUnitTable({
  data,
  onChange,
}: MaintenanceUnitTableProps) {
  const addUnit = () => {
    const newUnit: MaintenanceUnitData = {
      id: `maintenance-${Date.now()}`,
      nama_ruang: "",
      merk_ac: "",
      kapasitas_ac: "",
      kondisi_ac: "",
      deskripsi_lain: "",
    };
    onChange([...data, newUnit]);
  };

  const updateUnit = (
    id: string,
    field: keyof MaintenanceUnitData,
    value: string
  ) => {
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
        <h3 className="font-semibold">Data Unit Pemeliharaan</h3>
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
                  <Label>Kondisi AC *</Label>
                  <Select
                    value={unit.kondisi_ac}
                    onValueChange={(value) =>
                      updateUnit(unit.id, "kondisi_ac", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kondisi" />
                    </SelectTrigger>
                    <SelectContent>
                      {KONDISI_AC_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Deskripsi Lain-lain</Label>
                  <Textarea
                    value={unit.deskripsi_lain}
                    onChange={(e) =>
                      updateUnit(unit.id, "deskripsi_lain", e.target.value)
                    }
                    placeholder="Catatan tambahan tentang kondisi unit..."
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
