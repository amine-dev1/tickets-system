import { useState } from 'react';
import { Search, X, FileDown } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import { useTickets } from '../../hooks/useTickets';
import { TicketCard } from './TicketCard';
import { ExportPdfModal } from './ExportPdfModal';
import { Dropdown } from '../ui/Dropdown';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

import { isAdminRole } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { usePrestataires } from '../../hooks/usePrestataires';
import { useCompanies } from '../../hooks/useCompanies';

export function TicketList() {
  const { user } = useAuthStore();
  const { data: prestataires } = usePrestataires();
  const { data: companies } = useCompanies();
  const { filters, setFilter, resetFilters } = useTicketStore();
  const { data: tickets, isLoading, isError } = useTickets();
  const [showExport, setShowExport] = useState(false);

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.prestataire_id !== 'all' ||
    filters.company_id !== 'all' ||
    !!filters.search;

  const isAdmin = isAdminRole(user?.role);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="ticket-search"
            type="text"
            placeholder="Search tickets…"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="input pl-9"
          />
        </div>
        <Dropdown
          id="status-filter"
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          options={STATUS_OPTIONS}
          className="w-auto"
        />
        <Dropdown
          id="priority-filter"
          value={filters.priority}
          onChange={(value) => setFilter('priority', value)}
          options={PRIORITY_OPTIONS}
          className="w-auto"
        />
        {isAdmin && (
          <Dropdown
            id="company-filter"
            value={filters.company_id}
            onChange={(value) => setFilter('company_id', value)}
            options={[
              { value: 'all', label: 'All Companies' },
              ...(companies?.map((c) => ({ value: c.id, label: c.name })) || []),
            ]}
            className="w-auto"
          />
        )}
        <Dropdown
          id="prestataire-filter"
          value={filters.prestataire_id}
          onChange={(value) => setFilter('prestataire_id', value)}
          options={[
            { value: 'all', label: 'All Prestataires' },
            ...(prestataires?.map((p) => ({ value: p.id, label: p.name })) || []),
          ]}
          className="w-auto"
        />
        {hasActiveFilters && (
          <button onClick={resetFilters} className="btn-ghost text-xs">
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
        <button
          id="export-pdf-btn"
          onClick={() => setShowExport(true)}
          className="btn-secondary text-xs ml-auto"
        >
          <FileDown className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>

      {showExport && <ExportPdfModal onClose={() => setShowExport(false)} />}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center text-red-400">
          Failed to load tickets. Check your connection.
        </div>
      ) : !tickets?.length ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500">No tickets found.</p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn-secondary mt-3 mx-auto">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}
