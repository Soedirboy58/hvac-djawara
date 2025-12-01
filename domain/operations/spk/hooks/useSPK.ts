import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spkService } from '../services/spkService';
import type { CreateSPKDto, UpdateSPKDto, UploadDocumentationDto } from '../types/spk.types';

export function useSPK(serviceOrderId: string) {
  return useQuery({
    queryKey: ['spk', serviceOrderId],
    queryFn: () => spkService.getSPKByOrderId(serviceOrderId),
    enabled: !!serviceOrderId,
  });
}

export function useCreateSPK() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (dto: CreateSPKDto) => spkService.createSPK(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spk', data.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateSPK() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSPKDto }) => 
      spkService.updateSPK(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['spk', data.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDocumentation(serviceOrderId: string) {
  return useQuery({
    queryKey: ['documentation', serviceOrderId],
    queryFn: () => spkService.getDocumentation(serviceOrderId),
    enabled: !!serviceOrderId,
  });
}

export function useUploadDocumentation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (dto: UploadDocumentationDto) => spkService.uploadDocumentation(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documentation', data.serviceOrderId] });
    },
  });
}

export function useDeleteDocumentation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, fileUrl, serviceOrderId }: { id: string; fileUrl: string; serviceOrderId: string }) => 
      spkService.deleteDocumentation(id, fileUrl),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documentation', variables.serviceOrderId] });
    },
  });
}
