import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, Trash2, CheckCircle, XCircle, Ticket as TicketIcon, Loader2 } from 'lucide-react';
import { useClient, useDeleteClient } from '../../hooks/useClients';
import { useTickets } from '../../hooks/useTickets';
import { TicketCard } from '../../components/tickets/TicketCard';
import { formatDateTime } from '../../lib/utils';

import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../../api/tickets';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading: loadingClient } = useClient(id);
  
  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets', { client_id: id }],
    queryFn: () => ticketsApi.getAll({ client_id: id! }),
    enabled: !!id,
  });

  const deleteClient = useDeleteClient();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(id!);
      navigate('/admin/clients');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete client');
    }
  };

  if (loadingClient) {
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-gray-500">Client not found.</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/clients')} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            {client.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/admin/clients/${id}/edit`)} className="btn-secondary">
            <Edit className="w-4 h-4 mr-2" /> Edit
          </button>
          <button onClick={() => setShowConfirm(true)} className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-950/30 hover:border-red-900/50">
            <Trash2 className="w-4 h-4 mr-2" /> Deactivate
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="glass-card p-4 bg-red-950/20 border-red-900/50 flex items-center justify-between">
          <p className="text-sm text-red-200">Are you sure you want to deactivate this client? They will no longer be able to create new tickets.</p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(false)} className="btn-ghost text-xs">Cancel</button>
            <button onClick={handleDelete} disabled={deleteClient.isPending} className="btn-primary bg-red-600 hover:bg-red-700 text-xs">
              Confirm
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-300">Client Info</h3>
              {client.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle className="w-3 h-3" /> Active</span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium"><XCircle className="w-3 h-3" /> Inactive</span>
              )}
            </div>
            
            <div className="space-y-3 pt-2">
              {client.company && (
                <div className="flex items-start gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs">Company</p>
                    <p className="text-gray-200">{client.company}</p>
                  </div>
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs">Email</p>
                    <p className="text-gray-200"><a href={`mailto:${client.contact_email}`} className="hover:text-brand-400">{client.contact_email}</a></p>
                  </div>
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-start gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs">Phone</p>
                    <p className="text-gray-200">{client.contact_phone}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-400 text-xs">Address</p>
                    <p className="text-gray-200">{client.address}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800/60">
              <p className="text-gray-400 text-xs mb-1">Internal Notes</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{client.notes || 'No notes added.'}</p>
            </div>
            
            <div className="pt-4 border-t border-gray-800/60 text-xs text-gray-500">
              Added {formatDateTime(client.created_at)}
            </div>
          </div>
        </div>

        {/* Tickets Column */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-gray-400" />
              Client Tickets
            </h2>
          </div>

          {loadingTickets ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
          ) : !tickets?.length ? (
            <div className="glass-card p-12 text-center text-gray-500">
              This client has no tickets.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
