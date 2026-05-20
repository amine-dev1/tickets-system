import { Link } from 'react-router-dom';
import { PlusCircle, Ticket, Clock, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useTickets } from '../hooks/useTickets';
import { useAuthStore } from '../store/authStore';
import { TicketCard } from '../components/tickets/TicketCard';

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: number | undefined;
  accent: 'brand' | 'blue' | 'amber' | 'emerald';
  delay?: number;
}) {
  const palette: Record<string, { light: string; dark: string; ring: string; glow: string }> = {
    brand:   { light: 'from-brand-500 to-brand-600',    dark: 'dark:from-brand-500 dark:to-brand-700',     ring: 'ring-brand-500/20',   glow: 'shadow-brand-500/20' },
    blue:    { light: 'from-blue-500 to-blue-600',      dark: 'dark:from-blue-500 dark:to-blue-700',       ring: 'ring-blue-500/20',    glow: 'shadow-blue-500/20' },
    amber:   { light: 'from-amber-400 to-amber-500',    dark: 'dark:from-amber-400 dark:to-amber-600',     ring: 'ring-amber-500/20',   glow: 'shadow-amber-500/20' },
    emerald: { light: 'from-emerald-500 to-emerald-600',dark: 'dark:from-emerald-500 dark:to-emerald-700', ring: 'ring-emerald-500/20', glow: 'shadow-emerald-500/20' },
  };
  const p = palette[accent];

  return (
    <div
      className="stat-card animate-fade-in-up group"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      {/* Accent background blob */}
      <div className={`pointer-events-none absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${p.light} ${p.dark} opacity-[0.08] rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />

      <div className="flex items-start justify-between relative">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.light} ${p.dark} flex items-center justify-center shadow-soft-md ${p.glow} ring-1 ${p.ring} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="relative">
        <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight tabular-nums">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: tickets } = useTickets();

  const stats = {
    total:      tickets?.length ?? 0,
    open:       tickets?.filter((t) => t.status === 'open').length ?? 0,
    inProgress: tickets?.filter((t) => t.status === 'in_progress').length ?? 0,
    resolved:   tickets?.filter((t) => t.status === 'resolved').length ?? 0,
  };

  const recent = tickets?.slice(0, 3) ?? [];

  return (
    <div>
      <Header
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here's what's happening with your tickets"
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Ticket}       label="Total Tickets" value={stats.total}      accent="brand"   delay={0} />
          <StatCard icon={AlertCircle}  label="Open"          value={stats.open}       accent="blue"    delay={80} />
          <StatCard icon={Clock}        label="In Progress"   value={stats.inProgress} accent="amber"   delay={160} />
          <StatCard icon={CheckCircle}  label="Resolved"      value={stats.resolved}   accent="emerald" delay={240} />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <Link id="new-ticket-btn" to="/tickets/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            New Ticket
          </Link>
          <Link to="/tickets" className="btn-secondary">
            <Ticket className="w-4 h-4" />
            View All Tickets
          </Link>
        </div>

        {/* Recent tickets */}
        <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Recent Tickets
            </h2>
            <Link to="/tickets" className="group inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors dark:text-brand-400 dark:hover:text-brand-300">
              View all
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="glass-card empty-state">
              <div className="empty-state-icon">
                <Ticket className="w-7 h-7 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">No tickets yet</p>
              <p className="text-gray-500 text-sm mb-5 max-w-sm dark:text-gray-400">
                When you create a ticket it'll show up here. Get started by submitting your first one.
              </p>
              <Link to="/tickets/new" className="btn-primary">
                <PlusCircle className="w-4 h-4" />
                Create your first ticket
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
