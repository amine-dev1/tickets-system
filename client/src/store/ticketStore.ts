import { create } from 'zustand';
import type { Ticket, TicketStatus, TicketPriority } from '../types';

interface TicketFilters {
  status: TicketStatus | 'all';
  priority: TicketPriority | 'all';
  search: string;
  prestataire_id: string | 'all';
  company_id: string | 'all';
}

interface TicketState {
  filters: TicketFilters;
  selectedTicketId: string | null;
  setFilter: (key: keyof TicketFilters, value: string) => void;
  setSelectedTicket: (id: string | null) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: TicketFilters = {
  status: 'all',
  priority: 'all',
  search: '',
  prestataire_id: 'all',
  company_id: 'all',
};

export const useTicketStore = create<TicketState>((set) => ({
  filters: DEFAULT_FILTERS,
  selectedTicketId: null,
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setSelectedTicket: (id) => set({ selectedTicketId: id }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
