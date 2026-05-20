import { api } from './axios';
import type { Ticket, CreateTicketDTO, UpdateTicketDTO, AdminStats } from '../types';

export const ticketsApi = {
  getAll: (params?: Record<string, string>) =>
    api.get<Ticket[]>('/tickets', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<Ticket>(`/tickets/${id}`).then((r) => r.data),

  create: (dto: CreateTicketDTO) =>
    api.post<Ticket>('/tickets', dto).then((r) => r.data),

  update: (id: string, dto: UpdateTicketDTO) =>
    api.patch<Ticket>(`/tickets/${id}`, dto).then((r) => r.data),

  assign: (id: string, userId: string) =>
    api.patch<Ticket>(`/tickets/${id}/assign`, { assigned_to: userId }).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/tickets/${id}`).then((r) => r.data),

  getStats: () =>
    api.get<AdminStats>('/admin/stats').then((r) => r.data),
};
