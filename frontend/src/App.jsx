import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import PublicHome from './pages/public/Home.jsx';
import Login from './pages/dashboard/Login.jsx';
import DashboardHome from './pages/dashboard/Home.jsx';
import Users from './pages/dashboard/Users.jsx';
import Permissions from './pages/dashboard/Permissions.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route index element={<PublicHome />} />
        </Route>

        {/* Login — no layout, no auth */}
        <Route path="/dashboard/login" element={<Login />} />

        {/* Dashboard — auth required */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index     element={<DashboardHome />} />
          <Route path="users"       element={<Users />} />
          <Route path="permissions" element={<Permissions />} />
          {/* Phase 2+: cars, settings, financial, reports, monitor, archive */}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
