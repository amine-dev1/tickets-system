import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axios';
import type { Profile, PermModule, PermAction, ModulePerms, UserPermissionsMap, UserPermissionsResponse } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/layout/Header';
import {
  Loader2, Search, ShieldCheck, RotateCcw, Save,
  Ticket, Briefcase, Building2, Users, LayoutDashboard, ChevronRight,
} from 'lucide-react';
import { getInitials } from '../../lib/utils';

/* ── Config ───────────────────────────────────────────────────── */

const MODULES: { key: PermModule; label: string; icon: React.ElementType; actions: PermAction[] }[] = [
  { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard, actions: ['view'] },
  { key: 'tickets',      label: 'Tickets',      icon: Ticket,          actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'missions',     label: 'Missions',     icon: Briefcase,       actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'prestataires', label: 'Prestataires', icon: Building2,       actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'users',        label: 'Utilisateurs', icon: Users,           actions: ['view', 'create', 'edit', 'delete'] },
];

const ACTION_LABELS: Record<PermAction, string> = {
  view: 'Voir', create: 'Créer', edit: 'Modifier', delete: 'Supprimer',
};

const ALL_ACTIONS: PermAction[] = ['view', 'create', 'edit', 'delete'];

const FULL_OFF: ModulePerms = { view: false, create: false, edit: false, delete: false };
const FULL_ON:  ModulePerms = { view: true,  create: true,  edit: true,  delete: true  };

/* ── Component ─────────────────────────────────────────────────── */

export default function AdminPermissions() {
  const { user: me } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [perms, setPerms] = useState<UserPermissionsMap>({});
  const [dirty, setDirty] = useState(false);

  /* Users list */
  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: Profile[]; total: number }>({
    queryKey: ['admin-users', search],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (search) p.set('search', search);
      return api.get(`/admin/users?${p}`).then(r => r.data);
    },
  });

  /* Permissions for selected user */
  const { data: permData, isLoading: permLoading } = useQuery<UserPermissionsResponse>({
    queryKey: ['user-permissions', selectedUser?.id],
    queryFn: () => api.get(`/admin/users/${selectedUser!.id}/permissions`).then(r => r.data),
    enabled: !!selectedUser,
  });

  useEffect(() => {
    if (permData) { setPerms(permData.permissions); setDirty(false); }
  }, [permData]);

  /* Save mutation */
  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/admin/users/${selectedUser!.id}/permissions`, { permissions: perms }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUser?.id] });
      setDirty(false);
    },
  });

  /* Reset to defaults mutation */
  const resetMutation = useMutation({
    mutationFn: () =>
      api.delete(`/admin/users/${selectedUser!.id}/permissions`).then(r => r.data),
    onSuccess: (data) => {
      setPerms(data.permissions);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUser?.id] });
    },
  });

  /* ── Helpers ── */

  const toggle = (module: PermModule, action: PermAction) => {
    setPerms(prev => {
      const cur = prev[module] ?? FULL_OFF;
      const next = { ...cur, [action]: !cur[action] };
      // view is prerequisite for all other actions
      if (action !== 'view' && next[action] && !next.view) next.view = true;
      if (action === 'view' && !next.view) {
        next.create = false; next.edit = false; next.delete = false;
      }
      return { ...prev, [module]: next };
    });
    setDirty(true);
  };

  const toggleModule = (module: PermModule, on: boolean) => {
    const available = MODULES.find(m => m.key === module)?.actions ?? [];
    const next = { ...FULL_OFF };
    available.forEach(a => { next[a] = on; });
    setPerms(prev => ({ ...prev, [module]: next }));
    setDirty(true);
  };

  const selectUser = (u: Profile) => {
    setSelectedUser(u);
    setDirty(false);
  };

  const isAdminOrSuper = (role: string) => role === 'admin' || role === 'superadmin';

  /* ── Render ── */

  return (
    <div className="space-y-6">
      <Header title="Permissions" subtitle="Contrôler l'accès des utilisateurs aux modules" />

      <div className="px-6 flex gap-5 h-[calc(100vh-160px)]">

        {/* ── Left: user list ── */}
        <div className="w-72 flex-shrink-0 flex flex-col glass-card overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 w-full text-sm py-2"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/40">
            {usersLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            )}
            {usersData?.users.map(u => {
              const isMe = u.id === me?.id;
              const isAdmin = isAdminOrSuper(u.role);
              const active = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => !isAdmin && selectUser(u)}
                  disabled={isAdmin}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${active ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}
                    ${isAdmin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-600/20 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-300 text-xs font-bold flex-shrink-0">
                    {getInitials(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-gray-400 truncate">{u.role}{isAdmin ? ' · accès total' : ''}</p>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: permission matrix ── */}
        <div className="flex-1 flex flex-col">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center glass-card text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">Sélectionnez un utilisateur</p>
                <p className="text-sm text-gray-400 mt-1">Choisissez un utilisateur à gauche pour gérer ses permissions.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
              {/* Header row */}
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-600/20 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-300 text-sm font-bold">
                    {getInitials(selectedUser.full_name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedUser.full_name || selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{selectedUser.role}</span>
                      {permData?.is_custom && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20 font-medium">
                          <ShieldCheck className="w-2.5 h-2.5" /> Personnalisé
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {permData?.is_custom && (
                    <button
                      onClick={() => resetMutation.mutate()}
                      disabled={resetMutation.isPending}
                      className="btn-ghost text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-sm"
                      title="Réinitialiser aux permissions par défaut du rôle"
                    >
                      {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Réinitialiser
                    </button>
                  )}
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={!dirty || saveMutation.isPending}
                    className="btn-primary text-sm disabled:opacity-40"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </button>
                </div>
              </div>

              {permLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {MODULES.map(({ key, label, icon: Icon, actions }) => {
                    const modPerms = perms[key] ?? FULL_OFF;
                    const allOn  = actions.every(a => modPerms[a]);
                    const allOff = actions.every(a => !modPerms[a]);

                    return (
                      <div key={key} className="glass-card overflow-hidden">
                        {/* Module header */}
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/60 dark:bg-gray-800/20">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-brand-500" />
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex-1">{label}</span>
                          {/* Toggle all */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Tout</span>
                            <button
                              onClick={() => toggleModule(key, !allOn)}
                              className={`relative inline-flex w-9 h-5 rounded-full transition-colors focus:outline-none
                                ${allOn ? 'bg-brand-500' : allOff ? 'bg-gray-200 dark:bg-gray-700' : 'bg-brand-300'}`}
                            >
                              <span
                                className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform mt-[3px]
                                  ${allOn ? 'translate-x-4' : 'translate-x-0.5'}`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Action toggles */}
                        <div className="flex divide-x divide-gray-100 dark:divide-gray-800/40">
                          {ALL_ACTIONS.map(action => {
                            const available = actions.includes(action);
                            const on = modPerms[action] ?? false;
                            return (
                              <div
                                key={action}
                                className={`flex-1 flex flex-col items-center gap-2.5 px-4 py-4
                                  ${!available ? 'opacity-30' : ''}`}
                              >
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  {ACTION_LABELS[action]}
                                </span>
                                <button
                                  disabled={!available}
                                  onClick={() => available && toggle(key, action)}
                                  className={`relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none
                                    ${on ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}
                                    ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                >
                                  <span
                                    className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform mt-[3px]
                                      ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
                                  />
                                </button>
                                <span className={`text-[10px] font-medium ${on ? 'text-brand-500' : 'text-gray-400'}`}>
                                  {on ? 'Activé' : 'Désactivé'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
