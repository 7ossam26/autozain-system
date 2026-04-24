import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import ErrorBoundary from './components/shared/ErrorBoundary.jsx';
import PublicLayout from './components/layout/PublicLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';

// ── Lazy-loaded page modules ────────────────────────────────────────────────
const PublicHome       = lazy(() => import('./pages/public/Home.jsx'));
const PublicCars       = lazy(() => import('./pages/public/Cars.jsx'));
const PublicCarDetail  = lazy(() => import('./pages/public/CarDetail.jsx'));
const PublicFavorites  = lazy(() => import('./pages/public/Favorites.jsx'));
const PublicEmployees  = lazy(() => import('./pages/public/Employees.jsx'));
const Terms            = lazy(() => import('./pages/public/Terms.jsx'));
const Privacy          = lazy(() => import('./pages/public/Privacy.jsx'));
const NotFound         = lazy(() => import('./pages/NotFound.jsx'));

const Login            = lazy(() => import('./pages/dashboard/Login.jsx'));
const DashboardHome    = lazy(() => import('./pages/dashboard/Home.jsx'));
const Users            = lazy(() => import('./pages/dashboard/Users.jsx'));
const Permissions      = lazy(() => import('./pages/dashboard/Permissions.jsx'));
const Cars             = lazy(() => import('./pages/dashboard/Cars.jsx'));
const AddCar           = lazy(() => import('./pages/dashboard/AddCar.jsx'));
const CarDetail        = lazy(() => import('./pages/dashboard/CarDetail.jsx'));
const Settings         = lazy(() => import('./pages/dashboard/Settings.jsx'));
const Monitor          = lazy(() => import('./pages/dashboard/Monitor.jsx'));
const Archive          = lazy(() => import('./pages/dashboard/Archive.jsx'));
const Team             = lazy(() => import('./pages/dashboard/Team.jsx'));
const Import           = lazy(() => import('./pages/dashboard/Import.jsx'));
const Financial        = lazy(() => import('./pages/dashboard/financial/Financial.jsx'));
const Deposits         = lazy(() => import('./pages/dashboard/financial/Deposits.jsx'));
const PendingSales     = lazy(() => import('./pages/dashboard/financial/PendingSales.jsx'));
const Reports          = lazy(() => import('./pages/dashboard/financial/Reports.jsx'));

// Minimal loading fallback — no layout, just a spinner
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" aria-label="جاري التحميل">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* ── Public site ── */}
                <Route element={<PublicLayout />}>
                  <Route index               element={<PublicHome />} />
                  <Route path="cars"         element={<PublicCars />} />
                  <Route path="cars/:id"     element={<PublicCarDetail />} />
                  <Route path="favorites"    element={<PublicFavorites />} />
                  <Route path="employees"    element={<PublicEmployees />} />
                  <Route path="terms"        element={<Terms />} />
                  <Route path="privacy"      element={<Privacy />} />
                </Route>

                {/* ── Login — no layout, no auth ── */}
                <Route path="/dashboard/login" element={<Login />} />

                {/* ── Dashboard — auth required ── */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index                       element={<DashboardHome />} />
                  <Route path="users"                element={<Users />} />
                  <Route path="permissions"          element={<Permissions />} />
                  <Route path="cars"                 element={<Cars />} />
                  <Route path="cars/add"             element={<AddCar />} />
                  <Route path="cars/import"          element={<Import />} />
                  <Route path="cars/:id"             element={<CarDetail />} />
                  <Route path="settings"             element={<Settings />} />
                  <Route path="monitor"              element={<Monitor />} />
                  <Route path="team"                 element={<Team />} />
                  <Route path="archive"              element={<Archive />} />
                  <Route path="reports"              element={<Reports />} />
                  <Route path="financial"            element={<Financial />}>
                    <Route path="deposits"           element={<Deposits />} />
                    <Route path="pending"            element={<PendingSales />} />
                  </Route>
                </Route>

                {/* ── 404 ── */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
