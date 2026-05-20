import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPrestataires,
  getPrestataire,
  createPrestataire,
  updatePrestataire,
  deletePrestataire,
} from '../api/prestataires';
import type { Prestataire } from '../types';

export function usePrestataires(search?: string, is_active?: boolean, company_id?: string) {
  return useQuery({
    queryKey: ['prestataires', search, is_active, company_id],
    queryFn: () => listPrestataires(search, is_active, company_id),
  });
}

export function usePrestataire(id?: string) {
  return useQuery({
    queryKey: ['prestataires', id],
    queryFn: () => getPrestataire(id!),
    enabled: !!id,
  });
}

export function useCreatePrestataire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPrestataire,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestataires'] });
    },
  });
}

export function useUpdatePrestataire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Prestataire> }) =>
      updatePrestataire(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['prestataires'] });
      queryClient.invalidateQueries({ queryKey: ['prestataires', id] });
    },
  });
}

export function useDeletePrestataire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePrestataire,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestataires'] });
    },
  });
}
