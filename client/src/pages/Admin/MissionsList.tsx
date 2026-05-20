import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Briefcase, Building2, ChevronRight, Calendar, Banknote } from 'lucide-react';
import { useMissions } from '../../hooks/useMissions';
import { usePrestataires } from '../../hooks/usePrestataires';
import { formatDate } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
];

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  pending:     { badge: 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',     dot: 'bg-amber-500' },
  in_progress: { badge: 'bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',          dot: 'bg-blue-500' },
  completed:   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
  cancelled:   { badge: 'bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',                dot: 'bg-red-500' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export function MissionsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [prestataireId, setPrestataireId] = useState('all');

  const { data: prestataires } = usePrestataires();
  const { data: missions, isLoading } = useMissions({
    search,
    status,
    prestataire_id: prestataireId,
  });

  const isAdmin = window.location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/missions' : '/missions';

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold tracking-tight text-gradient-soft flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-brand-600 flex items-center justify-center shadow-glow-sm">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            Missions
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 ml-12 dark:text-gray-400">
            Gérer les missions projet et leur prestataire assigné
          </p>
        </div>
        <button
          id="add-mission-btn"
          onClick={() => navigate(`${basePath}/new`)}
          className="btn-primary whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nouvelle mission
        </button>
      </div>

      <div className="elevated-card p-5 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="search-missions"
              type="text"
              placeholder="Rechercher une mission..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input w-auto cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={prestataireId}
            onChange={(e) => setPrestataireId(e.target.value)}
            className="input w-auto cursor-pointer"
          >
            <option value="all">Tous prestataires</option>
            {prestataires?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200/60 dark:border-gray-800/50">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3.5">Mission</th>
                <th className="px-4 py-3.5">Prestataire</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5">Période</th>
                <th className="px-4 py-3.5 text-right">Budget</th>
                <th className="px-4 py-3.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                      Chargement...
                    </div>
                  </td>
                </tr>
              ) : !missions?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-0">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Briefcase className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">Aucune mission trouvée</p>
                      <p className="text-gray-500 text-sm dark:text-gray-400">
                        Créez votre première mission pour commencer le suivi de projet.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                missions.map((m, idx) => {
                  const sty = STATUS_STYLES[m.status];
                  return (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`${basePath}/${m.id}`)}
                      className="table-row group animate-fade-in"
                      style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                          {m.name}
                        </div>
                        {m.description && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-md dark:text-gray-400">
                            {m.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 text-gray-700 text-sm dark:text-gray-200">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {m.prestataire?.name || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${sty.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} />
                          {STATUS_LABELS[m.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {m.start_date ? formatDate(m.start_date) : '—'}
                          {m.end_date && <span className="text-gray-300 dark:text-gray-600">→</span>}
                          {m.end_date && formatDate(m.end_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {m.budget != null ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                            {m.budget.toLocaleString()} €
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all dark:text-gray-600" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
