import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { Heart, LogIn, Menu, X, UserCircle2 } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites.js';
import { useNumeralSystem } from '../../hooks/useNumeralSystem.js';

const STAFF_LOGIN_LABEL = 'دخول الموظفين';

export default function PublicLayout() {
  const { count } = useFavorites();
  const [mobileOpen, setMobileOpen] = useState(false);
  useNumeralSystem();

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-background">
      <header className="bg-surface border-b border-border-muted sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <LogoPlaceholder />
            أوتوزين
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/" end>الرئيسية</NavItem>
            <NavItem to="/cars">العربيات</NavItem>
            <NavItem to="/favorites">
              <span className="inline-flex items-center gap-1.5">
                <Heart size={15} />
                المفضلة
                {count > 0 && (
                  <span className="bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
            </NavItem>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
            >
              <LogIn size={15} />
              {STAFF_LOGIN_LABEL}
            </Link>
            <Link
              to="/employees"
              className="ml-2 flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <UserCircle2 size={15} />
              تواصل مع موظف
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 text-text-primary"
            aria-label="القائمة"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border-muted bg-surface px-4 py-3 space-y-1">
            <MobileItem to="/" onClick={() => setMobileOpen(false)} end>الرئيسية</MobileItem>
            <MobileItem to="/cars" onClick={() => setMobileOpen(false)}>العربيات</MobileItem>
            <MobileItem to="/favorites" onClick={() => setMobileOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <Heart size={15} />
                المفضلة
                {count > 0 && (
                  <span className="bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
            </MobileItem>
            <Link
              to="/employees"
              onClick={() => setMobileOpen(false)}
              className="block mt-2 text-center bg-primary text-white px-4 py-2.5 rounded-md text-sm font-medium"
            >
              تواصل مع موظف
            </Link>
            <div className="mt-3 pt-3 border-t border-border-muted">
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-background transition-colors"
              >
                <LogIn size={15} />
                {STAFF_LOGIN_LABEL}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-secondary text-white/80 py-6 text-center text-sm" dir="rtl">
        <p className="mb-2">أوتوزين © {new Date().getFullYear()}</p>
        <div className="flex items-center justify-center gap-4 text-white/60 text-xs">
          <Link to="/terms"   className="hover:text-white transition-colors">الشروط والأحكام</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
          <span>·</span>
          <Link to="/dashboard" className="hover:text-white transition-colors">{STAFF_LOGIN_LABEL}</Link>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive ? 'text-primary bg-primary-light' : 'text-text-secondary hover:text-text-primary hover:bg-background'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function MobileItem({ to, end, onClick, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-3 py-2 text-sm font-medium rounded-md ${
          isActive ? 'text-primary bg-primary-light' : 'text-text-secondary hover:bg-background'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function LogoPlaceholder() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="8" width="20" height="10" rx="2" fill="#00C853" />
      <circle cx="7" cy="18" r="2.5" fill="#1A1A2E" />
      <circle cx="17" cy="18" r="2.5" fill="#1A1A2E" />
      <path d="M5 8l2-4h10l2 4" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
