import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/axios';
import {
  Loader2, RefreshCw, LogIn, Unplug, CheckCircle2, AlertCircle, Mail,
} from 'lucide-react';

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
  push_tickets: boolean;
  sync_enabled: boolean;
  last_synced_at: string | null;
}

/** Reads the ?google=... redirect param set by the OAuth callback. */
function useOAuthRedirectMessage(onResolved: () => void) {
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;

    const map: Record<string, { type: 'ok' | 'err'; text: string }> = {
      connected:     { type: 'ok',  text: 'Compte Google connecté avec succès.' },
      denied:        { type: 'err', text: 'Connexion refusée. Vous avez annulé l\'autorisation Google.' },
      error:         { type: 'err', text: 'Une erreur est survenue lors de la connexion à Google.' },
      invalid_state: { type: 'err', text: 'Session expirée. Veuillez réessayer la connexion.' },
    };
    setMsg(map[status] ?? null);

    // Strip the query param from the URL without reloading.
    params.delete('google');
    const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', clean);
    onResolved();
  }, []);

  return [msg, setMsg] as const;
}

export function GoogleCalendarConnect() {
  const qc = useQueryClient();
  const [actionError, setActionError] = useState('');

  const { data: status, isLoading } = useQuery<GoogleStatus>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/calendar/google/status').then((r) => r.data),
  });

  const [redirectMsg] = useOAuthRedirectMessage(() => {
    qc.invalidateQueries({ queryKey: ['google-calendar-status'] });
    qc.invalidateQueries({ queryKey: ['calendar-feed'] });
  });

  const connect = useMutation({
    mutationFn: () => api.get('/calendar/google/auth-url').then((r) => r.data as { url: string }),
    onSuccess: (d) => { window.location.href = d.url; },
    onError: (e: any) => setActionError(e.message || 'Impossible de démarrer la connexion Google.'),
  });

  const sync = useMutation({
    mutationFn: () => api.post('/calendar/google/sync').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-calendar-status'] });
      qc.invalidateQueries({ queryKey: ['calendar-feed'] });
    },
    onError: (e: any) => setActionError(e.message || 'Échec de la synchronisation.'),
  });

  const disconnect = useMutation({
    mutationFn: () => api.delete('/calendar/google/disconnect').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-calendar-status'] });
      qc.invalidateQueries({ queryKey: ['calendar-feed'] });
    },
    onError: (e: any) => setActionError(e.message || 'Échec de la déconnexion.'),
  });

  const toggle = useMutation({
    mutationFn: (patch: { push_tickets?: boolean; sync_enabled?: boolean }) =>
      api.patch('/calendar/google/settings', patch).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['google-calendar-status'] }),
  });

  // Server has no Google OAuth credentials → hide the whole block.
  if (!isLoading && status && !status.configured) return null;

  return (
    <div className="glass-card px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent-500/15 flex items-center justify-center ring-1 ring-brand-400/20 flex-shrink-0">
          <GoogleIcon className="w-4.5 h-4.5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Google Calendar &amp; compte Google</p>
          {isLoading ? (
            <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Vérification…</p>
          ) : status?.connected ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
              <Mail className="w-3 h-3 text-brand-500 flex-shrink-0" />
              Connecté&nbsp;: <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{status.email ?? 'compte Google'}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">Synchronisez votre agenda et liez votre compte Google.</p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {status?.connected ? (
            <>
              <button
                onClick={() => { setActionError(''); sync.mutate(); }}
                disabled={sync.isPending}
                className="btn-secondary text-xs px-3 py-1.5"
                title="Synchroniser maintenant"
              >
                {sync.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Synchroniser
              </button>
              <button
                onClick={() => { setActionError(''); disconnect.mutate(); }}
                disabled={disconnect.isPending}
                className="btn-danger text-xs px-3 py-1.5"
                title="Déconnecter le compte Google"
              >
                {disconnect.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                Déconnecter
              </button>
            </>
          ) : (
            <button
              onClick={() => { setActionError(''); connect.mutate(); }}
              disabled={connect.isPending || isLoading}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {connect.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
              Connecter Google
            </button>
          )}
        </div>
      </div>

      {/* Connected: sync options */}
      {status?.connected && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 border-t border-gray-200/60 dark:border-gray-800/60">
          <Toggle
            label="Synchronisation active"
            checked={status.sync_enabled}
            disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ sync_enabled: v })}
          />
          <Toggle
            label="Exporter mes tickets vers Google"
            checked={status.push_tickets}
            disabled={toggle.isPending}
            onChange={(v) => toggle.mutate({ push_tickets: v })}
          />
          {status.last_synced_at && (
            <span className="text-[11px] text-gray-400 ml-auto">
              Dernière synchro&nbsp;: {new Date(status.last_synced_at).toLocaleString('fr-FR')}
            </span>
          )}
        </div>
      )}

      {/* Feedback */}
      {(redirectMsg || actionError) && (
        <div
          className={`text-xs rounded-lg px-3 py-2 flex items-center gap-2 ${
            actionError || redirectMsg?.type === 'err'
              ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
          }`}
        >
          {actionError || redirectMsg?.type === 'err'
            ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
          {actionError || redirectMsg?.text}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }: {
  label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 disabled:opacity-50 ${
          checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
      <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
    </label>
  );
}

function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}
