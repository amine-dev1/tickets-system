import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Ticket, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { usePrestataires } from '../../hooks/usePrestataires';

export function PrestatairesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: prestataires, isLoading } = usePrestataires(search);

  const isAdmin = window.location.pathname.startsWith('/admin');
  const basePath = isAdmin ? '/admin/prestataires' : '/prestataires';

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold tracking-tight text-gradient-soft flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Prestataires
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 ml-12 dark:text-gray-400">Gérer les prestataires et leurs contacts</p>
        </div>
        <button
          id="add-prestataire-btn"
          onClick={() => navigate(`${basePath}/new`)}
          className="btn-primary whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Ajouter un prestataire
        </button>
      </div>

      <div className="elevated-card p-5 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
        {/* Search */}
        <div className="relative max-w-md mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="search-prestataires"
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200/60 dark:border-gray-800/50">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3.5">Prestataire</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5 text-right">Tickets</th>
                <th className="px-4 py-3.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-400">
                      <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                      Chargement des prestataires...
                    </div>
                  </td>
                </tr>
              ) : !prestataires?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-0">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <Building2 className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">Aucun prestataire trouvé</p>
                      <p className="text-gray-500 text-sm dark:text-gray-400">
                        Ajoutez votre premier prestataire pour commencer.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                prestataires.map((prestataire, idx) => (
                  <tr
                    key={prestataire.id}
                    onClick={() => navigate(`${basePath}/${prestataire.id}`)}
                    className="table-row group animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'backwards' }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-500/20 dark:to-brand-700/20 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-sm border border-brand-200/60 dark:border-brand-500/20">
                          {prestataire.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                          {prestataire.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-700 dark:text-gray-200 text-sm">
                        {prestataire.contact_email || <span className="text-gray-400">—</span>}
                      </div>
                      {prestataire.contact_phone && (
                        <div className="text-xs text-gray-400 mt-0.5">{prestataire.contact_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {prestataire.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold shadow-soft dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:shadow-none">
                          <span className="relative flex w-1.5 h-1.5">
                            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-semibold dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                          <XCircle className="w-3 h-3" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                        <Ticket className="w-3.5 h-3.5" />
                        {prestataire.ticket_count || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all dark:text-gray-600" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
