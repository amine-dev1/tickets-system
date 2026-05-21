import { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import { formatDate, getInitials } from '../../lib/utils';
import { Building, User, Mail, Loader2 } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Profile[] | null }) => {
        setUsers(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Header title="Clients" subtitle={`${users.length} registered clients`} />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/60">
                  <th className="text-left px-5 py-3.5 text-gray-400 font-medium">Client</th>
                  <th className="text-left px-5 py-3.5 text-gray-400 font-medium">Company</th>
                  <th className="text-left px-5 py-3.5 text-gray-400 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-300 text-xs font-bold">
                          {getInitials(u.full_name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-200">{u.full_name || '—'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />{u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" />
                        {typeof u.company === 'object' ? u.company?.name : u.company || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-gray-500">
                      No clients registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
