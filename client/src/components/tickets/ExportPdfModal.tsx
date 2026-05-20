import { useState, useMemo } from 'react';
import { X, FileDown, Loader2, Calendar, Building2, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTickets } from '../../hooks/useTickets';
import { usePrestataires } from '../../hooks/usePrestataires';
import { exportTicketsPdf } from '../../lib/exportPdf';

interface ExportPdfModalProps {
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function ExportPdfModal({ onClose }: ExportPdfModalProps) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [month, setMonth] = useState(currentMonth);
  const [prestataireId, setPrestataireId] = useState('all');
  const [status, setStatus] = useState('all');
  const [exporting, setExporting] = useState(false);

  const { data: prestataires } = usePrestataires();
  const { data: allTickets } = useTickets();

  const filtered = useMemo(() => {
    if (!allTickets) return [];
    return allTickets.filter((t) => {
      const ticketMonth = t.created_at.slice(0, 7);
      if (month && ticketMonth !== month) return false;
      if (prestataireId !== 'all' && t.prestataire_id !== prestataireId) return false;
      if (status !== 'all' && t.status !== status) return false;
      return true;
    });
  }, [allTickets, month, prestataireId, status]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const monthLabel = month ? format(parseISO(`${month}-01`), 'MMMM yyyy') : undefined;
      const prestataireLabel = prestataireId === 'all'
        ? 'All'
        : prestataires?.find((p) => p.id === prestataireId)?.name ?? 'All';
      const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'All';

      exportTicketsPdf(filtered, { month: monthLabel, prestataireLabel, statusLabel });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md glass-card p-6 space-y-5 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-500/15 flex items-center justify-center">
              <FileDown className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Export Tickets PDF</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Apply filters then generate</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              Prestataire
            </label>
            <select
              value={prestataireId}
              onChange={(e) => setPrestataireId(e.target.value)}
              className="input"
            >
              <option value="all">All Prestataires</option>
              {prestataires?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview count */}
        <div className="px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Tickets matching filters</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{filtered.length}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="btn-primary"
            id="export-pdf-confirm"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
