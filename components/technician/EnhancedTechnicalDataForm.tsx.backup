"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Plus, Trash2, PenTool, Save, MapPin, Navigation, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import SignatureCanvas from "react-signature-canvas";

interface Sparepart {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string;
}

interface PhotoWithCaption {
  file: File | null;
  preview: string;
  caption: string;
  uploading?: boolean;
  uploaded?: boolean;
}

interface TechnicalDataFormProps {
  orderId: string;
  technicianId: string;
  onSuccess?: () => void;
}

export default function EnhancedTechnicalDataForm({ orderId, technicianId, onSuccess }: TechnicalDataFormProps) {
  // Basic form data
  const [formData, setFormData] = useState({
    // BAST Fields
    nama_personal: "",
    nama_instansi: "",
    no_telephone: "",
    alamat_lokasi: "",
    jenis_pekerjaan: "",
    rincian_pekerjaan: "",
    rincian_kerusakan: "",
    
    // Time tracking
    start_time: "",
    end_time: "",
    
    // Technical measurements
    problem: "",
    tindakan: "",
    lama_kerja: "",
    jarak_tempuh: "",
    lain_lain: "",
    catatan_perbaikan: "",
    catatan_rekomendasi: "",
  });

  // Spareparts
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  
  // Photos with captions
  const [photos, setPhotos] = useState<PhotoWithCaption[]>([]);
  
  // Signatures
  const sigTechnicianRef = useRef<SignatureCanvas>(null);
  const sigClientRef = useRef<SignatureCanvas>(null);
  const [technicianName, setTechnicianName] = useState("");
  const [clientName, setClientName] = useState("");
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [uploading, setUploading] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);

  // Fetch and auto-populate order data
  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      const supabase = createClient();
      
      // Fetch order with client data
      const { data: orderData, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          clients (
            name,
            email,
            phone,
            address,
            client_type
          )
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      
      if (orderData) {
        // Auto-populate form with order data
        setFormData(prev => ({
          ...prev,
          nama_personal: orderData.clients?.name || "",
          nama_instansi: orderData.clients?.client_type === 'perusahaan' ? orderData.clients?.name : "",
          no_telephone: orderData.clients?.phone || "",
          alamat_lokasi: orderData.location_address || orderData.clients?.address || "",
          jenis_pekerjaan: orderData.service_title || "",
          lama_kerja: orderData.estimated_duration?.toString() || "",
        }));
        
        setClientName(orderData.clients?.name || "");
      }
      
      // Fetch technician name
      const { data: techData } = await supabase
        .from('technicians')
        .select('full_name')
        .eq('id', technicianId)
        .single();
      
      if (techData) {
        setTechnicianName(techData.full_name);
      }
      
      // Fetch assignment_id - don't filter by status since order might be completed
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('technician_assignments')
        .select('id')
        .eq('service_order_id', orderId)
        .eq('technician_id', technicianId)
        .maybeSingle();
      
      if (assignmentData) {
        setAssignmentId(assignmentData.id);
      } else {
        console.log('No formal assignment found - will save work log without assignment_id');
        setAssignmentId(null);
      }
      
      // Load existing work log if exists
      const { data: existingWorkLog } = await supabase
        .from('technician_work_logs')
        .select('*')
        .eq('service_order_id', orderId)
        .eq('technician_id', technicianId)
        .maybeSingle();
      
      if (existingWorkLog) {
        console.log('Found existing work log, loading data...');
        
        // Load form data
        setFormData(prev => ({
          ...prev,
          nama_personal: existingWorkLog.nama_personal || prev.nama_personal,
          nama_instansi: existingWorkLog.nama_instansi || prev.nama_instansi,
          no_telephone: existingWorkLog.no_telephone || prev.no_telephone,
          alamat_lokasi: existingWorkLog.alamat_lokasi || prev.alamat_lokasi,
          jenis_pekerjaan: existingWorkLog.jenis_pekerjaan || prev.jenis_pekerjaan,
          rincian_pekerjaan: existingWorkLog.rincian_pekerjaan || "",
          rincian_kerusakan: existingWorkLog.rincian_kerusakan || "",
          catatan_rekomendasi: existingWorkLog.catatan_rekomendasi || "",
          start_time: existingWorkLog.start_time ? new Date(existingWorkLog.start_time).toISOString().slice(0, 16) : "",
          end_time: existingWorkLog.end_time ? new Date(existingWorkLog.end_time).toISOString().slice(0, 16) : "",
          problem: existingWorkLog.problem || "",
          tindakan: existingWorkLog.tindakan || "",
          lama_kerja: existingWorkLog.lama_kerja?.toString() || prev.lama_kerja,
          jarak_tempuh: existingWorkLog.jarak_tempuh?.toString() || "",
          lain_lain: existingWorkLog.lain_lain || "",
          catatan_perbaikan: existingWorkLog.catatan_perbaikan || "",
        }));
        
        // Load signatures
        setTechnicianName(existingWorkLog.signature_technician_name || techData?.full_name || "");
        setClientName(existingWorkLog.signature_client_name || orderData.clients?.name || "");
        setSignatureDate(existingWorkLog.signature_date ? new Date(existingWorkLog.signature_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        
        // Load signature images to canvas (delay to ensure canvas is ready)
        setTimeout(() => {
          if (existingWorkLog.signature_technician && sigTechnicianRef.current) {
            try {
              sigTechnicianRef.current.fromDataURL(existingWorkLog.signature_technician);
              console.log('Loaded technician signature');
            } catch (e) {
              console.error('Failed to load technician signature:', e);
            }
          }
          if (existingWorkLog.signature_client && sigClientRef.current) {
            try {
              sigClientRef.current.fromDataURL(existingWorkLog.signature_client);
              console.log('Loaded client signature');
            } catch (e) {
              console.error('Failed to load client signature:', e);
            }
          }
        }, 500);
        
        // Load photos
        if (existingWorkLog.documentation_photos && existingWorkLog.documentation_photos.length > 0) {
          const loadedPhotos = existingWorkLog.documentation_photos.map((url: string, idx: number) => ({
            file: null as any, // existing photo, no file
            preview: url,
            caption: existingWorkLog.photo_captions?.[idx] || "",
          }));
          setPhotos(loadedPhotos);
        }
        
        // Load spareparts
        const { data: sparepartsData } = await supabase
          .from('work_order_spareparts')
          .select('*')
          .eq('work_log_id', existingWorkLog.id);
        
        if (sparepartsData && sparepartsData.length > 0) {
          const loadedSpareparts = sparepartsData.map((sp: any) => ({
            id: sp.id,
            name: sp.sparepart_name,
            quantity: sp.quantity,
            unit: sp.unit,
            notes: sp.notes || "",
          }));
          setSpareparts(loadedSpareparts);
        }
        
        toast.success('Data teknis yang sudah disimpan berhasil dimuat');
      }
      
    } catch (error: any) {
      console.error('Error fetching order data:', error);
      toast.error('Gagal memuat data order');
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance using GPS
  const calculateDistance = async () => {
    try {
      setCalculatingDistance(true);
      
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude: lat, longitude: lng } = position.coords;
      
      // Hardcoded company office coordinates (you should configure this)
      // TODO: Get from company settings
      const officeCoords = {
        lat: -7.4246, // Example: Purwokerto
        lng: 109.2389
      };
      
      // Calculate distance using Haversine formula
      const R = 6371; // Earth radius in km
      const dLat = (officeCoords.lat - lat) * Math.PI / 180;
      const dLng = (officeCoords.lng - lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(officeCoords.lat * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      setFormData(prev => ({
        ...prev,
        jarak_tempuh: distance.toFixed(1)
      }));
      
      toast.success(`Jarak: ${distance.toFixed(1)} km dari kantor`);
      
    } catch (error: any) {
      console.error('Error calculating distance:', error);
      toast.error('Gagal menghitung jarak. Aktifkan GPS.');
    } finally {
      setCalculatingDistance(false);
    }
  };

  // Handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Sparepart management
  const addSparepart = () => {
    setSpareparts(prev => [...prev, {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      unit: "pcs",
      notes: ""
    }]);
  };

  const updateSparepart = (id: string, field: keyof Sparepart, value: string | number) => {
    setSpareparts(prev => prev.map(sp => 
      sp.id === id ? { ...sp, [field]: value } : sp
    ));
  };

  const removeSparepart = (id: string) => {
    setSpareparts(prev => prev.filter(sp => sp.id !== id));
  };

  // Photo management with captions
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photos.length + files.length > 10) {
      toast.error("Maksimal 10 foto dokumentasi");
      return;
    }
    
    const newPhotos: PhotoWithCaption[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
      uploading: false,
      uploaded: false,
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
    
    // Auto-upload each photo immediately
    const supabase = createClient();
    const startIndex = photos.length;
    
    for (let i = 0; i < newPhotos.length; i++) {
      const photoIndex = startIndex + i;
      const photo = newPhotos[i];
      
      // Mark as uploading
      setPhotos(prev => prev.map((p, idx) => 
        idx === photoIndex ? { ...p, uploading: true } : p
      ));
      
      try {
        const fileExt = photo.file!.name.split(".").pop();
        const fileName = `${orderId}_doc_${Date.now()}_${i}.${fileExt}`;
        const filePath = `${technicianId}/${fileName}`;
        
        console.log(`Uploading photo ${i + 1} to:`, filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("work-photos")
          .upload(filePath, photo.file!);
        
        if (uploadError) {
          console.error(`Upload error for photo ${i + 1}:`, uploadError);
          throw uploadError;
        }
        
        console.log(`Upload success for photo ${i + 1}:`, uploadData);
        
        const { data: { publicUrl } } = supabase.storage
          .from("work-photos")
          .getPublicUrl(filePath);
        
        console.log(`Public URL for photo ${i + 1}:`, publicUrl);
        
        // Revoke old object URL before replacing
        const oldPreview = photos[photoIndex]?.preview;
        if (oldPreview && oldPreview.startsWith('blob:')) {
          URL.revokeObjectURL(oldPreview);
        }
        
        // Update photo with uploaded URL
        setPhotos(prev => prev.map((p, idx) => 
          idx === photoIndex ? { 
            ...p, 
            preview: publicUrl, 
            file: null, // Clear file after upload
            uploading: false, 
            uploaded: true 
          } : p
        ));
        
        toast.success(`Foto ${i + 1} berhasil diupload`);
      } catch (error: any) {
        console.error(`Upload error for photo ${i + 1}:`, error);
        toast.error(`Gagal upload foto ${i + 1}: ${error.message || 'Unknown error'}`);
        
        // Mark as failed
        setPhotos(prev => prev.map((p, idx) => 
          idx === photoIndex ? { ...p, uploading: false, uploaded: false } : p
        ));
      }
    }
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, caption } : photo
    ));
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Upload photos (skip already uploaded ones)
  const uploadPhotos = async (): Promise<{ urls: string[], captions: string[] }> => {
    const urls: string[] = [];
    const captions: string[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      // If photo is already uploaded (uploaded=true or no file), use existing URL
      if (!photo.file || photo.uploaded) {
        urls.push(photo.preview); // preview contains the URL
        captions.push(photo.caption || `Foto ${i + 1}`);
        continue;
      }
      
      // Should not reach here if auto-upload worked, but just in case:
      toast.warning(`Foto ${i + 1} belum selesai diupload, menunggu...`);
      urls.push(photo.preview);
      captions.push(photo.caption || `Foto ${i + 1}`);
    }
    
    return { urls, captions };
  };

  // Save spareparts
  const saveSpareparts = async (workLogId: string) => {
    const supabase = createClient();
    
    // First, delete existing spareparts for this work log to avoid duplicates
    await supabase
      .from("work_order_spareparts")
      .delete()
      .eq("work_log_id", workLogId);
    
    const sparepartsData = spareparts
      .filter(sp => sp.name.trim())
      .map(sp => ({
        work_log_id: workLogId,
        sparepart_name: sp.name,
        quantity: sp.quantity,
        unit: sp.unit,
        notes: sp.notes
      }));
    
    if (sparepartsData.length > 0) {
      const { error } = await supabase
        .from("work_order_spareparts")
        .insert(sparepartsData);
      
      if (error) throw error;
    }
  };

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!formData.problem || !formData.tindakan) {
      toast.error("Problem dan Tindakan wajib diisi");
      return;
    }
    
    if (!technicianName || !clientName) {
      toast.error("Nama Teknisi dan Nama PIC wajib diisi untuk tanda tangan");
      return;
    }
    
    if (!sigTechnicianRef.current?.isEmpty() === false || !sigClientRef.current?.isEmpty() === false) {
      toast.error("Tanda tangan Teknisi dan PIC wajib diisi");
      return;
    }
    
    try {
      setUploading(true);
      const supabase = createClient();
      
      // Upload photos
      const { urls: photoUrls, captions: photoCaptions } = photos.length > 0 
        ? await uploadPhotos() 
        : { urls: [], captions: [] };
      
      // Get signatures as base64
      const signatureTechnician = sigTechnicianRef.current?.toDataURL() || "";
      const signatureClient = sigClientRef.current?.toDataURL() || "";
      
      // Prepare data
      const workLogData = {
        service_order_id: orderId,
        technician_id: technicianId,
        assignment_id: assignmentId,
        log_type: 'technical_report',
        
        // BAST fields
        nama_personal: formData.nama_personal,
        nama_instansi: formData.nama_instansi,
        no_telephone: formData.no_telephone,
        alamat_lokasi: formData.alamat_lokasi,
        jenis_pekerjaan: formData.jenis_pekerjaan,
        rincian_pekerjaan: formData.rincian_pekerjaan,
        rincian_kerusakan: formData.rincian_kerusakan,
        catatan_rekomendasi: formData.catatan_rekomendasi,
        
        // Time tracking
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        
        // Technical data
        problem: formData.problem,
        tindakan: formData.tindakan,
        lama_kerja: formData.lama_kerja ? parseFloat(formData.lama_kerja) : null,
        jarak_tempuh: formData.jarak_tempuh ? parseFloat(formData.jarak_tempuh) : null,
        lain_lain: formData.lain_lain,
        catatan_perbaikan: formData.catatan_perbaikan,
        
        // Documentation
        documentation_photos: photoUrls,
        photo_captions: photoCaptions,
        
        // Signatures
        signature_technician: signatureTechnician,
        signature_client: signatureClient,
        signature_technician_name: technicianName,
        signature_client_name: clientName,
        signature_date: new Date(signatureDate).toISOString(),
        
        // Metadata
        completed_at: new Date().toISOString(),
        report_type: 'bast'
      };
      
      // Check if work log exists
      const { data: existingLog } = await supabase
        .from("technician_work_logs")
        .select("id")
        .eq("service_order_id", orderId)
        .eq("technician_id", technicianId)
        .maybeSingle();
      
      let workLogId;
      
      if (existingLog) {
        // Update existing log
        const { error } = await supabase
          .from("technician_work_logs")
          .update(workLogData)
          .eq("id", existingLog.id);
        
        if (error) {
          console.error("Update error:", error);
          throw error;
        }
        workLogId = existingLog.id;
      } else {
        // Insert new log
        const { data, error } = await supabase
          .from("technician_work_logs")
          .insert([workLogData])
          .select("id")
          .single();
        
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        workLogId = data?.id;
      }
      
      if (!workLogId) {
        throw new Error("Failed to get work log ID");
      }
      
      // Save spareparts
      await saveSpareparts(workLogId);
      
      // Create client document entry for BAST
      try {
        const { data: orderData } = await supabase
          .from('service_orders')
          .select('client_id, order_number, tenant_id')
          .eq('id', orderId)
          .single();
        
        if (orderData && orderData.client_id) {
          // Get current user for uploaded_by
          const { data: { user } } = await supabase.auth.getUser();
          
          // Check if document already exists
          const { data: existingDoc } = await supabase
            .from('client_documents')
            .select('id')
            .eq('related_order_id', orderId)
            .eq('document_type', 'bast')
            .maybeSingle();
          
          if (existingDoc) {
            // Update existing document
            const { error: updateError } = await supabase
              .from('client_documents')
              .update({
                document_name: `Laporan Teknis - ${orderData.order_number}`,
                document_date: new Date().toISOString().split('T')[0],
                status: 'active',
              })
              .eq('id', existingDoc.id);
            
            if (updateError) {
              console.error('Document update error:', updateError);
            } else {
              console.log('✓ Client document updated for order', orderData.order_number);
            }
          } else {
            // Insert new document
            const { error: insertError } = await supabase
              .from('client_documents')
              .insert({
                client_id: orderData.client_id,
                tenant_id: orderData.tenant_id,
                document_name: `Laporan Teknis - ${orderData.order_number}`,
                document_type: 'bast',
                file_path: `technical-reports/${orderId}.pdf`,
                file_type: 'application/pdf',
                file_size: 0,
                document_number: orderData.order_number,
                document_date: new Date().toISOString().split('T')[0],
                related_order_id: orderId,
                status: 'active',
                uploaded_by: user?.id || null,
              });
            
            if (insertError) {
              console.error('Document insert error:', insertError);
            } else {
              console.log('✓ Client document created for order', orderData.order_number);
            }
          }
        } else {
          console.warn('Order data incomplete, skipping document creation');
        }
      } catch (docErr) {
        console.error('Failed to create document entry (non-critical):', docErr);
      }
      
      toast.success("Data teknis berhasil disimpan!");
      
      // Small delay to ensure data is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess?.();
      
    } catch (error: any) {
      console.error("Error saving technical data:", error);
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
      toast.error("Gagal menyimpan data teknis: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Memuat data order...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            ℹ️ Data di bawah sudah terisi otomatis dari order. Silakan lengkapi data teknis dan dokumentasi.
          </p>
        </CardContent>
      </Card>

      {/* BAST Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Laporan Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nama Personal / PIC</Label>
              <Input
                value={formData.nama_personal}
                onChange={(e) => handleInputChange('nama_personal', e.target.value)}
                placeholder="Bp. Nama PIC"
              />
            </div>
            <div>
              <Label>Nama Instansi / Perusahaan</Label>
              <Input
                value={formData.nama_instansi}
                onChange={(e) => handleInputChange('nama_instansi', e.target.value)}
                placeholder="PT. Nama Perusahaan"
              />
            </div>
            <div>
              <Label>No. Telephone</Label>
              <Input
                type="tel"
                value={formData.no_telephone}
                onChange={(e) => handleInputChange('no_telephone', e.target.value)}
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
            <div>
              <Label>Jenis Pekerjaan</Label>
              <Input
                value={formData.jenis_pekerjaan}
                onChange={(e) => handleInputChange('jenis_pekerjaan', e.target.value)}
                placeholder="Misal: Checking AC, Perbaikan, Instalasi"
              />
            </div>
          </div>
          
          <div>
            <Label>Alamat Lokasi</Label>
            <Textarea
              value={formData.alamat_lokasi}
              onChange={(e) => handleInputChange('alamat_lokasi', e.target.value)}
              placeholder="Alamat lengkap lokasi pekerjaan"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Waktu Pengerjaan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Waktu & Tanggal Pengerjaan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Sebelum (Mulai)</Label>
              <Input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
              />
            </div>
            <div>
              <Label>Sesudah (Selesai)</Label>
              <Input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rincian Pekerjaan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rincian Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.rincian_pekerjaan}
            onChange={(e) => handleInputChange('rincian_pekerjaan', e.target.value)}
            placeholder="1. Pengecekan kinerja AC&#10;2. Pembersihan filter&#10;3. ..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Rincian Kerusakan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rincian Kerusakan AC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={formData.rincian_kerusakan}
            onChange={(e) => handleInputChange('rincian_kerusakan', e.target.value)}
            placeholder="1. PCB Indoor rusak&#10;2. Kabel komunikasi bermasalah&#10;3. ..."
            rows={3}
          />
          
          <div>
            <Label>Problem Detail <span className="text-red-500">*</span></Label>
            <Textarea
              value={formData.problem}
              onChange={(e) => handleInputChange('problem', e.target.value)}
              placeholder="Jelaskan masalah teknis secara detail..."
              rows={3}
              required
            />
          </div>
          
          <div>
            <Label>Tindakan / Solusi <span className="text-red-500">*</span></Label>
            <Textarea
              value={formData.tindakan}
              onChange={(e) => handleInputChange('tindakan', e.target.value)}
              placeholder="Jelaskan tindakan perbaikan yang dilakukan..."
              rows={3}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Sparepart / Material */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Rincian Sparepart / Material</CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={addSparepart}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {spareparts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada sparepart/material. Klik "Tambah Item" untuk menambah.
            </p>
          ) : (
            <div className="space-y-3">
              {spareparts.map((sp, index) => (
                <div key={sp.id} className="flex gap-2 items-start border rounded-lg p-3">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Nama sparepart/material"
                        value={sp.name}
                        onChange={(e) => updateSparepart(sp.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={sp.quantity}
                        onChange={(e) => updateSparepart(sp.id, 'quantity', parseFloat(e.target.value))}
                      />
                      <Input
                        placeholder="Unit"
                        value={sp.unit}
                        onChange={(e) => updateSparepart(sp.id, 'unit', e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Keterangan"
                      value={sp.notes}
                      onChange={(e) => updateSparepart(sp.id, 'notes', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => removeSparepart(sp.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catatan & Rekomendasi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Catatan / Rekomendasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Catatan Untuk Perbaikan</Label>
            <Textarea
              value={formData.catatan_perbaikan}
              onChange={(e) => handleInputChange('catatan_perbaikan', e.target.value)}
              placeholder="Catatan internal atau untuk perbaikan berikutnya..."
              rows={2}
            />
          </div>
          <div>
            <Label>Rekomendasi</Label>
            <Textarea
              value={formData.catatan_rekomendasi}
              onChange={(e) => handleInputChange('catatan_rekomendasi', e.target.value)}
              placeholder="Penggantian sparepart, perawatan rutin, dll"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Lama Kerja (jam)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.lama_kerja}
                onChange={(e) => handleInputChange('lama_kerja', e.target.value)}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                * Auto dari estimasi order
              </p>
            </div>
            <div>
              <Label>Jarak Tempuh dari Kantor (km)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.jarak_tempuh}
                  onChange={(e) => handleInputChange('jarak_tempuh', e.target.value)}
                  placeholder="0.0"
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  type="button"
                  onClick={calculateDistance}
                  disabled={calculatingDistance}
                  className="flex-shrink-0"
                >
                  {calculatingDistance ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                * Klik tombol untuk hitung jarak otomatis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dokumentasi dengan Caption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lampiran Gambar Kerja (Maksimal 10)</CardTitle>
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
          
          {photos.length > 0 && (
            <div className="space-y-3">
              {photos.map((photo, index) => (
                <div key={index} className="border rounded-lg p-3 relative">
                  {/* Upload Loading Overlay */}
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm font-medium">Mengupload...</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <div className="relative">
                      <img
                        src={photo.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-24 h-24 object-cover rounded bg-gray-100"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Image load error:', photo.preview);
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Error</text></svg>';
                        }}
                      />
                      {/* Upload Success Badge on Image */}
                      {photo.uploaded && (
                        <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-xs">OK</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            Foto #{index + 1}
                          </Label>
                          {photo.uploaded && (
                            <span className="text-xs text-green-600 font-medium">✓ Tersimpan</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removePhoto(index)}
                          disabled={photo.uploading}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Hapus
                        </Button>
                      </div>
                      <Input
                        placeholder="Keterangan foto..."
                        value={photo.caption}
                        onChange={(e) => updatePhotoCaption(index, e.target.value)}
                        disabled={photo.uploading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Tanda Tangan Digital
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Technician Signature */}
            <div className="space-y-2">
              <Label>Teknisi Yang Bertugas <span className="text-red-500">*</span></Label>
              <Input
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Nama lengkap teknisi"
                required
              />
              <div className="border-2 border-dashed rounded-lg p-2">
                <SignatureCanvas
                  ref={sigTechnicianRef}
                  canvasProps={{
                    className: 'w-full h-32 bg-white rounded',
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => sigTechnicianRef.current?.clear()}
                className="w-full"
              >
                Hapus Tanda Tangan
              </Button>
            </div>
            
            {/* Client Signature */}
            <div className="space-y-2">
              <Label>Pemilik / Penanggung Jawab <span className="text-red-500">*</span></Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nama lengkap PIC"
                required
              />
              <div className="border-2 border-dashed rounded-lg p-2">
                <SignatureCanvas
                  ref={sigClientRef}
                  canvasProps={{
                    className: 'w-full h-32 bg-white rounded',
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => sigClientRef.current?.clear()}
                className="w-full"
              >
                Hapus Tanda Tangan
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Tanggal Tanda Tangan</Label>
            <Input
              type="date"
              value={signatureDate}
              onChange={(e) => setSignatureDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Message */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Catatan:</strong> Dengan ini teknisi kami telah mengerjakan dan menyelesaikan pekerjaan dengan baik tanpa ada kendala dan kerusakan unit yang disebabkan oleh teknisi kami.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={uploading || !formData.problem || !formData.tindakan || !technicianName || !clientName}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Menyimpan & Mengupload...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Simpan Laporan Pekerjaan
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          onClick={async () => {
            const { generateTechnicalReportPDF } = await import("@/lib/pdf-generator");
            const blob = await generateTechnicalReportPDF({
              order_number: orderId,
              service_title: formData.jenis_pekerjaan,
              client_name: clientName,
              location: formData.alamat_lokasi,
              scheduled_date: new Date().toISOString(),
              technician_name: technicianName,
              problem: formData.problem,
              tindakan: formData.tindakan,
              rincian_pekerjaan: formData.rincian_pekerjaan,
              rincian_kerusakan: formData.rincian_kerusakan,
              lama_kerja: formData.lama_kerja ? parseFloat(formData.lama_kerja) : undefined,
              jarak_tempuh: formData.jarak_tempuh ? parseFloat(formData.jarak_tempuh) : undefined,
              spareparts: spareparts.map(sp => ({
                name: sp.name,
                quantity: sp.quantity,
                unit: sp.unit,
                notes: sp.notes,
              })),
              photos: photos.map(p => p.preview), // Photo URLs or base64
              photo_captions: photos.map(p => p.caption),
              signature_technician: sigTechnicianRef.current?.toDataURL(),
              signature_client: sigClientRef.current?.toDataURL(),
              signature_technician_name: technicianName,
              signature_client_name: clientName,
              signature_date: signatureDate,
            });
            
            // Download PDF
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Laporan-${orderId}-${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast.success("PDF berhasil diunduh!");
          }}
          disabled={!formData.problem || !formData.tindakan}
        >
          <Upload className="mr-2 h-5 w-5" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}
