import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Ticket, CheckCircle, XCircle } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { formatDateTime } from '../../lib/utils';

export function ClientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: clients, isLoading } = useClients(search);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            Clients
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage client organizations and contacts</p>
        </div>
        <button
          onClick={() => navigate('/admin/clients/new')}
          className="btn-primary whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search clients by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Loading clients...
                  </td>
                </tr>
              ) : !clients?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No clients found.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                    className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{client.name}</div>
                      {client.company && <div className="text-xs text-gray-500 mt-0.5">{client.company}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-300">{client.contact_email || '-'}</div>
                      {client.contact_phone && <div className="text-xs text-gray-500 mt-0.5">{client.contact_phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {client.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      <div className="flex items-center justify-end gap-1.5">
                        <Ticket className="w-3.5 h-3.5" />
                        {client.ticket_count || 0}
                      </div>
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
