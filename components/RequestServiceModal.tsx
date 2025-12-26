'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RequestServiceForm } from './RequestServiceForm';

interface RequestServiceModalProps {
  triggerVariant?: 'default' | 'large';
  triggerSize?: 'default' | 'sm' | 'lg';
  triggerClassName?: string;
}

export function RequestServiceModal({ triggerVariant = 'default', triggerSize = 'lg', triggerClassName }: RequestServiceModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === 'large' ? (
          <Button size="lg" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-blue-50">
            Request Service Sekarang
          </Button>
        ) : (
          <Button size={triggerSize} className={triggerClassName}>
            Request Service
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Request Quote Gratis</DialogTitle>
          <DialogDescription>
            Isi form di bawah dan tim kami akan menghubungi Anda dalam 1 jam kerja
          </DialogDescription>
        </DialogHeader>
        <RequestServiceForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
