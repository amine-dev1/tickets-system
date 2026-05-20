import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';
import { isAdminRole } from './types';

export function ProtectedRoute() {
  const { user, loading, logout } = useAuthStore();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'client' && !user.company_id) {
    const handleLogout = async () => {
      await logout();
      navigate('/login');
    };

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-100">Compte en attente</h2>
            <p className="text-sm text-gray-400">
              Votre compte est en cours de validation. Vous serez notifié dès que vous serez assigné à une entreprise.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10 mx-auto justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdminRole(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
