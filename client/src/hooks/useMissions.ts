import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,
  type MissionFilters,
} from '../api/missions';
import type { Mission } from '../types';

export function useMissions(filters: MissionFilters = {}) {
  return useQuery({
    queryKey: ['missions', filters],
    queryFn: () => listMissions(filters),
  });
}

export function useMission(id?: string) {
  return useQuery({
    queryKey: ['missions', id],
    queryFn: () => getMission(id!),
    enabled: !!id,
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Mission> }) =>
      updateMission(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['missions', id] });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}
