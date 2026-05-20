import { Bell, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { isAdminRole } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-soft dark:border-gray-800/50 dark:bg-gray-950/80">
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-gradient-soft tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`relative flex items-center w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-950 shadow-inner-soft ${
            isDark ? 'bg-gradient-to-r from-brand-700 to-brand-500' : 'bg-gradient-to-r from-gray-200 to-gray-300'
          }`}
        >
          <Sun  className="absolute left-1.5 w-3.5 h-3.5 text-amber-500 transition-opacity duration-300" style={{ opacity: isDark ? 0 : 1 }} />
          <Moon className="absolute right-1.5 w-3.5 h-3.5 text-brand-100 transition-opacity duration-300" style={{ opacity: isDark ? 1 : 0 }} />
          <span
            className={`absolute w-5 h-5 rounded-full bg-white shadow-soft-md transition-all duration-300 ${
              isDark ? 'translate-x-[1.875rem] rotate-180' : 'translate-x-1 rotate-0'
            }`}
          />
        </button>

        <button id="notification-btn" className="btn-ghost relative p-2 rounded-xl">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white animate-pulse dark:ring-gray-950" />
        </button>

        {isAdminRole(user?.role) && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                           bg-gradient-to-r from-brand-100 to-accent-100 text-brand-700 border border-brand-200/60 shadow-soft
                           dark:from-brand-500/15 dark:to-accent-500/15 dark:text-brand-300 dark:border-brand-500/30 dark:shadow-none">
            <ShieldCheck className="w-3 h-3" />
            {user?.role}
          </span>
        )}
      </div>
    </header>
  );
}
