import { api } from './axios';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  company_id: string | null;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

export const notificationsApi = {
  list: (opts?: { unread?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.unread) params.set('unread', 'true');
    if (opts?.limit) params.set('limit', String(opts.limit));
    return api.get<Notification[]>(`/notifications?${params}`).then(r => r.data);
  },

  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then(r => r.data.count),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.patch('/notifications/read-all').then(r => r.data),

  remove: (id: string) =>
    api.delete(`/notifications/${id}`).then(r => r.data),

  clearAll: () =>
    api.delete('/notifications').then(r => r.data),
};
