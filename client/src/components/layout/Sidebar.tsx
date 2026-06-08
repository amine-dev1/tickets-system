import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Ticket, PlusCircle, Settings,
  LogOut, Zap, Building2, Briefcase, ShieldCheck, Users, ChevronDown, MessageSquare, Calendar as CalendarIcon,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../lib/utils';
import { isAdminRole, isSuperAdmin, isAgent } from '../../types';
import { api } from '../../api/axios';

type NavItem = { type?: 'item'; to: string; icon: React.ElementType; label: string; badgeKey?: 'messages' };
type NavGroup = { type: 'group'; label: string; icon: React.ElementType; items: NavItem[] };
type NavEntry = NavItem | NavGroup;

const clientNav: NavEntry[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/tickets/new', icon: PlusCircle, label: 'New Ticket' },
  { to: '/messages', icon: MessageSquare, label: 'Messagerie', badgeKey: 'messages' },
  { to: '/prestataires', icon: Building2, label: 'Prestataires' },
  { to: '/missions', icon: Briefcase, label: 'Missions' },
];

const agentNav: NavEntry[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/calendar', icon: CalendarIcon, label: 'Calendrier' },
  { to: '/messages', icon: MessageSquare, label: 'Messagerie', badgeKey: 'messages' },
];

const enterpriseAdminNav: NavEntry[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/calendar', icon: CalendarIcon, label: 'Calendrier' },
  { to: '/messages', icon: MessageSquare, label: 'Messagerie', badgeKey: 'messages' },
  {
    type: 'group',
    label: 'Administration',
    icon: ShieldCheck,
    items: [
      { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { to: '/admin/permissions', icon: ShieldCheck, label: 'Permissions' },
      { to: '/admin/my-company', icon: Building2, label: 'Entreprise' },
    ],
  },
  { to: '/admin/prestataires', icon: Settings, label: 'Prestataires' },
  { to: '/admin/missions', icon: Briefcase, label: 'Missions' },
];

const superAdminNav: NavEntry[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/companies', icon: Building2, label: 'Entreprises' },
  { to: '/admin/tickets', icon: Ticket, label: 'All Tickets' },
  { to: '/calendar', icon: CalendarIcon, label: 'Calendrier' },
  { to: '/messages', icon: MessageSquare, label: 'Messagerie', badgeKey: 'messages' },
  {
    type: 'group',
    label: 'Administration',
    icon: ShieldCheck,
    items: [
      { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
      { to: '/admin/permissions', icon: ShieldCheck, label: 'Permissions' },
    ],
  },
  { to: '/admin/prestataires', icon: Settings, label: 'Prestataires' },
  { to: '/admin/missions', icon: Briefcase, label: 'Missions' },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin entreprise',
  agent: 'Agent',
  client: 'Client',
};

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;
  const isAdmin = isAdminRole(role);
  const isSuper = isSuperAdmin(role);
  const isAgentRole = isAgent(role);

  // Unread messages count (polled + lightly cached)
  const { data: unread } = useQuery<{ count: number }>({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/messages/unread-count').then(r => r.data),
    enabled: !!user,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const unreadCount = unread?.count ?? 0;
  const badges: Record<string, number> = { messages: unreadCount };

  let nav: NavEntry[] = clientNav;
  if (isSuper) nav = superAdminNav;
  else if (isAgentRole) nav = agentNav;
  else if (isAdmin) nav = enterpriseAdminNav;

  // Track open/closed state for each group
  const groupLabels = nav.filter((e): e is NavGroup => e.type === 'group').map(g => g.label);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groupLabels.map(l => [l, true]))
  );

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const isGroupActive = (group: NavGroup) =>
    group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="relative w-64 flex-shrink-0 flex flex-col h-screen bg-gradient-sidebar border-r border-slate-800/60 overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-32 -left-16 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 w-72 h-72 bg-accent-600/10 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 bg-gradient-brand rounded-xl flex items-center justify-center shadow-glow-brand animate-pulse-glow">
            <Zap className="w-4.5 h-4.5 text-white drop-shadow" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-lg tracking-tight leading-none">
              TicketFlow
            </span>
            <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">
              SaaS Platform
            </span>
          </div>
        </div>

        {/* Enterprise tag */}
        {user?.company?.name && (
          <div className="mt-4 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500/30 to-accent-500/30 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user.company.logo_url ? (
                <img
                  src={user.company.logo_url}
                  alt={user.company.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-brand-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium leading-none">
                Entreprise
              </p>
              <p className="text-sm font-semibold text-white truncate mt-1 leading-none">
                {user.company.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pt-1 pb-2">
          <span className="section-divider">
            {isSuper ? 'Platform' : isAdmin ? 'Admin Panel' : isAgentRole ? 'Agent' : 'Navigation'}
          </span>
        </div>

        {nav.map((entry, idx) => {
          if (entry.type === 'group') {
            const isOpen = openGroups[entry.label] ?? true;
            const active = isGroupActive(entry);
            const Icon = entry.icon;
            return (
              <div key={entry.label}>
                <button
                  onClick={() => toggleGroup(entry.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${active
                      ? 'text-white bg-white/10 border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{entry.label}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-slate-700/60 space-y-0.5">
                    {entry.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        className={({ isActive }) => `sidebar-link text-xs py-2 ${isActive ? 'active' : ''}`}
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const item = entry as NavItem;
          const badge = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/dashboard'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex-shrink-0">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="relative border-t border-slate-800/60 p-3 space-y-1 bg-slate-950/40 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-glow-sm">
            {getInitials(user?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            {role && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-500/15 text-brand-300 border border-brand-500/30">
                <ShieldCheck className="w-2.5 h-2.5" />
                {ROLE_LABELS[role] || role}
              </div>
            )}
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
