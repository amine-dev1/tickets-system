import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute, AdminRoute } from './guards';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import NewTicket from './pages/NewTicket';
import TicketDetailPage from './pages/TicketDetail';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminTickets from './pages/Admin/AdminTickets';
import AdminUsers from './pages/Admin/AdminUsers';
import { PrestatairesList } from './pages/Admin/PrestatairesList';
import { PrestatairesForm } from './pages/Admin/PrestatairesForm';
import { PrestatairesDetail } from './pages/Admin/PrestatairesDetail';
import { MissionsList } from './pages/Admin/MissionsList';
import { MissionsForm } from './pages/Admin/MissionsForm';
import { MissionsDetail } from './pages/Admin/MissionsDetail';
import { CompaniesList } from './pages/Admin/CompaniesList';
import { CompanyForm } from './pages/Admin/CompanyForm';
import { CompanyDetail } from './pages/Admin/CompanyDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function AppRoutes() {
  useAuth(); // Initialize auth listener

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Client routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          {/* Client Prestataires CRUD */}
          <Route path="/prestataires" element={<PrestatairesList />} />
          <Route path="/prestataires/new" element={<PrestatairesForm />} />
          <Route path="/prestataires/:id" element={<PrestatairesDetail />} />
          <Route path="/prestataires/:id/edit" element={<PrestatairesForm />} />
          {/* Client Missions CRUD */}
          <Route path="/missions" element={<MissionsList />} />
          <Route path="/missions/new" element={<MissionsForm />} />
          <Route path="/missions/:id" element={<MissionsDetail />} />
          <Route path="/missions/:id/edit" element={<MissionsForm />} />
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/admin/users" element={<AdminUsers />} />
           {/* Prestataires CRUD */}
          <Route path="/admin/prestataires" element={<PrestatairesList />} />
          <Route path="/admin/prestataires/new" element={<PrestatairesForm />} />
          <Route path="/admin/prestataires/:id" element={<PrestatairesDetail />} />
          <Route path="/admin/prestataires/:id/edit" element={<PrestatairesForm />} />
          {/* Missions CRUD */}
          <Route path="/admin/missions" element={<MissionsList />} />
          <Route path="/admin/missions/new" element={<MissionsForm />} />
          <Route path="/admin/missions/:id" element={<MissionsDetail />} />
          <Route path="/admin/missions/:id/edit" element={<MissionsForm />} />
          {/* Companies CRUD */}
          <Route path="/admin/companies" element={<CompaniesList />} />
          <Route path="/admin/companies/new" element={<CompanyForm />} />
          <Route path="/admin/companies/:id" element={<CompanyDetail />} />
          <Route path="/admin/companies/:id/edit" element={<CompanyForm />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
