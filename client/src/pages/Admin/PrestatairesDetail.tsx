import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Trash2,
  CheckCircle, XCircle, Ticket as TicketIcon, Loader2,
} from 'lucide-react';
import { usePrestataire, useDeletePrestataire } from '../../hooks/usePrestataires';
import { TicketCard } from '../../components/tickets/TicketCard';
import { formatDateTime } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../../api/tickets';

export function PrestatairesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: prestataire, isLoading: loadingPrestataire } = usePrestataire(id);
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets', { prestataire_id: id }],
    queryFn: () => ticketsApi.getAll({ prestataire_id: id! }),
    enabled: !!id,
  });
  const deletePrestataire = useDeletePrestataire();
  const [showConfirm, setShowConfirm] = useState(false);

  const isAdmin = window.location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/prestataires' : '/prestataires';

  const handleDelete = async () => {
    try {
      await deletePrestataire.mutateAsync(id!);
      navigate(basePath);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Impossible de supprimer ce prestataire');
    }
  };

  if (loadingPrestataire) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!prestataire) {
    return <div className="p-8 text-center text-gray-400">Prestataire introuvable.</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button id="back-btn" onClick={() => navigate(basePath)} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-500" />
            {prestataire.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="edit-btn"
            onClick={() => navigate(`${basePath}/${id}/edit`)}
            className="btn-secondary"
          >
            <Edit className="w-4 h-4" /> Modifier
          </button>
          <button
            id="deactivate-btn"
            onClick={() => setShowConfirm(true)}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4" /> Désactiver
          </button>
        </div>
      </div>

      {/* Deactivation confirmation */}
      {showConfirm && (
        <div className="glass-card p-4 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 flex items-center justify-between gap-4">
          <p className="text-sm text-red-700 dark:text-red-300">
            Êtes-vous sûr de vouloir désactiver ce prestataire ? Il ne pourra plus se voir assigner de nouveaux tickets.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowConfirm(false)} className="btn-ghost text-xs">
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deletePrestataire.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700 text-xs"
              id="confirm-deactivate-btn"
            >
              {deletePrestataire.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
                Informations
              </h3>
              {prestataire.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                  <CheckCircle className="w-3 h-3" /> Actif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-medium dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                  <XCircle className="w-3 h-3" /> Inactif
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {prestataire.contact_email && (
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">E-mail</p>
                    <a href={`mailto:${prestataire.contact_email}`}
                       className="text-gray-700 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                      {prestataire.contact_email}
                    </a>
                  </div>
                </div>
              )}
              {prestataire.contact_phone && (
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
                    <p className="text-gray-700 dark:text-gray-200">{prestataire.contact_phone}</p>
                  </div>
                </div>
              )}
              {prestataire.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Adresse</p>
                    <p className="text-gray-700 dark:text-gray-200">{prestataire.address}</p>
                  </div>
                </div>
              )}
            </div>

            {prestataire.notes && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/60">
                <p className="text-xs text-gray-400 mb-1.5">Notes internes</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {prestataire.notes}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800/60 text-xs text-gray-400">
              Ajouté le {formatDateTime(prestataire.created_at)}
            </div>
          </div>
        </div>

        {/* Tickets column */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-gray-400" />
              Tickets du prestataire
            </h2>
          </div>

          {loadingTickets ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : !tickets?.length ? (
            <div className="glass-card p-12 text-center text-gray-400">
              Ce prestataire n'a aucun ticket.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
