import { api } from './axios';
import type { Prestataire } from '../types';

export const listPrestataires = async (search?: string, is_active?: boolean, company_id?: string): Promise<Prestataire[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (is_active !== undefined) params.append('is_active', is_active.toString());
  if (company_id) params.append('company_id', company_id);

  const { data } = await api.get('/prestataires', { params });
  return data;
};

export const getPrestataire = async (id: string): Promise<Prestataire> => {
  const { data } = await api.get(`/prestataires/${id}`);
  return data;
};

export const createPrestataire = async (prestataire: Partial<Prestataire>): Promise<Prestataire> => {
  const { data } = await api.post('/prestataires', prestataire);
  return data;
};

export const updatePrestataire = async (id: string, updates: Partial<Prestataire>): Promise<Prestataire> => {
  const { data } = await api.patch(`/prestataires/${id}`, updates);
  return data;
};

export const deletePrestataire = async (id: string): Promise<void> => {
  await api.delete(`/prestataires/${id}`);
};
