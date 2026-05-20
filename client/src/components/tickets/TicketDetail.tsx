import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { useTicket, useUpdateTicket, useDeleteTicket } from '../../hooks/useTickets';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge, PriorityBadge } from './TicketBadge';
import { CommentList } from '../comments/CommentList';
import { CommentForm } from '../comments/CommentForm';
import { formatDateTime, CATEGORY_LABELS } from '../../lib/utils';
import type { TicketStatus, TicketPriority } from '../../types';
import { isAdminRole } from '../../types';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: ticket, isLoading } = useTicket(id!);
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isAdmin = isAdminRole(user?.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="glass-card p-8 text-center text-gray-400">
        Ticket not found.
      </div>
    );
  }

  const handleStatusChange = (status: TicketStatus) =>
    updateTicket.mutate({ id: ticket.id, dto: { status } });

  const handlePriorityChange = (priority: TicketPriority) =>
    updateTicket.mutate({ id: ticket.id, dto: { priority } });

  const handleDelete = async () => {
    await deleteTicket.mutateAsync(ticket.id);
    navigate('/admin/tickets');
  };

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-5" id="back-btn">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Ticket body */}
          <div className="glass-card p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.category && (
                <span className="badge bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/40">
                  {CATEGORY_LABELS[ticket.category]}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {ticket.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDateTime(ticket.created_at)}
              </span>
              {ticket.resolved_at && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                  ✓ Resolved {formatDateTime(ticket.resolved_at)}
                </span>
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Discussion */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Discussion</h3>
            <CommentList ticketId={ticket.id} />
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60">
              <CommentForm ticketId={ticket.id} isAdmin={isAdmin} />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Admin controls */}
          {isAdmin && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                Admin Controls
              </h3>
              <div>
                <label className="label text-xs">Status</label>
                <select
                  id="status-select"
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className="input text-sm"
                  disabled={updateTicket.isPending}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs">Priority</label>
                <select
                  id="priority-select"
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                  className="input text-sm"
                  disabled={updateTicket.isPending}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                {!showDeleteConfirm ? (
                  <button
                    id="delete-ticket-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn-danger w-full justify-center text-xs"
                  >
                    Delete Ticket
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-500 dark:text-red-400">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} className="btn-danger flex-1 justify-center text-xs">
                        {deleteTicket.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 justify-center text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
              Details
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Ticket ID</span>
                <span className="text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {ticket.id.slice(0, 8)}…
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700 dark:text-gray-300">{formatDateTime(ticket.created_at)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-gray-700 dark:text-gray-300">{formatDateTime(ticket.updated_at)}</span>
              </div>
              {ticket.prestataire && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Prestataire</span>
                  <span className="text-brand-600 dark:text-brand-400 font-medium">{ticket.prestataire.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
