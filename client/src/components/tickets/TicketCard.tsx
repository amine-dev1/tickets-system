import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, ChevronRight, Trash2 } from 'lucide-react';
import type { Ticket, TicketStatus } from '../../types';
import { isAdminRole } from '../../types';
import { StatusBadge, PriorityBadge } from './TicketBadge';
import { StatusSelect } from './StatusSelect';
import { formatRelative, CATEGORY_LABELS } from '../../lib/utils';
import { useUpdateTicket, useDeleteTicket } from '../../hooks/useTickets';
import { useAuthStore } from '../../store/authStore';
import { ConfirmModal } from '../ui/ConfirmModal';

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const navigate = useNavigate();
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const [showDelete, setShowDelete] = useState(false);

  const handleStatusChange = (status: TicketStatus) => {
    updateTicket.mutate({ id: ticket.id, dto: { status } });
  };

  const handleDelete = async () => {
    await deleteTicket.mutateAsync(ticket.id);
    setShowDelete(false);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/tickets/${ticket.id}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/tickets/${ticket.id}`)}
        className="relative glass-card p-5 cursor-pointer animate-fade-in group overflow-hidden
                   hover:shadow-soft-lg hover:border-gray-300 hover:-translate-y-0.5
                   dark:hover:border-gray-700 dark:hover:bg-gray-900/80
                   focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:outline-none"
      >
        {/* Hover accent stripe */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-500 via-brand-400 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.category && (
                <span className="badge bg-gray-100 text-gray-600 border border-gray-200/70 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700/60">
                  {CATEGORY_LABELS[ticket.category]}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-brand-600 transition-colors truncate dark:text-gray-100 dark:group-hover:text-brand-300">
              {ticket.title}
            </h3>
            <p className="text-gray-500 text-xs mt-1.5 line-clamp-2 dark:text-gray-400">
              {ticket.description}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDelete(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                title="Supprimer le ticket"
              >
                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-500" />
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all dark:text-gray-600" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {formatRelative(ticket.created_at)}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments</span>
            </div>
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <StatusSelect
                value={ticket.status}
                onChange={handleStatusChange}
                loading={updateTicket.isPending}
                placement="top-right"
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Supprimer ce ticket ?"
        description={`Le ticket « ${ticket.title} » et toutes ses données (commentaires, pièces jointes, historique) seront définitivement supprimés. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        loading={deleteTicket.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
