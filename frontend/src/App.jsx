import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import PublicHome from './pages/public/Home.jsx';
import PublicCars from './pages/public/Cars.jsx';
import PublicCarDetail from './pages/public/CarDetail.jsx';
import PublicFavorites from './pages/public/Favorites.jsx';
import PublicEmployees from './pages/public/Employees.jsx';
import Login from './pages/dashboard/Login.jsx';
import DashboardHome from './pages/dashboard/Home.jsx';
import Users from './pages/dashboard/Users.jsx';
import Permissions from './pages/dashboard/Permissions.jsx';
import Cars from './pages/dashboard/Cars.jsx';
import AddCar from './pages/dashboard/AddCar.jsx';
import CarDetail from './pages/dashboard/CarDetail.jsx';
import Settings from './pages/dashboard/Settings.jsx';
import Monitor from './pages/dashboard/Monitor.jsx';

export default function App() {
  return (
    <AuthProvider>
     <SocketProvider>
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route index               element={<PublicHome />} />
          <Route path="cars"         element={<PublicCars />} />
          <Route path="cars/:id"     element={<PublicCarDetail />} />
          <Route path="favorites"    element={<PublicFavorites />} />
          <Route path="employees"    element={<PublicEmployees />} />
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
          <Route path="monitor"           element={<Monitor />} />
          {/* Phase 5+: financial, reports, archive */}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
     </SocketProvider>
    </AuthProvider>
  );
}
