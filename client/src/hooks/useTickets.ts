import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from '../api/tickets';
import { commentsApi } from '../api/comments';
import { useTicketStore } from '../store/ticketStore';
import type { CreateTicketDTO, UpdateTicketDTO } from '../types';

export function useTickets() {
  const { filters } = useTicketStore();
  const params: Record<string, string> = {};
  if (filters.status !== 'all') params.status = filters.status;
  if (filters.priority !== 'all') params.priority = filters.priority;
  if (filters.search) params.search = filters.search;
  if (filters.prestataire_id !== 'all') params.prestataire_id = filters.prestataire_id;
  if (filters.company_id !== 'all') params.company_id = filters.company_id;

  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsApi.getAll(params),
    staleTime: 30_000,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTicketDTO) => ticketsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTicketDTO }) =>
      ticketsApi.update(id, dto),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: ticketsApi.getStats,
    staleTime: 30_000,
  });
}

// Comments
export function useComments(ticketId: string) {
  return useQuery({
    queryKey: ['comments', ticketId],
    queryFn: () => commentsApi.getByTicket(ticketId),
    enabled: !!ticketId,
  });
}

export function useAddComment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, isInternal }: { content: string; isInternal?: boolean }) =>
      commentsApi.create(ticketId, content, isInternal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', ticketId] }),
  });
}
