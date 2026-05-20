import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Zap, Mail, Lock, User, Building2, CheckCircle, Shield, Clock } from 'lucide-react';

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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const handleLogin = async (data: LoginForm) => {
    setError('');
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) { setError(error.message); return; }
    navigate('/dashboard');
  };

  const handleRegister = async (data: RegisterForm) => {
    setError('');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (signUpError) { setError(signUpError.message); return; }

    if (authData.user) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        company: data.company,
        role: 'client',
      });
    }
    navigate('/dashboard');
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex dark:bg-gray-950">
      {/* ── Left branding panel ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-800/20 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">TicketFlow</span>
        </div>

        {/* Main copy */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Support tickets,<br />
              <span className="text-brand-400">done right.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              A professional platform to manage, track, and resolve support requests — built for agencies and their clients.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-brand-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative text-slate-600 text-xs">
          © {new Date().getFullYear()} TicketFlow. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
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
          <div className="flex bg-gray-200/70 dark:bg-gray-800/50 rounded-lg p-1 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
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
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
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
                    type="password"
                    className="input pl-9"
                    placeholder="••••••••"
                  />
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
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
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
                    type="password"
                    className="input pl-9"
                    placeholder="Minimum 6 characters"
                  />
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
  );
}
