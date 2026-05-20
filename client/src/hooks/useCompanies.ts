import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyUsers,
  addCompanyUser,
  removeCompanyUser,
} from '../api/companies';
import type { Company } from '../types';

export function useCompanies(search?: string) {
  return useQuery({
    queryKey: ['companies', search],
    queryFn: () => listCompanies(search),
  });
}

export function useCompany(id?: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) =>
      updateCompany(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useCompanyUsers(id?: string) {
  return useQuery({
    queryKey: ['companies', id, 'users'],
    queryFn: () => getCompanyUsers(id!),
    enabled: !!id,
  });
}

export function useAddCompanyUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      user,
    }: {
      companyId: string;
      user: { email: string; full_name: string; password?: string };
    }) => addCompanyUser(companyId, user),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'users'] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useRemoveCompanyUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, userId }: { companyId: string; userId: string }) =>
      removeCompanyUser(companyId, userId),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'users'] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
