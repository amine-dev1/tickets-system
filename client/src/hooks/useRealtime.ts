import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { isAdminRole } from '../types';

/** Subscribe to real-time ticket changes for the current user */
export function useRealtime() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const filter =
      isAdminRole(user.role)
        ? undefined
        : `client_id=eq.${user.id}`;

    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          ...(filter ? { filter } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_comments' },
        (payload: any) => {
          const ticketId = payload.new?.ticket_id || payload.old?.ticket_id;
          if (ticketId) {
            queryClient.invalidateQueries({ queryKey: ['comments', ticketId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
