import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Building2, Calendar, Edit, Trash2,
  Loader2, Wallet,
} from 'lucide-react';
import { useMission, useDeleteMission } from '../../hooks/useMissions';
import { formatDate, formatDateTime } from '../../lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  in_progress: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  cancelled: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export function MissionsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: mission, isLoading } = useMission(id);
  const deleteMission = useDeleteMission();
  const [showConfirm, setShowConfirm] = useState(false);

  const isAdmin = window.location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/missions' : '/missions';
  const prestaPath = isAdmin ? '/admin/prestataires' : '/prestataires';

  const handleDelete = async () => {
    try {
      await deleteMission.mutateAsync(id!);
      navigate(basePath);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Impossible de supprimer cette mission');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!mission) {
    return <div className="p-8 text-center text-gray-400">Mission introuvable.</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button id="back-btn" onClick={() => navigate(basePath)} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-brand-500" />
              {mission.name}
            </h1>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[mission.status]}`}>
                {STATUS_LABELS[mission.status]}
              </span>
            </div>
          </div>
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
            id="delete-btn"
            onClick={() => setShowConfirm(true)}
            className="btn-danger"
          >
            <Trash2 className="w-4 h-4" /> Supprimer
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="glass-card p-4 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 flex items-center justify-between gap-4">
          <p className="text-sm text-red-700 dark:text-red-300">
            Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowConfirm(false)} className="btn-ghost text-xs">
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMission.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700 text-xs"
              id="confirm-delete-btn"
            >
              {deleteMission.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
              Description
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {mission.description || <span className="text-gray-400 italic">Aucune description</span>}
            </p>
          </div>
        </div>

        {/* Side info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
              Détails
            </h3>

            {mission.prestataire && (
              <div
                onClick={() => navigate(`${prestaPath}/${mission.prestataire_id}`)}
                className="flex items-start gap-3 text-sm cursor-pointer group"
              >
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Prestataire</p>
                  <p className="text-gray-700 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {mission.prestataire.name}
                  </p>
                </div>
              </div>
            )}

            {mission.start_date && (
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date de début</p>
                  <p className="text-gray-700 dark:text-gray-200">{formatDate(mission.start_date)}</p>
                </div>
              </div>
            )}

            {mission.end_date && (
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date de fin</p>
                  <p className="text-gray-700 dark:text-gray-200">{formatDate(mission.end_date)}</p>
                </div>
              </div>
            )}

            {mission.budget != null && (
              <div className="flex items-start gap-3 text-sm">
                <Wallet className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Budget</p>
                  <p className="text-gray-700 dark:text-gray-200 font-semibold">
                    {mission.budget.toLocaleString()} €
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800/60 text-xs text-gray-400">
              Créée le {formatDateTime(mission.created_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
