"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface TechnicalData {
  // Pengukuran
  mcb_1?: number;
  mcb_2?: number;
  mcb_3?: number;
  mcb_4?: number;
  mcb_5?: number;
  
  volt_1?: number;
  volt_2?: number;
  volt_3?: number;
  volt_4?: number;
  volt_5?: number;
  
  ampere_total_1?: number;
  ampere_total_2?: number;
  ampere_total_3?: number;
  ampere_total_4?: number;
  ampere_total_5?: number;
  
  ampere_kompressor_1?: number;
  ampere_kompressor_2?: number;
  ampere_kompressor_3?: number;
  ampere_kompressor_4?: number;
  ampere_kompressor_5?: number;
  
  ampere_kipas_1?: number;
  ampere_kipas_2?: number;
  ampere_kipas_3?: number;
  ampere_kipas_4?: number;
  ampere_kipas_5?: number;
  
  tekanan_tinggi_1?: number;
  tekanan_tinggi_2?: number;
  tekanan_tinggi_3?: number;
  tekanan_tinggi_4?: number;
  tekanan_tinggi_5?: number;
  
  tekanan_rendah_1?: number;
  tekanan_rendah_2?: number;
  tekanan_rendah_3?: number;
  tekanan_rendah_4?: number;
  tekanan_rendah_5?: number;
  
  kondensor_in_out_1?: number;
  kondensor_in_out_2?: number;
  kondensor_in_out_3?: number;
  kondensor_in_out_4?: number;
  kondensor_in_out_5?: number;
  
  evaporator_in_out_1?: number;
  evaporator_in_out_2?: number;
  evaporator_in_out_3?: number;
  evaporator_in_out_4?: number;
  evaporator_in_out_5?: number;
  
  temp_ruang_1?: number;
  temp_ruang_2?: number;
  temp_ruang_3?: number;
  temp_ruang_4?: number;
  temp_ruang_5?: number;
  
  lain_lain?: string;
  
  // Riwayat Pekerjaan
  problem: string;
  tindakan: string;
  biaya?: number;
  lama_kerja?: number;
  jarak_tempuh?: number;
  
  // Catatan
  catatan_perbaikan?: string;
}

interface TechnicalDataFormProps {
  orderId: string;
  technicianId: string;
  onSuccess?: () => void;
}

export default function TechnicalDataForm({ orderId, technicianId, onSuccess }: TechnicalDataFormProps) {
  const [formData, setFormData] = useState<TechnicalData>({
    problem: "",
    tindakan: "",
  });
  
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (field: keyof TechnicalData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Limit to 10 photos
    if (photos.length + files.length > 10) {
      toast.error("Maksimal 10 foto dokumentasi");
      return;
    }
    
    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    
    setPhotos(prev => [...prev, ...files]);
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removePhoto = (index: number) => {
    // Revoke preview URL
    URL.revokeObjectURL(photoPreviewUrls[index]);
    
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const supabase = createClient();
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${orderId}_doc_${Date.now()}_${i}.${fileExt}`;
      const filePath = `${technicianId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("work-photos")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("work-photos")
        .getPublicUrl(filePath);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!formData.problem || !formData.tindakan) {
      toast.error("Problem dan Tindakan wajib diisi");
      return;
    }
    
    try {
      setUploading(true);
      const supabase = createClient();
      
      // Upload photos
      const photoUrls = photos.length > 0 ? await uploadPhotos() : [];
      
      // Save technical data
      const { error } = await supabase
        .from("technician_work_logs")
        .upsert({
          service_order_id: orderId,
          technician_id: technicianId,
          ...formData,
          documentation_photos: photoUrls,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "service_order_id,technician_id"
        });
      
      if (error) throw error;
      
      toast.success("Data teknis berhasil disimpan!");
      onSuccess?.();
      
    } catch (error: any) {
      console.error("Error saving technical data:", error);
      toast.error("Gagal menyimpan data teknis");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pengukuran Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Pengukuran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Parameter</th>
                  <th className="text-center py-2 px-2 font-medium">1</th>
                  <th className="text-center py-2 px-2 font-medium">2</th>
                  <th className="text-center py-2 px-2 font-medium">3</th>
                  <th className="text-center py-2 px-2 font-medium">4</th>
                  <th className="text-center py-2 px-2 font-medium">5</th>
                  <th className="text-center py-2 px-2 font-medium">Satuan</th>
                </tr>
              </thead>
              <tbody>
                {/* MCB */}
                <tr className="border-b">
                  <td className="py-2 px-2">MCB</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('mcb_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('mcb_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('mcb_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('mcb_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('mcb_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">A</td>
                </tr>
                
                {/* Volt */}
                <tr className="border-b">
                  <td className="py-2 px-2">Volt</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('volt_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('volt_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('volt_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('volt_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('volt_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">V</td>
                </tr>
                
                {/* Ampere Total */}
                <tr className="border-b">
                  <td className="py-2 px-2">Ampere Total</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_total_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_total_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_total_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_total_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_total_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">A</td>
                </tr>
                
                {/* Ampere Kompressor */}
                <tr className="border-b">
                  <td className="py-2 px-2">Ampere Kompressor</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kompressor_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kompressor_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kompressor_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kompressor_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kompressor_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">A</td>
                </tr>
                
                {/* Ampere Kipas */}
                <tr className="border-b">
                  <td className="py-2 px-2">Ampere Kipas IU/OU</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kipas_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kipas_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kipas_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kipas_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('ampere_kipas_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">A</td>
                </tr>
                
                {/* Tekanan Tinggi */}
                <tr className="border-b">
                  <td className="py-2 px-2">Tekanan Tinggi</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_tinggi_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_tinggi_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_tinggi_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_tinggi_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_tinggi_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">Kg/Cm²</td>
                </tr>
                
                {/* Tekanan Rendah */}
                <tr className="border-b">
                  <td className="py-2 px-2">Tekanan Rendah</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_rendah_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_rendah_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_rendah_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_rendah_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('tekanan_rendah_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">Kg/Cm²</td>
                </tr>
                
                {/* Kondensor In/Out Temp */}
                <tr className="border-b">
                  <td className="py-2 px-2">Kondensor In/Out Temp</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('kondensor_in_out_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('kondensor_in_out_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('kondensor_in_out_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('kondensor_in_out_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('kondensor_in_out_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">°C</td>
                </tr>
                
                {/* Evaporator In/Out Temp */}
                <tr className="border-b">
                  <td className="py-2 px-2">Evaporator In/Out Temp</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('evaporator_in_out_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('evaporator_in_out_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('evaporator_in_out_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('evaporator_in_out_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('evaporator_in_out_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">°C</td>
                </tr>
                
                {/* Temp Ruang */}
                <tr className="border-b">
                  <td className="py-2 px-2">Temp Ruang</td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('temp_ruang_1', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('temp_ruang_2', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('temp_ruang_3', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('temp_ruang_4', e.target.value)} /></td>
                  <td className="py-2 px-2"><Input type="number" className="h-8 text-center" onChange={(e) => handleInputChange('temp_ruang_5', e.target.value)} /></td>
                  <td className="py-2 px-2 text-center">°C</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <Label>Lain-lain</Label>
            <Textarea
              placeholder="Catatan tambahan pengukuran..."
              value={formData.lain_lain || ""}
              onChange={(e) => handleInputChange('lain_lain', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Riwayat Pekerjaan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Lama Kerja (jam)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.lama_kerja || ""}
                onChange={(e) => handleInputChange('lama_kerja', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Jarak Tempuh (km)</Label>
              <Input
                type="number"
                value={formData.jarak_tempuh || ""}
                onChange={(e) => handleInputChange('jarak_tempuh', parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <div>
            <Label>Problem <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Jelaskan masalah yang ditemukan..."
              value={formData.problem}
              onChange={(e) => handleInputChange('problem', e.target.value)}
              rows={3}
              required
            />
          </div>
          
          <div>
            <Label>Tindakan / Solusi <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Jelaskan tindakan yang dilakukan..."
              value={formData.tindakan}
              onChange={(e) => handleInputChange('tindakan', e.target.value)}
              rows={3}
              required
            />
          </div>
          
          <div>
            <Label>Biaya (Rp)</Label>
            <Input
              type="number"
              value={formData.biaya || ""}
              onChange={(e) => handleInputChange('biaya', parseFloat(e.target.value))}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Catatan Perbaikan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Catatan Untuk Perbaikan</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Catatan tambahan atau rekomendasi perbaikan selanjutnya..."
            value={formData.catatan_perbaikan || ""}
            onChange={(e) => handleInputChange('catatan_perbaikan', e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Upload Dokumentasi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dokumentasi Foto (Maksimal 10)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="photos">Upload Foto</Label>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoSelect}
              disabled={photos.length >= 10}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {photos.length}/10 foto
            </p>
          </div>
          
          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={uploading || !formData.problem || !formData.tindakan}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Menyimpan...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-5 w-5" />
            Simpan Data Teknis
          </>
        )}
      </Button>
    </div>
  );
}
