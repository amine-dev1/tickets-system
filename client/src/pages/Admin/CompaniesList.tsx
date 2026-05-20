import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Ticket, Users, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { useCompanies } from '../../hooks/useCompanies';

export function CompaniesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: companies, isLoading } = useCompanies(search);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            Entreprises
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gérer les entreprises (locataires) de la plateforme</p>
        </div>
        <button
          id="add-company-btn"
          onClick={() => navigate('/admin/companies/new')}
          className="btn-primary whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une entreprise
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            id="search-companies"
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Contact Email</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-center">Utilisateurs</th>
                <th className="px-4 py-3 text-center">Prestataires</th>
                <th className="px-4 py-3 text-center">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Chargement des entreprises...
                  </td>
                </tr>
              ) : !companies?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucune entreprise trouvée.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => navigate(`/admin/companies/${company.id}`)}
                    className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{company.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Slug: {company.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {company.contact_email || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {company.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 font-medium">
                      {company.user_count || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 font-medium">
                      {company.prestataire_count || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 font-medium">
                      {company.ticket_count || 0}
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
