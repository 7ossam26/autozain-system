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
import Cars from './pages/dashboard/Cars.jsx';
import AddCar from './pages/dashboard/AddCar.jsx';
import CarDetail from './pages/dashboard/CarDetail.jsx';
import Settings from './pages/dashboard/Settings.jsx';

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
          <Route index                    element={<DashboardHome />} />
          <Route path="users"             element={<Users />} />
          <Route path="permissions"       element={<Permissions />} />
          <Route path="cars"              element={<Cars />} />
          <Route path="cars/add"          element={<AddCar />} />
          <Route path="cars/:id"          element={<CarDetail />} />
          <Route path="settings"          element={<Settings />} />
          {/* Phase 3+: financial, reports, monitor, archive */}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
