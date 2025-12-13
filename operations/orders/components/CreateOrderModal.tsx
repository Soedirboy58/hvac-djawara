'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, MapPin, FileText, Clock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateOrder } from '../hooks/useOrders';
import { CreateOrderDto, OrderType, JobPriority } from '../types/order.types';
import { useClients } from '@/domain/crm/clients/hooks/useClients';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormData = {
  clientId: string;
  orderType: OrderType;
  priority: JobPriority;
  serviceTitle: string;
  serviceDescription: string;
  locationAddress: string;
  requestedDate: string;
  estimatedDuration: string;
  notes: string;
};

export function CreateOrderModal({ open, onOpenChange }: CreateOrderModalProps) {
  const { data: clients, isLoading: loadingClients } = useClients();
  const { mutate: createOrder, isPending } = useCreateOrder();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const orderType = watch('orderType');
  const priority = watch('priority');

  const onSubmit = (data: FormData) => {
    const orderData: CreateOrderDto = {
      clientId: data.clientId,
      orderType: data.orderType,
      priority: data.priority,
      serviceTitle: data.serviceTitle,
      serviceDescription: data.serviceDescription || undefined,
      locationAddress: data.locationAddress,
      requestedDate: data.requestedDate ? new Date(data.requestedDate) : undefined,
      estimatedDuration: data.estimatedDuration ? parseInt(data.estimatedDuration) : undefined,
      notes: data.notes || undefined,
    };

    createOrder(orderData, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Order Baru</DialogTitle>
          <DialogDescription>
            Tambahkan order service baru untuk client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client <span className="text-red-500">*</span>
            </Label>
            <Select
              onValueChange={(value) => setValue('clientId', value)}
              disabled={loadingClients}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih client..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} - {client.company || 'Personal'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-sm text-red-500">{errors.clientId.message}</p>
            )}
          </div>

          {/* Order Type & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderType">
                Jenis Service <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value) => setValue('orderType', value as OrderType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">
                Prioritas <span className="text-red-500">*</span>
              </Label>
              <Select
                onValueChange={(value) => setValue('priority', value as JobPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih prioritas..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service Title */}
          <div className="space-y-2">
            <Label htmlFor="serviceTitle">
              Judul Service <span className="text-red-500">*</span>
            </Label>
            <Input
              id="serviceTitle"
              placeholder="e.g., Maintenance AC Rutin Gedung A"
              {...register('serviceTitle', { required: 'Judul service wajib diisi' })}
            />
            {errors.serviceTitle && (
              <p className="text-sm text-red-500">{errors.serviceTitle.message}</p>
            )}
          </div>

          {/* Service Description */}
          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Deskripsi</Label>
            <Textarea
              id="serviceDescription"
              placeholder="Jelaskan detail pekerjaan yang akan dilakukan..."
              rows={3}
              {...register('serviceDescription')}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="locationAddress">
              <MapPin className="inline h-4 w-4 mr-1" />
              Alamat Lokasi <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="locationAddress"
              placeholder="Alamat lengkap lokasi service..."
              rows={2}
              {...register('locationAddress', { required: 'Alamat lokasi wajib diisi' })}
            />
            {errors.locationAddress && (
              <p className="text-sm text-red-500">{errors.locationAddress.message}</p>
            )}
          </div>

          {/* Requested Date & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestedDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Tanggal Diminta
              </Label>
              <Input
                id="requestedDate"
                type="date"
                {...register('requestedDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">
                <Clock className="inline h-4 w-4 mr-1" />
                Estimasi Durasi (menit)
              </Label>
              <Input
                id="estimatedDuration"
                type="number"
                placeholder="e.g., 120"
                {...register('estimatedDuration')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              <FileText className="inline h-4 w-4 mr-1" />
              Catatan Tambahan
            </Label>
            <Textarea
              id="notes"
              placeholder="Catatan internal untuk tim..."
              rows={2}
              {...register('notes')}
            />
          </div>

          {/* Survey Notice */}
          {orderType === 'survey' && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Order Survey</p>
                <p className="text-xs mt-1">
                  Order ini akan masuk sebagai survey. Setelah survey selesai, buat order baru untuk eksekusi pekerjaan.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Menyimpan...' : 'Buat Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
