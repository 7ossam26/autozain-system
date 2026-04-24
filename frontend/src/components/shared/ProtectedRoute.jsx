import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-text-secondary text-lg">جاري التحميل…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/dashboard/login" state={{ from: location }} replace />;
  }

  return children;
}
