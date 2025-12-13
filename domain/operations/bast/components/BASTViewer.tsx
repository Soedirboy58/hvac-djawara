'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FileText, CheckCircle, XCircle, Download, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ServiceOrder } from '@/domain/operations/orders/types/order.types';
import { SPKReport } from '@/domain/operations/spk/types/spk.types';
import { useBAST, useCreateBAST, useApproveBAST, useRejectBAST } from '../hooks/useBAST';
import { format } from 'date-fns';

interface BASTViewerProps {
  order: ServiceOrder;
  spk?: SPKReport | null;
}

export function BASTViewer({ order, spk }: BASTViewerProps) {
  const { data: bast, isLoading } = useBAST(order.id);
  const { mutate: createBAST, isPending: isCreating } = useCreateBAST();
  const { mutate: approveBAST, isPending: isApproving } = useApproveBAST();
  const { mutate: rejectBAST, isPending: isRejecting } = useRejectBAST();
  
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const clientSigRef = useRef<SignatureCanvas>(null);
  const techSigRef = useRef<SignatureCanvas>(null);

  const handleGenerateBAST = () => {
    createBAST({
      serviceOrderId: order.id,
      spkReportId: spk?.id,
      clientName: order.client?.name || '',
      technicianName: 'Teknisi', // TODO: Get from assigned technician
    });
  };

  const handleApprove = () => {
    if (clientSigRef.current && techSigRef.current && !clientSigRef.current.isEmpty() && !techSigRef.current.isEmpty() && bast) {
      const clientSignature = clientSigRef.current.toDataURL();
      const technicianSignature = techSigRef.current.toDataURL();
      
      approveBAST({
        id: bast.id,
        data: { clientSignature, technicianSignature },
      }, {
        onSuccess: () => setShowApprovalModal(false),
      });
    }
  };

  const handleReject = () => {
    if (bast && rejectionReason.trim()) {
      rejectBAST({
        id: bast.id,
        data: { rejectionReason },
      }, {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectionReason('');
        },
      });
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading BAST...</div>;
  }

  if (!spk) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>SPK belum dibuat. Silakan isi SPK terlebih dahulu.</p>
        </div>
      </Card>
    );
  }

  if (!bast) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-blue-600" />
          <h3 className="font-semibold text-lg mb-2">Generate BAST</h3>
          <p className="text-gray-600 mb-4">
            Pekerjaan sudah selesai. Generate BAST untuk persetujuan client.
          </p>
          <Button onClick={handleGenerateBAST} disabled={isCreating}>
            <FileText className="h-4 w-4 mr-2" />
            Generate BAST
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* BAST Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Berita Acara Serah Terima</h2>
            <p className="text-gray-600 mt-1">No. {bast.bastNumber}</p>
          </div>
          <Badge
            className={
              bast.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : bast.status === 'rejected'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }
          >
            {bast.status === 'approved' && 'Disetujui'}
            {bast.status === 'rejected' && 'Ditolak'}
            {bast.status === 'pending' && 'Menunggu Persetujuan'}
          </Badge>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label className="text-gray-600">Order Number</Label>
            <p className="font-semibold">{order.orderNumber}</p>
          </div>
          <div>
            <Label className="text-gray-600">Tanggal</Label>
            <p className="font-semibold">
              {format(new Date(bast.createdAt), 'dd MMMM yyyy')}
            </p>
          </div>
          <div>
            <Label className="text-gray-600">Client</Label>
            <p className="font-semibold">{bast.clientName}</p>
          </div>
          <div>
            <Label className="text-gray-600">Teknisi</Label>
            <p className="font-semibold">{bast.technicianName}</p>
          </div>
        </div>

        {/* Service Details */}
        <div className="border-t pt-4 mb-6">
          <h3 className="font-semibold mb-3">Detail Pekerjaan</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-gray-600">Jenis Pekerjaan</Label>
              <p>{order.serviceTitle}</p>
            </div>
            <div>
              <Label className="text-gray-600">Lokasi</Label>
              <p>{order.locationAddress}</p>
            </div>
            {spk.workDescription && (
              <div>
                <Label className="text-gray-600">Deskripsi Pekerjaan</Label>
                <p>{spk.workDescription}</p>
              </div>
            )}
            {spk.findings && (
              <div>
                <Label className="text-gray-600">Temuan</Label>
                <p>{spk.findings}</p>
              </div>
            )}
            {spk.actionsTaken && (
              <div>
                <Label className="text-gray-600">Tindakan</Label>
                <p>{spk.actionsTaken}</p>
              </div>
            )}
            {spk.conditionAfter && (
              <div>
                <Label className="text-gray-600">Kondisi Akhir</Label>
                <p>{spk.conditionAfter}</p>
              </div>
            )}
            {spk.recommendations && (
              <div>
                <Label className="text-gray-600">Rekomendasi</Label>
                <p>{spk.recommendations}</p>
              </div>
            )}
          </div>
        </div>

        {/* Signatures */}
        {bast.status === 'approved' && (
          <div className="border-t pt-4 grid grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-600 mb-2 block">Tanda Tangan Client</Label>
              {bast.clientSignatureUrl && (
                <img
                  src={bast.clientSignatureUrl}
                  alt="Client Signature"
                  className="border rounded h-32 w-full object-contain bg-white"
                />
              )}
              <p className="text-sm mt-2">{bast.clientName}</p>
              <p className="text-xs text-gray-500">
                {bast.clientApprovedAt &&
                  format(new Date(bast.clientApprovedAt), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
            <div>
              <Label className="text-gray-600 mb-2 block">Tanda Tangan Teknisi</Label>
              {bast.technicianSignatureUrl && (
                <img
                  src={bast.technicianSignatureUrl}
                  alt="Technician Signature"
                  className="border rounded h-32 w-full object-contain bg-white"
                />
              )}
              <p className="text-sm mt-2">{bast.technicianName}</p>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {bast.status === 'rejected' && bast.rejectionReason && (
          <div className="border-t pt-4">
            <Label className="text-red-600 mb-2 block">Alasan Penolakan</Label>
            <p className="bg-red-50 border border-red-200 rounded p-3">
              {bast.rejectionReason}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {bast.status === 'pending' && (
          <div className="border-t pt-4 flex gap-3">
            <Button
              onClick={() => setShowApprovalModal(true)}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Setujui BAST
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectModal(true)}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Tolak BAST
            </Button>
          </div>
        )}
      </Card>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tanda Tangan Persetujuan BAST</DialogTitle>
            <DialogDescription>
              Kedua pihak (Client dan Teknisi) harus menandatangani BAST
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Tanda Tangan Client</Label>
              <div className="border rounded bg-white">
                <SignatureCanvas
                  ref={clientSigRef}
                  canvasProps={{
                    className: 'w-full h-40',
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => clientSigRef.current?.clear()}
                className="mt-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>

            <div>
              <Label className="mb-2 block">Tanda Tangan Teknisi</Label>
              <div className="border rounded bg-white">
                <SignatureCanvas
                  ref={techSigRef}
                  canvasProps={{
                    className: 'w-full h-40',
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => techSigRef.current?.clear()}
                className="mt-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
              disabled={isApproving}
            >
              Batal
            </Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? 'Menyimpan...' : 'Setujui BAST'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak BAST</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan BAST
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Alasan Penolakan</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Jelaskan mengapa BAST ditolak..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
              disabled={isRejecting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Menyimpan...' : 'Tolak BAST'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
