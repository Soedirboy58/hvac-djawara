'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Clock, FileText, Package, AlertCircle, CheckCircle, Trash2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ServiceOrder } from '@/domain/operations/orders/types/order.types';
import { useSPK, useCreateSPK, useUpdateSPK, useDocumentation, useUploadDocumentation, useDeleteDocumentation } from '../hooks/useSPK';
import { Material } from '../types/spk.types';
import { format } from 'date-fns';

interface SPKFormProps {
  order: ServiceOrder;
}

type FormData = {
  startTime: string;
  endTime: string;
  workDescription: string;
  findings: string;
  actionsTaken: string;
  conditionBefore: string;
  conditionAfter: string;
  recommendations: string;
};

export function SPKForm({ order }: SPKFormProps) {
  const { data: spk, isLoading } = useSPK(order.id);
  const { data: documentation } = useDocumentation(order.id);
  const { mutate: createSPK, isPending: isCreating } = useCreateSPK();
  const { mutate: updateSPK, isPending: isUpdating } = useUpdateSPK();
  const { mutate: uploadDoc, isPending: isUploading } = useUploadDocumentation();
  const { mutate: deleteDoc } = useDeleteDocumentation();
  
  const [materials, setMaterials] = useState<Material[]>(spk?.materialsUsed || []);
  const [newMaterial, setNewMaterial] = useState({ name: '', qty: 0, unit: '' });
  const [uploadingCategory, setUploadingCategory] = useState<'before' | 'during' | 'after' | 'equipment' | 'problem' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      startTime: spk?.startTime ? format(new Date(spk.startTime), "yyyy-MM-dd'T'HH:mm") : '',
      endTime: spk?.endTime ? format(new Date(spk.endTime), "yyyy-MM-dd'T'HH:mm") : '',
      workDescription: spk?.workDescription || '',
      findings: spk?.findings || '',
      actionsTaken: spk?.actionsTaken || '',
      conditionBefore: spk?.conditionBefore || '',
      conditionAfter: spk?.conditionAfter || '',
      recommendations: spk?.recommendations || '',
    },
  });

  const addMaterial = () => {
    if (newMaterial.name && newMaterial.qty > 0 && newMaterial.unit) {
      setMaterials([...materials, newMaterial]);
      setNewMaterial({ name: '', qty: 0, unit: '' });
    }
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormData) => {
    const spkData = {
      serviceOrderId: order.id,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      workDescription: data.workDescription,
      findings: data.findings,
      actionsTaken: data.actionsTaken,
      materialsUsed: materials.length > 0 ? materials : undefined,
      conditionBefore: data.conditionBefore,
      conditionAfter: data.conditionAfter,
      recommendations: data.recommendations,
    };

    if (spk) {
      updateSPK({ id: spk.id, data: spkData });
    } else {
      createSPK(spkData);
    }
  };

  const handleFileUpload = (category: 'before' | 'during' | 'after' | 'equipment' | 'problem', file: File) => {
    setUploadingCategory(category);
    uploadDoc({
      serviceOrderId: order.id,
      spkReportId: spk?.id,
      fileType: file.type.startsWith('image/') ? 'photo' : 'document',
      file,
      category,
    }, {
      onSettled: () => setUploadingCategory(null),
    });
  };

  const categoryPhotos = (category: string) => 
    documentation?.filter(doc => doc.category === category) || [];

  if (isLoading) {
    return <div className="p-4">Loading SPK...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Order Info Header */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{order.serviceTitle}</h3>
            <p className="text-sm text-gray-600 mt-1">{order.client?.name}</p>
            <p className="text-sm text-gray-600">{order.locationAddress}</p>
          </div>
          <Badge className="bg-blue-600 text-white">
            {order.orderNumber}
          </Badge>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Time Tracking */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Waktu Pelaksanaan
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Mulai Kerja</Label>
              <Input
                id="startTime"
                type="datetime-local"
                {...register('startTime')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Selesai Kerja</Label>
              <Input
                id="endTime"
                type="datetime-local"
                {...register('endTime')}
              />
            </div>
          </div>
        </Card>

        {/* Photo Documentation - Before */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Foto Kondisi Sebelum
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {categoryPhotos('before').map((doc) => (
              <div key={doc.id} className="relative group">
                <img src={doc.fileUrl} alt="Before" className="w-full h-32 object-cover rounded" />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteDoc({ id: doc.id, fileUrl: doc.fileUrl, serviceOrderId: order.id })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileUpload('before', e.target.files[0])}
            disabled={uploadingCategory === 'before'}
          />
        </Card>

        {/* Work Description */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Deskripsi Pekerjaan
          </h3>
          <Textarea
            placeholder="Jelaskan pekerjaan yang dilakukan..."
            rows={4}
            {...register('workDescription')}
          />
        </Card>

        {/* Condition Before */}
        <Card className="p-4">
          <Label htmlFor="conditionBefore">Kondisi Sebelum</Label>
          <Textarea
            id="conditionBefore"
            placeholder="Kondisi peralatan/area sebelum dikerjakan..."
            rows={3}
            {...register('conditionBefore')}
            className="mt-2"
          />
        </Card>

        {/* Findings */}
        <Card className="p-4">
          <Label htmlFor="findings" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Temuan di Lapangan
          </Label>
          <Textarea
            id="findings"
            placeholder="Temuan masalah atau kondisi yang ditemukan..."
            rows={3}
            {...register('findings')}
            className="mt-2"
          />
        </Card>

        {/* Photo Documentation - Problem */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-red-600" />
            Foto Masalah/Kerusakan
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {categoryPhotos('problem').map((doc) => (
              <div key={doc.id} className="relative group">
                <img src={doc.fileUrl} alt="Problem" className="w-full h-32 object-cover rounded" />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteDoc({ id: doc.id, fileUrl: doc.fileUrl, serviceOrderId: order.id })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileUpload('problem', e.target.files[0])}
          />
        </Card>

        {/* Actions Taken */}
        <Card className="p-4">
          <Label htmlFor="actionsTaken">Tindakan yang Dilakukan</Label>
          <Textarea
            id="actionsTaken"
            placeholder="Jelaskan tindakan perbaikan yang dilakukan..."
            rows={3}
            {...register('actionsTaken')}
            className="mt-2"
          />
        </Card>

        {/* Materials Used */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material yang Digunakan
          </h3>
          
          {materials.length > 0 && (
            <div className="mb-4 space-y-2">
              {materials.map((material, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {material.name} - {material.qty} {material.unit}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMaterial(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-12 gap-2">
            <Input
              placeholder="Nama material"
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              className="col-span-6"
            />
            <Input
              type="number"
              placeholder="Qty"
              value={newMaterial.qty || ''}
              onChange={(e) => setNewMaterial({ ...newMaterial, qty: parseFloat(e.target.value) })}
              className="col-span-2"
            />
            <Input
              placeholder="Unit"
              value={newMaterial.unit}
              onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
              className="col-span-2"
            />
            <Button type="button" onClick={addMaterial} className="col-span-2">
              Tambah
            </Button>
          </div>
        </Card>

        {/* Photo Documentation - After */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-green-600" />
            Foto Kondisi Sesudah
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {categoryPhotos('after').map((doc) => (
              <div key={doc.id} className="relative group">
                <img src={doc.fileUrl} alt="After" className="w-full h-32 object-cover rounded" />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteDoc({ id: doc.id, fileUrl: doc.fileUrl, serviceOrderId: order.id })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileUpload('after', e.target.files[0])}
          />
        </Card>

        {/* Condition After */}
        <Card className="p-4">
          <Label htmlFor="conditionAfter">Kondisi Sesudah</Label>
          <Textarea
            id="conditionAfter"
            placeholder="Kondisi peralatan/area setelah dikerjakan..."
            rows={3}
            {...register('conditionAfter')}
            className="mt-2"
          />
        </Card>

        {/* Recommendations */}
        <Card className="p-4">
          <Label htmlFor="recommendations">Rekomendasi</Label>
          <Textarea
            id="recommendations"
            placeholder="Saran untuk perawatan selanjutnya..."
            rows={3}
            {...register('recommendations')}
            className="mt-2"
          />
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {spk ? 'Update SPK' : 'Simpan SPK'}
          </Button>
        </div>
      </form>
    </div>
  );
}
