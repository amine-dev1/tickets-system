import { Link } from 'react-router-dom';
import {
  Ticket, Clock, CheckCircle, AlertCircle, Users, TrendingUp, Zap,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useAdminStats, useTickets } from '../../hooks/useTickets';
import { TicketCard } from '../../components/tickets/TicketCard';

function StatCard({
  icon: Icon,
  label,
  value,
  lightColor,
  darkColor,
  sub,
}: {
  icon: any;
  label: string;
  value: number | undefined;
  lightColor: string;
  darkColor: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lightColor} ${darkColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats } = useAdminStats();
  const { data: tickets } = useTickets();
  const recent = tickets?.slice(0, 5) ?? [];

  return (
    <div>
      <Header title="Admin Overview" subtitle="Complete view of all support activity" />
      <div className="p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Ticket}       label="Total"       value={stats?.total}       lightColor="bg-brand-100 text-brand-600"    darkColor="dark:bg-brand-500/15 dark:text-brand-400" />
          <StatCard icon={AlertCircle}  label="Open"        value={stats?.open}        lightColor="bg-blue-100 text-blue-600"      darkColor="dark:bg-blue-500/15 dark:text-blue-400" />
          <StatCard icon={Clock}        label="In Progress" value={stats?.in_progress} lightColor="bg-amber-100 text-amber-600"    darkColor="dark:bg-amber-500/15 dark:text-amber-400" />
          <StatCard icon={CheckCircle}  label="Resolved"    value={stats?.resolved}    lightColor="bg-emerald-100 text-emerald-600" darkColor="dark:bg-emerald-500/15 dark:text-emerald-400" />
          <StatCard icon={Zap}          label="Closed"      value={stats?.closed}      lightColor="bg-slate-100 text-slate-600"    darkColor="dark:bg-gray-500/15 dark:text-gray-400" />
          <StatCard icon={TrendingUp}   label="Urgent"      value={stats?.urgent}      lightColor="bg-red-100 text-red-600"        darkColor="dark:bg-red-500/15 dark:text-red-400" />
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/tickets" id="admin-all-tickets" className="btn-primary">
            <Ticket className="w-4 h-4" />
            Manage All Tickets
          </Link>
          <Link to="/admin/users" className="btn-secondary">
            <Users className="w-4 h-4" />
            View Clients
          </Link>
        </div>

        {/* Recent tickets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">Recent Activity</h2>
            <Link to="/admin/tickets" className="text-sm text-brand-600 hover:text-brand-500 transition-colors dark:text-brand-400 dark:hover:text-brand-300">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
            {!recent.length && (
              <div className="glass-card p-8 text-center text-gray-400 dark:text-gray-500">
                No tickets yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
