import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = (id: string) => `tf_pwd_setup_${id}`;

export function PasswordSetupModal() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const done = localStorage.getItem(STORAGE_KEY(user.id));
    if (!done) setOpen(true);
  }, [user?.id]);

  const dismiss = () => {
    if (user?.id) localStorage.setItem(STORAGE_KEY(user.id), 'skipped');
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      const msgs: Record<string, string> = {
        'New password should be different from the old password': 'Le nouveau mot de passe doit être différent de l\'actuel.',
        'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
      };
      setError(msgs[err.message] ?? err.message);
      return;
    }

    setSuccess(true);
    if (user?.id) localStorage.setItem(STORAGE_KEY(user.id), 'set');
    setTimeout(() => setOpen(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      <div className="relative glass-card w-full max-w-md p-0 overflow-hidden shadow-2xl animate-fade-in">

        {/* Header gradient band */}
        <div className="bg-gradient-to-br from-brand-600 to-accent-600 px-6 pt-6 pb-8">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={dismiss}
              className="text-white/60 hover:text-white transition-colors p-1"
              aria-label="Ignorer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4">
            <h2 className="text-xl font-bold text-white leading-tight">
              Sécurisez votre compte
            </h2>
            <p className="text-white/70 text-sm mt-1">
              Définissez un mot de passe personnel pour votre première connexion.
            </p>
          </div>
          {/* Optional badge */}
          <span className="inline-block mt-3 px-2.5 py-1 rounded-full bg-white/15 text-white/80 text-xs font-medium border border-white/20">
            Étape facultative
          </span>
        </div>

        {/* Overlap card */}
        <div className="px-6 pb-6 -mt-3 bg-white dark:bg-gray-900 rounded-t-2xl relative">

          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">Mot de passe défini !</p>
              <p className="text-sm text-gray-400">Votre compte est maintenant sécurisé.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-5">

              {/* New password */}
              <div>
                <label className="label block mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input w-full pr-10"
                    placeholder="Minimum 8 caractères"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4].map(level => {
                      const strength = Math.min(4, Math.floor(
                        (password.length >= 8 ? 1 : 0) +
                        (/[A-Z]/.test(password) ? 1 : 0) +
                        (/[0-9]/.test(password) ? 1 : 0) +
                        (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
                      ));
                      const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'];
                      return (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${level <= strength ? colors[strength - 1] : 'bg-gray-200 dark:bg-gray-700'}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="label block mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="input w-full pr-10"
                    placeholder="Répétez le mot de passe"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Match indicator */}
                {confirm.length > 0 && (
                  <p className={`text-xs mt-1 ${password === confirm ? 'text-emerald-500' : 'text-red-400'}`}>
                    {password === confirm ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Définir mon mot de passe
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline-offset-2 hover:underline"
                >
                  Ignorer pour l'instant
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
