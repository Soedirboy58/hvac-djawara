export interface Material {
  name: string;
  qty: number;
  unit: string;
}

export interface SPKReport {
  id: string;
  serviceOrderId: string;
  startTime?: Date;
  endTime?: Date;
  workDescription?: string;
  findings?: string;
  actionsTaken?: string;
  materialsUsed?: Material[];
  conditionBefore?: string;
  conditionAfter?: string;
  recommendations?: string;
  completedBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Documentation {
  id: string;
  serviceOrderId: string;
  spkReportId?: string;
  fileType: 'photo' | 'video' | 'document';
  fileUrl: string;
  fileName?: string;
  description?: string;
  category?: 'before' | 'during' | 'after' | 'equipment' | 'problem';
  uploadedBy?: string;
  uploadedAt: Date;
}

export interface CreateSPKDto {
  serviceOrderId: string;
  startTime?: Date;
  endTime?: Date;
  workDescription?: string;
  findings?: string;
  actionsTaken?: string;
  materialsUsed?: Material[];
  conditionBefore?: string;
  conditionAfter?: string;
  recommendations?: string;
}

export interface UpdateSPKDto extends Partial<CreateSPKDto> {
  completedAt?: Date;
}

export interface UploadDocumentationDto {
  serviceOrderId: string;
  spkReportId?: string;
  fileType: 'photo' | 'video' | 'document';
  file: File;
  description?: string;
  category?: 'before' | 'during' | 'after' | 'equipment' | 'problem';
}
