import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bastService } from '../services/bastService';
import type { CreateBASTDto, ApproveBASTDto, RejectBASTDto } from '../types/bast.types';

export function useBAST(serviceOrderId: string) {
  return useQuery({
    queryKey: ['bast', serviceOrderId],
    queryFn: () => bastService.getBASTByOrderId(serviceOrderId),
    enabled: !!serviceOrderId,
  });
}

export function useCreateBAST() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (dto: CreateBASTDto) => bastService.createBAST(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bast', data.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useApproveBAST() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveBASTDto }) =>
      bastService.approveBAST(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bast', data.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRejectBAST() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectBASTDto }) =>
      bastService.rejectBAST(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bast', data.serviceOrderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
