import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axios';
import type { Profile, Company } from '../../types';
import type { Role } from '../../types';
import { isSuperAdmin } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/layout/Header';
import {
  Loader2, Search, Trash2, Save, Building, Mail,
  ChevronLeft, ChevronRight, X, UserCog, UserPlus, Eye, EyeOff, RefreshCw, Copy, Check, AlertCircle, KeyRound,
  ShieldCheck, Shield, Briefcase, User,
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import type { SelectOption } from '../../components/ui/Select';
import { formatDate, getInitials } from '../../lib/utils';

const ROLE_STYLES: Record<string, string> = {
  superadmin: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
  admin:      'bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/30',
  agent:      'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
  client:     'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30',
};

const ROLE_OPTIONS: Record<Role, SelectOption> = {
  superadmin: { value: 'superadmin', label: 'Super Admin',       icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />, description: 'Accès global à toute la plateforme' },
  admin:      { value: 'admin',      label: 'Admin entreprise',   icon: <Shield      className="w-3.5 h-3.5 text-brand-500"  />, description: 'Gère les utilisateurs et ressources de son entreprise' },
  agent:      { value: 'agent',      label: 'Agent',              icon: <Briefcase   className="w-3.5 h-3.5 text-blue-500"   />, description: 'Traite les tickets dans son entreprise' },
  client:     { value: 'client',     label: 'Client',             icon: <User        className="w-3.5 h-3.5 text-gray-400"   />, description: 'Crée et suit ses propres tickets' },
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: me } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<Role>('client');
  const [editCompanyId, setEditCompanyId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', password: '', role: 'agent' as Role, sendWelcomeEmail: true });
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<Profile | null>(null);
  const [resetPwdResult, setResetPwdResult] = useState('');
  const [resetPwdCopied, setResetPwdCopied] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery<{ users: Profile[]; total: number }>({
    queryKey: ['admin-users', search, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return api.get(`/admin/users?${params}`).then(r => r.data);
    },
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: () => api.get('/companies').then(r => r.data),
    enabled: isSuperAdmin(me?.role),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role, company_id }: { id: string; role: Role; company_id: string | null }) =>
      api.put(`/admin/users/${id}`, { role, company_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const resetPwdMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reset-password`).then(r => r.data),
    onSuccess: (data) => {
      setResetPwdResult(data.password);
      setShowResetPwd(false);
      setResetPwdCopied(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof createForm) => api.post('/admin/users', payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreate(false);
      setCreateForm({ full_name: '', email: '', password: '', role: 'agent', sendWelcomeEmail: true });
      setCreateError('');
    },
    onError: (err: any) => setCreateError(err.message || 'Erreur lors de la création.'),
  });

  const startEdit = (u: Profile) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditCompanyId(u.company_id ?? '');
  };

  const handleSave = () => {
    if (!editingUser) return;
    updateMutation.mutate({ id: editingUser.id, role: editRole, company_id: editCompanyId || null });
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    const arr = Array.from(crypto.getRandomValues(new Uint8Array(12)));
    // guarantee at least one of each category
    const pwd = [
      upper[arr[0] % upper.length],
      lower[arr[1] % lower.length],
      digits[arr[2] % digits.length],
      special[arr[3] % special.length],
      ...arr.slice(4).map(b => all[b % all.length]),
    ];
    // shuffle
    for (let i = pwd.length - 1; i > 0; i--) {
      const j = arr[i] % (i + 1);
      [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
    }
    return pwd.join('');
  };

  const handleGeneratePassword = () => {
    setCreateForm(f => ({ ...f, password: generatePassword() }));
    setShowPassword(true);
    setCopied(false);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(createForm.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const assignableRoles: Role[] = isSuperAdmin(me?.role)
    ? ['superadmin', 'admin', 'agent', 'client']
    : ['admin', 'agent'];

  return (
    <div className="space-y-6">
      <Header title="Utilisateurs" subtitle="Gérer les comptes et les rôles" />

      <div className="px-6">
        {/* Search + create */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-10 w-full"
            />
          </div>
          <button onClick={() => { setShowCreate(true); setCreateError(''); }} className="btn-primary flex-shrink-0">
            <UserPlus className="w-4 h-4" /> Nouvel utilisateur
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : (
          <>
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/70 dark:bg-gray-800/20">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Utilisateur</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rôle</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entreprise</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Inscrit le</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                  {data?.users.map((u) => (
                    <tr
                      key={u.id}
                      className="group hover:bg-brand-50/60 dark:hover:bg-gray-800/30 transition-colors duration-150"
                    >
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-600/20 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-300 text-xs font-bold flex-shrink-0">
                            {getInitials(u.full_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{u.full_name || '—'}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />{u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_STYLES[u.role] ?? ROLE_STYLES.client}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <Building className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          {u.company?.name || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-500">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => startEdit(u)}
                            className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
                            title="Modifier"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                          {u.id !== me?.id && (
                            <button
                              onClick={() => { setResetPwdUser(u); setResetPwdResult(''); }}
                              className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-500/10 transition-colors"
                              title="Générer un mot de passe"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          {u.id !== me?.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!data?.users.length && (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center">
                        <p className="text-gray-400 text-sm">Aucun utilisateur trouvé.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} sur {totalPages} · <span className="font-medium">{data?.total}</span> utilisateurs
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 shadow-soft-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Nouvel utilisateur</h2>
                <p className="text-xs text-gray-400 mt-0.5">Créer un compte admin ou agent</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label block mb-1.5">Nom complet</label>
                <input
                  className="input w-full"
                  placeholder="Jean Dupont"
                  value={createForm.full_name}
                  onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label block mb-1.5">Email *</label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="jean@exemple.com"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label">Mot de passe *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                  >
                    <RefreshCw className="w-3 h-3" /> Générer
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input w-full pr-20"
                    placeholder="Minimum 6 caractères"
                    value={createForm.password}
                    onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {createForm.password && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Copier"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="label block mb-1.5">Rôle *</label>
                <Select
                  fullWidth
                  value={createForm.role}
                  onChange={val => setCreateForm(f => ({ ...f, role: val as Role }))}
                  options={assignableRoles.map(r => ROLE_OPTIONS[r])}
                />
              </div>
              {/* Send welcome email toggle */}
              <div
                onClick={() => setCreateForm(f => ({ ...f, sendWelcomeEmail: !f.sendWelcomeEmail }))}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 select-none
                  ${createForm.sendWelcomeEmail
                    ? 'bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/30'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                    ${createForm.sendWelcomeEmail ? 'bg-brand-100 dark:bg-brand-500/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Mail className={`w-4 h-4 transition-colors ${createForm.sendWelcomeEmail ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium transition-colors ${createForm.sendWelcomeEmail ? 'text-brand-700 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      Envoyer les identifiants par email
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {createForm.sendWelcomeEmail ? 'Un email avec le mot de passe sera envoyé à l\'utilisateur' : 'Aucun email ne sera envoyé'}
                    </p>
                  </div>
                </div>
                {/* Toggle pill */}
                <div className={`relative inline-flex w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200
                  ${createForm.sendWelcomeEmail ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform duration-200 mt-[3px]
                    ${createForm.sendWelcomeEmail ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>

              {createError && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.email || !createForm.password}
                className="btn-primary"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 shadow-soft-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Modifier l'utilisateur
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingUser.full_name || editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label block mb-1.5">Rôle</label>
                <Select
                  fullWidth
                  value={editRole}
                  onChange={val => setEditRole(val as Role)}
                  options={assignableRoles.map(r => ROLE_OPTIONS[r])}
                />
              </div>

              {isSuperAdmin(me?.role) && (
                <div>
                  <label className="label block mb-1.5">Entreprise</label>
                  <Select
                    fullWidth
                    searchable
                    placeholder="Aucune entreprise"
                    value={editCompanyId}
                    onChange={val => setEditCompanyId(val)}
                    options={[
                      { value: '', label: 'Aucune', icon: <Building className="w-3.5 h-3.5 text-gray-400" /> },
                      ...(companies ?? []).map(c => ({
                        value: c.id,
                        label: c.name,
                        icon: <Building className="w-3.5 h-3.5 text-brand-400" />,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setEditingUser(null)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary">
                {updateMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password confirmation modal */}
      {resetPwdUser && !resetPwdResult && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 shadow-soft-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Générer un nouveau mot de passe</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Un nouveau mot de passe sera généré pour <strong>{resetPwdUser.full_name || resetPwdUser.email}</strong>. L'ancien mot de passe sera immédiatement invalidé.
                </p>
              </div>
              <button onClick={() => setResetPwdUser(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            {resetPwdMutation.isError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                {(resetPwdMutation.error as any)?.response?.data?.error || 'Erreur lors de la génération'}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setResetPwdUser(null)} className="btn-secondary">Annuler</button>
              <button
                onClick={() => resetPwdMutation.mutate(resetPwdUser.id)}
                disabled={resetPwdMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-soft-md disabled:opacity-50"
              >
                {resetPwdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password result modal */}
      {resetPwdUser && resetPwdResult && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 shadow-soft-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Mot de passe généré</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pour {resetPwdUser.full_name || resetPwdUser.email}</p>
              </div>
              <button onClick={() => { setResetPwdUser(null); setResetPwdResult(''); }} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-3">Copiez ce mot de passe maintenant — il ne sera plus affiché.</p>
              <div className="relative">
                <input
                  readOnly
                  value={resetPwdResult}
                  type={showResetPwd ? 'text' : 'password'}
                  className="input w-full pr-20 font-mono bg-white dark:bg-gray-900 select-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(resetPwdResult); setResetPwdCopied(true); setTimeout(() => setResetPwdCopied(false), 2000); }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Copier"
                  >
                    {resetPwdCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetPwd(v => !v)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => { setResetPwdUser(null); setResetPwdResult(''); }} className="btn-primary">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 shadow-soft-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Supprimer cet utilisateur ?</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Cette action est irréversible. L'utilisateur sera définitivement supprimé.</p>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-soft-md shadow-red-600/25 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed dark:shadow-none"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
