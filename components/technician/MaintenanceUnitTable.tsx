"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Search, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface PhotoData {
  file: File | null;
  preview: string;
  caption: string;
  uploaded?: boolean;
  uploading?: boolean;
}

export interface MaintenanceUnitData {
  id: string;
  ac_unit_id?: string; // NEW: Link to inventory
  unit_code?: string; // NEW: From inventory
  nama_ruang: string;
  merk_ac: string;
  kapasitas_ac: string;
  kondisi_ac: string;
  deskripsi_lain: string;
  photos?: PhotoData[]; // NEW: 4 photos per unit
}

interface ACInventoryUnit {
  id: string;
  unit_code: string;
  property_name: string;
  location_detail: string;
  brand_model: string;
  capacity: string;
  ac_type: string;
}

interface MaintenanceUnitTableProps {
  data: MaintenanceUnitData[];
  onChange: (data: MaintenanceUnitData[]) => void;
  orderId: string;
  technicianId: string;
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
  orderId,
  technicianId,
}: MaintenanceUnitTableProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryUnits, setInventoryUnits] = useState<ACInventoryUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // Fetch AC inventory when search dialog opens
  useEffect(() => {
    if (searchOpen) {
      fetchInventory();
    }
  }, [searchOpen]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data: inventoryData, error } = await supabase
        .from("ac_units")
        .select(`
          id,
          unit_code,
          client_properties!inner(property_name),
          location_detail,
          brand,
          model,
          capacity_pk,
          ac_type
        `)
        .order("unit_code");
      
      if (error) throw error;
      
      const mapped = inventoryData?.map((item: any) => ({
        id: item.id,
        unit_code: item.unit_code || "",
        property_name: item.client_properties?.property_name || "",
        location_detail: item.location_detail || "",
        brand_model: `${item.brand || ""} ${item.model || ""}`.trim(),
        capacity: item.capacity_pk ? `${item.capacity_pk} PK` : "",
        ac_type: item.ac_type || "",
      })) || [];
      
      setInventoryUnits(mapped);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Gagal memuat data inventory");
    } finally {
      setLoading(false);
    }
  };

  const selectFromInventory = (unit: ACInventoryUnit) => {
    const newUnit: MaintenanceUnitData = {
      id: `maintenance-${Date.now()}`,
      ac_unit_id: unit.id,
      unit_code: unit.unit_code,
      nama_ruang: unit.location_detail || unit.property_name,
      merk_ac: unit.brand_model,
      kapasitas_ac: unit.capacity,
      kondisi_ac: "",
      deskripsi_lain: "",
      photos: [],
    };
    onChange([...data, newUnit]);
    setSearchOpen(false);
    setSearchQuery("");
    toast.success(`Unit ${unit.unit_code} ditambahkan`);
  };
  const addUnit = () => {
    const newUnit: MaintenanceUnitData = {
      id: `maintenance-${Date.now()}`,
      nama_ruang: "",
      merk_ac: "",
      kapasitas_ac: "",
      kondisi_ac: "",
      deskripsi_lain: "",
      photos: [],
    };
    onChange([...data, newUnit]);
  };

  const updateUnit = (
    id: string,
    field: keyof MaintenanceUnitData,
    value: any
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

  // Photo management per unit
  const handlePhotoSelect = async (unitId: string, files: File[]) => {
    const unit = data.find(u => u.id === unitId);
    if (!unit) return;
    
    const currentPhotos = unit.photos || [];
    
    if (currentPhotos.length + files.length > 4) {
      toast.error("Maksimal 4 foto per unit");
      return;
    }
    
    const newPhotos: PhotoData[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
      uploading: false,
      uploaded: false,
    }));
    
    updateUnit(unitId, "photos", [...currentPhotos, ...newPhotos]);
    
    // Auto upload
    const supabase = createClient();
    for (let i = 0; i < newPhotos.length; i++) {
      const photo = newPhotos[i];
      const photoIndex = currentPhotos.length + i;
      
      try {
        // Mark uploading
        const updatedUnit = data.find(u => u.id === unitId);
        if (updatedUnit && updatedUnit.photos) {
          updatedUnit.photos[photoIndex].uploading = true;
          updateUnit(unitId, "photos", [...updatedUnit.photos]);
        }
        
        const fileExt = photo.file!.name.split(".").pop();
        const fileName = `${orderId}_unit_${unitId}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `${technicianId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("work-photos")
          .upload(filePath, photo.file!);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("work-photos")
          .getPublicUrl(filePath);
        
        // Update with URL
        const finalUnit = data.find(u => u.id === unitId);
        if (finalUnit && finalUnit.photos) {
          finalUnit.photos[photoIndex] = {
            file: null,
            preview: publicUrl,
            caption: "",
            uploading: false,
            uploaded: true,
          };
          updateUnit(unitId, "photos", [...finalUnit.photos]);
        }
        
        toast.success(`Foto ${i + 1} unit berhasil diupload`);
      } catch (error: any) {
        console.error("Upload error:", error);
        toast.error(`Gagal upload foto: ${error.message}`);
      }
    }
  };

  const updatePhotoCaption = (unitId: string, photoIndex: number, caption: string) => {
    const unit = data.find(u => u.id === unitId);
    if (!unit || !unit.photos) return;
    
    const updatedPhotos = [...unit.photos];
    updatedPhotos[photoIndex].caption = caption;
    updateUnit(unitId, "photos", updatedPhotos);
  };

  const removePhoto = (unitId: string, photoIndex: number) => {
    const unit = data.find(u => u.id === unitId);
    if (!unit || !unit.photos) return;
    
    const updatedPhotos = unit.photos.filter((_, i) => i !== photoIndex);
    updateUnit(unitId, "photos", updatedPhotos);
    toast.success("Foto dihapus");
  };

  const filteredInventory = inventoryUnits.filter(unit =>
    unit.unit_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.location_detail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Data Unit Pemeliharaan</h3>
        <div className="flex gap-2">
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
                          className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => selectFromInventory(unit)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-blue-600">{unit.unit_code}</p>
                              <p className="text-sm text-gray-600">{unit.property_name}</p>
                              <p className="text-xs text-gray-500">{unit.location_detail}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-medium">{unit.brand_model}</p>
                              <p className="text-gray-600">{unit.capacity}</p>
                              <p className="text-xs text-gray-500">{unit.ac_type}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
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

              {/* Photo Upload Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label>Foto Dokumentasi Unit (Max 4)</Label>
                  <span className="text-xs text-gray-500">
                    {unit.photos?.length || 0}/4 foto
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {unit.photos?.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={photo.preview}
                          alt={`Unit ${data.indexOf(unit) + 1} - Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {photo.uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(unit.id, index)}
                        disabled={photo.uploading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      
                      <Input
                        type="text"
                        placeholder="Keterangan foto..."
                        value={photo.caption}
                        onChange={(e) => updatePhotoCaption(unit.id, index, e.target.value)}
                        className="mt-1 text-xs"
                        disabled={photo.uploading}
                      />
                    </div>
                  ))}
                </div>
                
                {(!unit.photos || unit.photos.length < 4) && (
                  <div>
                    <input
                      id={`photo-${unit.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          handlePhotoSelect(unit.id, files);
                          e.target.value = "";
                        }
                      }}
                    />
                    <label htmlFor={`photo-${unit.id}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <span className="cursor-pointer">
                          <Plus className="w-4 h-4 mr-2" />
                          Tambah Foto ({4 - (unit.photos?.length || 0)} slot tersisa)
                        </span>
                      </Button>
                    </label>
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
