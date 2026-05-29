import { api } from './axios';
import type { TicketAttachment } from '../types';

export const attachmentsApi = {
  getByTicket: (ticketId: string) =>
    api.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments`).then((r) => r.data),

  upload: (ticketId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api
      .post<TicketAttachment[]>(`/tickets/${ticketId}/attachments`, formData, {
        timeout: 120000,
      })
      .then((r) => r.data);
  },

  delete: (attachmentId: string) =>
    api.delete(`/attachments/${attachmentId}`).then((r) => r.data),
};
