'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';

interface RequestServiceFormProps {
  variant?: 'default' | 'compact';
  onSuccess?: () => void;
}

export function RequestServiceForm({ variant = 'default', onSuccess }: RequestServiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service_type: 'maintenance',
    address: '',
    preferred_date: '',
    preferred_time: 'pagi',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          phone: '',
          email: '',
          service_type: 'maintenance',
          address: '',
          preferred_date: '',
          preferred_time: 'pagi',
          notes: '',
        });
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else {
          setTimeout(() => setSuccess(false), 5000);
        }
      } else {
        alert('Gagal mengirim request. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Request Berhasil Dikirim!</h3>
        <p className="text-gray-600">
          Tim kami akan menghubungi Anda dalam 1 jam kerja
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nama Lengkap *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">No. Telepon *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="08123456789"
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@email.com"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="service_type">Jenis Layanan *</Label>
        <select
          id="service_type"
          name="service_type"
          value={formData.service_type}
          onChange={handleChange}
          className="w-full p-2 border rounded-md"
          required
        >
          <option value="instalasi">Instalasi AC Baru</option>
          <option value="maintenance">Maintenance/Service Rutin</option>
          <option value="perbaikan">Perbaikan/Service AC Rusak</option>
          <option value="konsultasi">Konsultasi</option>
        </select>
      </div>

      <div>
        <Label htmlFor="address">Alamat Lengkap *</Label>
        <Textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Jl. Contoh No. 123, Jakarta Selatan"
          rows={2}
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="preferred_date">Tanggal Kunjungan yang Diinginkan *</Label>
          <Input
            id="preferred_date"
            name="preferred_date"
            type="date"
            value={formData.preferred_date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Pilih tanggal untuk kunjungan teknisi</p>
        </div>
        <div>
          <Label htmlFor="preferred_time">Waktu yang Diinginkan *</Label>
          <select
            id="preferred_time"
            name="preferred_time"
            value={formData.preferred_time}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="pagi">Pagi (09:00 - 12:00)</option>
            <option value="siang">Siang (12:00 - 15:00)</option>
            <option value="sore">Sore (15:00 - 17:00)</option>
          </select>
        </div>
      </div>

      {variant === 'default' && (
        <div>
          <Label htmlFor="notes">Catatan Tambahan</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Deskripsikan masalah atau kebutuhan Anda..."
            rows={3}
          />
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Mengirim...
          </>
        ) : (
          'Kirim Request'
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Dengan mengirim form ini, Anda menyetujui untuk dihubungi oleh tim kami
      </p>
    </form>
  );
}
