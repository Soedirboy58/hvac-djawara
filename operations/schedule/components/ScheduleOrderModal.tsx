'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, User } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateOrder } from '@/domain/operations/orders/hooks/useOrders';
import { ServiceOrder } from '@/domain/operations/orders/types/order.types';

interface ScheduleOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder | null;
  selectedDate?: Date;
}

type FormData = {
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: string;
  assignedTo?: string;
};

export function ScheduleOrderModal({ 
  open, 
  onOpenChange, 
  order,
  selectedDate 
}: ScheduleOrderModalProps) {
  const { mutate: updateOrder, isPending } = useUpdateOrder();
  
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      scheduledDate: selectedDate 
        ? selectedDate.toISOString().split('T')[0]
        : order?.scheduledDate || '',
      scheduledTime: order?.scheduledTime || '',
      estimatedDuration: order?.estimatedDuration?.toString() || '120',
      assignedTo: order?.assignedTo || '',
    },
  });

  const onSubmit = (data: FormData) => {
    if (!order) return;

    updateOrder({
      id: order.id,
      data: {
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        estimatedDuration: parseInt(data.estimatedDuration),
        assignedTo: data.assignedTo || undefined,
        status: 'scheduled',
      },
    }, {
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

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Jadwalkan Order</DialogTitle>
          <DialogDescription>
            Atur jadwal untuk: {order.serviceTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Client Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Client</p>
            <p className="font-semibold">{order.client?.name}</p>
            <p className="text-sm text-gray-600 mt-1">{order.locationAddress}</p>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduledDate">
              <Calendar className="inline h-4 w-4 mr-1" />
              Tanggal <span className="text-red-500">*</span>
            </Label>
            <Input
              id="scheduledDate"
              type="date"
              {...register('scheduledDate', { required: 'Tanggal wajib diisi' })}
            />
            {errors.scheduledDate && (
              <p className="text-sm text-red-500">{errors.scheduledDate.message}</p>
            )}
          </div>

          {/* Scheduled Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduledTime">
              <Clock className="inline h-4 w-4 mr-1" />
              Jam <span className="text-red-500">*</span>
            </Label>
            <Input
              id="scheduledTime"
              type="time"
              {...register('scheduledTime', { required: 'Jam wajib diisi' })}
            />
            {errors.scheduledTime && (
              <p className="text-sm text-red-500">{errors.scheduledTime.message}</p>
            )}
          </div>

          {/* Estimated Duration */}
          <div className="space-y-2">
            <Label htmlFor="estimatedDuration">
              Estimasi Durasi (menit)
            </Label>
            <Input
              id="estimatedDuration"
              type="number"
              placeholder="e.g., 120"
              {...register('estimatedDuration')}
            />
          </div>

          {/* Assign Technician - Placeholder for now */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">
              <User className="inline h-4 w-4 mr-1" />
              Assign Teknisi (Optional)
            </Label>
            <Select
              onValueChange={(value) => setValue('assignedTo', value)}
              defaultValue={order.assignedTo || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih teknisi..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum ditentukan</SelectItem>
                {/* TODO: Load technicians from database */}
              </SelectContent>
            </Select>
          </div>

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
              {isPending ? 'Menyimpan...' : 'Jadwalkan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
