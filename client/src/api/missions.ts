import { api } from './axios';
import type { Mission } from '../types';

export interface MissionFilters {
  search?: string;
  status?: string;
  prestataire_id?: string;
  company_id?: string;
}

export const listMissions = async (filters: MissionFilters = {}): Promise<Mission[]> => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.prestataire_id && filters.prestataire_id !== 'all') params.append('prestataire_id', filters.prestataire_id);
  if (filters.company_id && filters.company_id !== 'all') params.append('company_id', filters.company_id);

  const { data } = await api.get('/missions', { params });
  return data;
};

export const getMission = async (id: string): Promise<Mission> => {
  const { data } = await api.get(`/missions/${id}`);
  return data;
};

export const createMission = async (mission: Partial<Mission>): Promise<Mission> => {
  const { data } = await api.post('/missions', mission);
  return data;
};

export const updateMission = async (id: string, updates: Partial<Mission>): Promise<Mission> => {
  const { data } = await api.patch(`/missions/${id}`, updates);
  return data;
};

export const deleteMission = async (id: string): Promise<void> => {
  await api.delete(`/missions/${id}`);
};
