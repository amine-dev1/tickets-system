import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Ticket as TicketIcon,
  Users as UsersIcon,
  UserPlus,
  Loader2,
  Wrench,
  UserMinus,
  Briefcase,
} from 'lucide-react';
import {
  useCompany,
  useDeleteCompany,
  useCompanyUsers,
  useAddCompanyUser,
  useRemoveCompanyUser,
} from '../../hooks/useCompanies';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '../../api/tickets';
import { usePrestataires } from '../../hooks/usePrestataires';
import { formatDateTime } from '../../lib/utils';

const addUserSchema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  full_name: z.string().min(1, 'Le nom complet est requis'),
  password: z.string().min(6, 'Le mot de passe doit faire au moins 6 caractères'),
});

type AddUserData = z.infer<typeof addUserSchema>;

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const { data: company, isLoading: loadingCompany } = useCompany(id);
  const { data: users, isLoading: loadingUsers } = useCompanyUsers(id);

  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets', { company_id: id }],
    queryFn: () => ticketsApi.getAll({ company_id: id! }),
    enabled: !!id,
  });

  const { data: prestataires, isLoading: loadingPrestataires } = usePrestataires(undefined, undefined, id);

  const deleteCompany = useDeleteCompany();
  const addUser = useAddCompanyUser();
  const removeUser = useRemoveCompanyUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserData>({
    resolver: zodResolver(addUserSchema),
  });

  const handleDelete = async () => {
    try {
      await deleteCompany.mutateAsync(id!);
      navigate('/admin/companies');
    } catch (err: any) {
      alert(err.response?.data?.error || "Impossible de supprimer l'entreprise");
    }
  };

  const handleAddUser = async (data: AddUserData) => {
    try {
      await addUser.mutateAsync({
        companyId: id!,
        user: {
          email: data.email,
          full_name: data.full_name,
          password: data.password,
        },
      });
      setShowAddUserModal(false);
      reset();
    } catch (err: any) {
      alert(err.response?.data?.error || "Impossible d'ajouter l'utilisateur");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (confirm("Êtes-vous sûr de vouloir retirer cet utilisateur de l'entreprise ?")) {
      try {
        await removeUser.mutateAsync({ companyId: id!, userId });
      } catch (err: any) {
        alert(err.response?.data?.error || "Impossible de retirer l'utilisateur");
      }
    }
  };

  if (loadingCompany) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!company) {
    return <div className="p-8 text-center text-gray-500">Entreprise introuvable.</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            id="back-btn"
            onClick={() => navigate('/admin/companies')}
            className="btn-ghost p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-400" />
            {company.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="edit-btn"
            onClick={() => navigate(`/admin/companies/${id}/edit`)}
            className="btn-secondary"
          >
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </button>
          <button
            id="delete-btn"
            onClick={() => setShowConfirmDelete(true)}
            className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-950/30 hover:border-red-900/50"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
          </button>
        </div>
      </div>

      {/* Confirm Deletion */}
      {showConfirmDelete && (
        <div className="glass-card p-4 bg-red-950/20 border-red-900/50 flex items-center justify-between">
          <p className="text-sm text-red-200">
            Êtes-vous sûr de vouloir supprimer (soft delete) cette entreprise ? Ses utilisateurs ne pourront plus accéder à l'application.
          </p>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button onClick={() => setShowConfirmDelete(false)} className="btn-ghost text-xs">
              Annuler
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteCompany.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700 text-xs"
              id="confirm-delete-btn"
            >
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Aperçu & Ressources
        </button>
        <button
          id="users-tab"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Membres ({users?.length || 0})
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Details Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-300">Fiche Entreprise</h3>
                {company.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="text-sm">
                  <p className="text-gray-500 text-xs">Identifiant Slug</p>
                  <p className="text-gray-300 font-mono">{company.slug}</p>
                </div>
                {company.contact_email && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs">E-mail de contact</p>
                      <p className="text-gray-200">{company.contact_email}</p>
                    </div>
                  </div>
                )}
                {company.contact_phone && (
                  <div className="flex items-start gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs">Téléphone</p>
                      <p className="text-gray-200">{company.contact_phone}</p>
                    </div>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs">Adresse</p>
                      <p className="text-gray-200">{company.address}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-800/60 text-xs text-gray-500">
                Créée le {formatDateTime(company.created_at)}
              </div>
            </div>
          </div>

          {/* Tickets & Prestataires Read Only Lists */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prestataires section */}
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-brand-400" />
                Prestataires associés ({prestataires?.length || 0})
              </h2>

              {loadingPrestataires ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                </div>
              ) : !prestataires?.length ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucun prestataire enregistré pour cette entreprise.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {prestataires.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-gray-900/60 rounded-lg border border-gray-800/80 flex items-start justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-300 text-sm">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.contact_email || 'Pas d\'email'}</p>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.is_active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-gray-800 text-gray-500'
                        }`}
                      >
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tickets section */}
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-4">
                <TicketIcon className="w-5 h-5 text-brand-400" />
                Tickets ouverts ou en cours ({tickets?.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length || 0})
              </h2>

              {loadingTickets ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
                </div>
              ) : !tickets?.length ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucun ticket enregistré.</p>
              ) : (
                <div className="space-y-3">
                  {tickets
                    .filter((t) => t.status !== 'closed' && t.status !== 'resolved')
                    .slice(0, 5)
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => navigate(`/admin/tickets/${t.id}`)}
                        className="p-3 bg-gray-900/40 hover:bg-gray-900/80 cursor-pointer rounded-lg border border-gray-800/80 flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="font-medium text-gray-200 text-sm truncate">{t.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Par {t.created_by_profile?.full_name || 'Inconnu'} • prestataire:{' '}
                            {t.prestataire?.name || 'Aucun'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                              t.priority === 'urgent'
                                ? 'bg-red-500/20 text-red-400'
                                : t.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                              t.status === 'open'
                                ? 'bg-blue-500/20 text-blue-400'
                                : t.status === 'in_progress'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  {tickets.length > 5 && (
                    <button
                      onClick={() => navigate(`/admin/tickets?company_id=${company.id}`)}
                      className="text-xs text-brand-400 hover:text-brand-300 font-medium pt-1 block"
                    >
                      Voir tous les {tickets.length} tickets →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Users Management Tab */
        <div className="glass-card p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-brand-400" />
                Liste des utilisateurs ({users?.length || 0})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Utilisateurs affectés et autorisés pour {company.name}
              </p>
            </div>
            <button
              id="add-user-btn"
              onClick={() => setShowAddUserModal(true)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Ajouter un utilisateur
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          ) : !users?.length ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-lg">
              Aucun utilisateur associé à cette entreprise.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-800/80 hover:bg-gray-800/10">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-200">{user.full_name || 'Sans nom'}</div>
                        <div className="text-[10px] text-gray-500">ID: {user.id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="btn-ghost p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                          title="Dissocier cet utilisateur"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="glass-card w-full max-w-md p-6 space-y-4 animate-scale-in">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <h3 className="font-bold text-gray-100 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-brand-400" />
                    Ajouter un membre
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddUserModal(false);
                      reset();
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit(handleAddUser)} className="space-y-4 pt-1">
                  <div>
                    <label className="label">Nom complet</label>
                    <input
                      id="user-name"
                      {...register('full_name')}
                      className="input text-sm"
                      placeholder="ex: Paul Martin"
                    />
                    {errors.full_name && (
                      <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Adresse e-mail</label>
                    <input
                      id="user-email"
                      {...register('email')}
                      type="email"
                      className="input text-sm"
                      placeholder="ex: paul.martin@company.com"
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="label">Mot de passe</label>
                    <input
                      id="user-password"
                      {...register('password')}
                      type="text"
                      className="input text-sm"
                      placeholder="ex: password123 (6+ chars)"
                    />
                    {errors.password && (
                      <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="bg-gray-900/50 p-2.5 rounded border border-gray-800 text-[11px] text-gray-400">
                    Remarque: L'utilisateur sera créé avec le rôle <strong className="text-brand-400">client</strong> et automatiquement associé à cette entreprise.
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserModal(false);
                        reset();
                      }}
                      className="btn-secondary text-xs"
                      id="cancel-add-user-btn"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary text-xs"
                      id="submit-add-user-btn"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Ajouter
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
