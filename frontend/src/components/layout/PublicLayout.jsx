import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-primary">
            أوتوزين
          </Link>
          <nav className="flex gap-6 text-text-secondary">
            <Link to="/">الرئيسية</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-secondary text-white py-6 text-center text-sm">
        © {new Date().getFullYear()} أوتوزين — كل الحقوق محفوظة
      </footer>
    </div>
  );
}
