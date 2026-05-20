import { api } from './axios';
import type { Company, Profile } from '../types';

export const listCompanies = async (search?: string): Promise<Company[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);

  const { data } = await api.get('/companies', { params });
  return data;
};

export const getCompany = async (id: string): Promise<Company> => {
  const { data } = await api.get(`/companies/${id}`);
  return data;
};

export const createCompany = async (company: Partial<Company>): Promise<Company> => {
  const { data } = await api.post('/companies', company);
  return data;
};

export const updateCompany = async (id: string, updates: Partial<Company>): Promise<Company> => {
  const { data } = await api.patch(`/companies/${id}`, updates);
  return data;
};

export const deleteCompany = async (id: string): Promise<void> => {
  await api.delete(`/companies/${id}`);
};

export const getCompanyUsers = async (id: string): Promise<Profile[]> => {
  const { data } = await api.get(`/companies/${id}/users`);
  return data;
};

export const addCompanyUser = async (
  id: string,
  user: { email: string; full_name: string; password?: string }
): Promise<Profile> => {
  const { data } = await api.post(`/companies/${id}/users`, user);
  return data;
};

export const removeCompanyUser = async (id: string, userId: string): Promise<void> => {
  await api.delete(`/companies/${id}/users/${userId}`);
};
