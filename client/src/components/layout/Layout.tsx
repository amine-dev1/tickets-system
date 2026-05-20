import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useRealtime } from '../../hooks/useRealtime';

export function Layout() {
  useRealtime();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
