import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useRealtime } from '../../hooks/useRealtime';
import { PasswordSetupModal } from '../PasswordSetupModal';

export function Layout() {
  useRealtime();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
      <PasswordSetupModal />
    </div>
  );
}
