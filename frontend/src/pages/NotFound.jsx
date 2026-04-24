import { Link, useNavigate } from 'react-router-dom';
import { Car, Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center" dir="rtl">
      <div className="mb-6">
        <div className="relative inline-block">
          <span className="text-9xl font-black text-primary/10 select-none">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Car size={48} className="text-primary" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-3">الصفحة دي مش موجودة</h1>
      <p className="text-text-secondary max-w-sm mb-8">
        الرابط اللي دخلته ممكن يكون غلط أو الصفحة اتشالت.
        جرّب ترجع للرئيسية أو تدور على العربيات.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 border border-border-muted rounded-sm text-sm text-text-secondary hover:bg-surface transition-colors"
        >
          <ArrowRight size={16} />
          الصفحة السابقة
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm hover:bg-primary-dark transition-colors"
        >
          <Home size={16} />
          الرئيسية
        </Link>
        <Link
          to="/cars"
          className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-sm text-sm hover:bg-primary-light transition-colors"
        >
          <Car size={16} />
          شوف العربيات
        </Link>
      </div>
    </div>
  );
}
