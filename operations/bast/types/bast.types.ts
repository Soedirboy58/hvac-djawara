export interface BAST {
  id: string;
  serviceOrderId: string;
  spkReportId?: string;
  bastNumber: string;
  clientName: string;
  clientSignatureUrl?: string;
  clientApprovedAt?: Date;
  technicianName: string;
  technicianSignatureUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBASTDto {
  serviceOrderId: string;
  spkReportId?: string;
  clientName: string;
  technicianName: string;
}

export interface ApproveBASTDto {
  clientSignature: string; // Base64 encoded signature
  technicianSignature: string; // Base64 encoded signature
}

export interface RejectBASTDto {
  rejectionReason: string;
}
