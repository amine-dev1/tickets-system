import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Zap, Mail, Lock, User, Building2, CheckCircle, Shield, Clock, Eye, EyeOff } from 'lucide-react';

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials':                                          'Email ou mot de passe incorrect.',
  'Email not confirmed':                                                'Veuillez confirmer votre adresse email avant de vous connecter.',
  'User not found':                                                     'Aucun compte trouvé avec cet email.',
  'A user with this email address has already been registered':         'Un compte avec cette adresse email existe déjà.',
  'Unable to validate email address: invalid format':                   'L\'adresse email est invalide.',
  'Password should be at least 6 characters':                          'Le mot de passe doit contenir au moins 6 caractères.',
  'New password should be different from the old password':            'Le nouveau mot de passe doit être différent de l\'ancien.',
  'signup_disabled':                                                    'Les inscriptions sont désactivées.',
  'over_email_send_rate_limit':                                         'Trop de tentatives. Veuillez patienter avant de réessayer.',
  'For security purposes, you can only request this once every 60 seconds': 'Pour des raisons de sécurité, veuillez attendre 60 secondes avant de réessayer.',
};

const translateAuthError = (msg: string): string =>
  AUTH_ERRORS[msg] ?? (/[àâäéèêëîïôùûüç]/i.test(msg) ? msg : 'Une erreur est survenue. Veuillez réessayer.');

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Full name is required'),
  company: z.string().min(1, 'Company name is required'),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const FEATURES = [
  { icon: CheckCircle, text: 'Track all support requests in one place' },
  { icon: Shield,       text: 'Role-based access control for your team' },
  { icon: Clock,        text: 'Real-time status updates and notifications' },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading]);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const handleLogin = async (data: LoginForm) => {
    setError('');
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) { setError(translateAuthError(error.message)); return; }
    navigate('/dashboard');
  };

  const handleRegister = async (data: RegisterForm) => {
    setError('');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (signUpError) { setError(translateAuthError(signUpError.message)); return; }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        company: data.company,
        role: 'client',
      });
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
      {/* ── Ambient lighting (full-page) ───────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[34rem] h-[34rem] bg-brand-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-accent-500/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] bg-brand-700/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* ── Left branding panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden bg-gradient-sidebar">
        {/* Animated gradient sheen + decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-brand opacity-[0.07] bg-[length:200%_200%] animate-gradient" />
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/25 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent-700/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '0.8s' }} />
          {/* subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '44px 44px' }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 animate-fade-in-up">
          <div className="w-11 h-11 bg-gradient-pill rounded-2xl flex items-center justify-center shadow-glow-brand ring-1 ring-white/10 animate-pulse-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">TicketFlow</span>
        </div>

        {/* Main copy */}
        <div className="relative space-y-8">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-3 tracking-tight">
              Support tickets,<br />
              <span className="bg-gradient-to-r from-brand-300 via-accent-400 to-brand-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">done right.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              A professional platform to manage, track, and resolve support requests — built for agencies and their clients.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl p-2.5 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.07] hover:border-white/10 hover:translate-x-1 animate-fade-in-up"
                style={{ animationDelay: `${0.2 + i * 0.1}s`, animationFillMode: 'both' }}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
                  <Icon className="w-4 h-4 text-brand-300" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-slate-600 text-xs animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
          © {new Date().getFullYear()} TicketFlow. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Full moon behind the card (peeks out around it) */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] sm:w-[42rem] sm:h-[42rem] animate-float">
            {/* glowing disc */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-400/30 via-brand-600/15 to-transparent ring-1 ring-brand-400/30 shadow-glow-brand animate-pulse-slow" />
            {/* soft inner highlight */}
            <div className="absolute inset-[12%] rounded-full bg-gradient-to-tr from-white/[0.04] to-brand-300/10 blur-sm" />
            {/* slow orbiting ring */}
            <div className="absolute -inset-6 rounded-full border border-brand-400/15 animate-spin-slow" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-md animate-scale-in">
          {/* Glassmorphic card */}
          <div className="relative rounded-3xl p-8 sm:p-9
                          bg-white/70 dark:bg-gray-900/50 backdrop-blur-2xl
                          border border-white/60 dark:border-white/10
                          shadow-soft-xl ring-1 ring-gray-900/[0.04] dark:ring-white/[0.06]
                          before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-3xl
                          before:bg-gradient-to-r before:from-transparent before:via-brand-400/60 before:to-transparent">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
              <div className="w-9 h-9 bg-gradient-pill rounded-xl flex items-center justify-center shadow-glow-sm">
                <Zap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">TicketFlow</span>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {mode === 'login'
                  ? 'Sign in to manage your support tickets'
                  : 'Get started — it only takes a minute'}
              </p>
            </div>

            {/* Tab toggle */}
            <div className="flex bg-gray-200/60 dark:bg-gray-800/50 rounded-xl p-1 mb-6 backdrop-blur-sm ring-1 ring-gray-900/[0.03] dark:ring-white/[0.04]">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  mode === 'login'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-soft'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  mode === 'register'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-soft'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* ── Login form ── */}
            {mode === 'login' ? (
              <form key="login" onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 animate-fade-in">
                <div>
                  <label className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="login-email"
                      {...loginForm.register('email')}
                      type="email"
                      className="input pl-9"
                      placeholder="you@company.com"
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="login-password"
                      {...loginForm.register('password')}
                      type={showLoginPwd ? 'text' : 'password'}
                      className="input pl-9 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="btn-primary w-full justify-center py-2.5 mt-2"
                >
                  {loginForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
                </button>
              </form>

            ) : (
              /* ── Register form ── */
              <form key="register" onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4 animate-fade-in">
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="reg-name"
                    {...registerForm.register('full_name')}
                    className="input pl-9"
                    placeholder="Alice Martin"
                  />
                </div>
                {registerForm.formState.errors.full_name && (
                  <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label className="label">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="reg-company"
                    {...registerForm.register('company')}
                    className="input pl-9"
                    placeholder="Acme Corp"
                  />
                </div>
                {registerForm.formState.errors.company && (
                  <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.company.message}</p>
                )}
              </div>

              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="reg-email"
                    {...registerForm.register('email')}
                    type="email"
                    className="input pl-9"
                    placeholder="you@company.com"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="reg-password"
                    {...registerForm.register('password')}
                    type={showRegPwd ? 'text' : 'password'}
                    className="input pl-9 pr-10"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    tabIndex={-1}
                  >
                    {showRegPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-red-500 text-xs mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/60 rounded-lg px-3 py-2 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 flex-shrink-0 text-brand-500" />
                Your account will be created as a <strong className="text-gray-600 dark:text-gray-400">client</strong> and linked to your company.
              </p>

              <button
                id="register-submit"
                type="submit"
                disabled={registerForm.formState.isSubmitting}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                {registerForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
