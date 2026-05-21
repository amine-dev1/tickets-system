import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

export function useClients(search = '') {
  return useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*').eq('role', 'client');
      if (search) {
        query = query.ilike('full_name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'client')
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  return useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .insert([{ ...data, role: 'client' }])
        .select()
        .single();
      if (error) throw error;
      return result as Profile;
    },
  });
}

export function useUpdateClient() {
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useDeleteClient() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    },
  });
}
