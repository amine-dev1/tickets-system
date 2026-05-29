import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Trash2,
  CheckCircle, XCircle, Ticket as TicketIcon, Loader2,
  CalendarDays, Tag, AlertCircle,
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
      <div className="flex justify-center items-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!prestataire) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-400 gap-3">
        <Building2 className="w-10 h-10 opacity-30" />
        <p>Prestataire introuvable.</p>
      </div>
    );
  }

  const openTickets = tickets?.filter(t => t.status === 'open').length ?? 0;
  const totalTickets = tickets?.length ?? 0;
  const initials = prestataire.name
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  return (
    <div className="animate-fade-in space-y-6">

      {/* Back nav */}
      <button onClick={() => navigate(basePath)} className="btn-ghost px-2 py-1.5 text-xs">
        <ArrowLeft className="w-3.5 h-3.5" /> Retour aux prestataires
      </button>

      {/* Hero card */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 pt-5 pb-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500
                            flex items-center justify-center text-white text-xl font-bold
                            shadow-soft-md flex-shrink-0">
              {initials || <Building2 className="w-8 h-8" />}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`${basePath}/${id}/edit`)}
                className="btn-secondary text-xs px-3 py-2"
              >
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="btn-danger text-xs px-3 py-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Désactiver
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{prestataire.name}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {prestataire.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                    <CheckCircle className="w-3.5 h-3.5" /> Actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-medium dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                    <XCircle className="w-3.5 h-3.5" /> Inactif
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Depuis le {formatDateTime(prestataire.created_at)}
                </span>
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTickets}</p>
                <p className="text-xs text-gray-400">Tickets</p>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{openTickets}</p>
                <p className="text-xs text-gray-400">Ouverts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deactivation confirmation */}
      {showConfirm && (
        <div className="glass-card p-4 border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-900/40 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Êtes-vous sûr de vouloir désactiver <strong>{prestataire.name}</strong> ? Il ne pourra plus se voir assigner de nouveaux tickets.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowConfirm(false)} className="btn-ghost text-xs py-1.5">
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deletePrestataire.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700 from-red-600 to-red-700 text-xs py-1.5 shadow-red-600/25"
            >
              {deletePrestataire.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: contact info + notes */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Contact
            </h3>

            <div className="space-y-3">
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                label="E-mail"
                value={
                  prestataire.contact_email
                    ? <a href={`mailto:${prestataire.contact_email}`}
                         className="text-brand-600 dark:text-brand-400 hover:underline truncate">
                        {prestataire.contact_email}
                      </a>
                    : null
                }
              />
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                label="Téléphone"
                value={prestataire.contact_phone ?? null}
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Adresse"
                value={prestataire.address ?? null}
              />
            </div>

            {prestataire.notes && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes internes</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
                  {prestataire.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: tickets */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-gray-400" />
              Tickets assignés
            </h2>
            {!loadingTickets && totalTickets > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 text-xs font-semibold dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20">
                {totalTickets}
              </span>
            )}
          </div>

          {loadingTickets ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            </div>
          ) : !tickets?.length ? (
            <div className="glass-card p-12 text-center space-y-3">
              <TicketIcon className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto" />
              <p className="text-sm text-gray-400">Aucun ticket assigné à ce prestataire.</p>
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        {value ? (
          <div className="text-sm text-gray-700 dark:text-gray-200">{value}</div>
        ) : (
          <p className="text-sm text-gray-300 dark:text-gray-600 italic">Non renseigné</p>
        )}
      </div>
    </div>
  );
}
