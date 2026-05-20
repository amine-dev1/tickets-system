import { api } from './axios';
import type { TicketComment } from '../types';

export const commentsApi = {
  getByTicket: (ticketId: string) =>
    api.get<TicketComment[]>(`/tickets/${ticketId}/comments`).then((r) => r.data),

  create: (ticketId: string, content: string, isInternal = false) =>
    api
      .post<TicketComment>(`/tickets/${ticketId}/comments`, {
        content,
        is_internal: isInternal,
      })
      .then((r) => r.data),

  delete: (commentId: string) =>
    api.delete(`/comments/${commentId}`).then((r) => r.data),
};
