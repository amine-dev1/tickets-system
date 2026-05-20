import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, PlusCircle, Settings,
  LogOut, Zap, Building2, Briefcase,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../lib/utils';
import { isAdminRole } from '../../types';

const clientNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/tickets/new', icon: PlusCircle, label: 'New Ticket' },
  { to: '/prestataires', icon: Building2, label: 'Prestataires' },
  { to: '/missions', icon: Briefcase, label: 'Missions' },
];

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/companies', icon: Building2, label: 'Entreprises' },
  { to: '/admin/tickets', icon: Ticket, label: 'All Tickets' },
  { to: '/admin/prestataires', icon: Settings, label: 'Prestataires' },
  { to: '/admin/missions', icon: Briefcase, label: 'Missions' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(user?.role);
  const nav = isAdmin ? adminNav : clientNav;

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
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {isAdmin && (
          <div className="px-3 pt-1 pb-2">
            <span className="section-divider">Admin Panel</span>
          </div>
        )}
        {!isAdmin && (
          <div className="px-3 pt-1 pb-2">
            <span className="section-divider">Navigation</span>
          </div>
        )}
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
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
