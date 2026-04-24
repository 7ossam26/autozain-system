import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';

const TABS = [
  { to: '/dashboard/financial/deposits', label: 'طلبات العربون' },
  { to: '/dashboard/financial/pending',  label: 'بيعات معلقة' },
];

export default function Financial() {
  const { pathname } = useLocation();
  const isBase = pathname === '/dashboard/financial' || pathname === '/dashboard/financial/';

  if (isBase) {
    return <Navigate to="/dashboard/financial/deposits" replace />;
  }

  return (
    <div dir="rtl">
      {/* Sub-nav tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-5 py-2.5 text-sm font-medium border-b-2 transition-colors
               ${isActive
                 ? 'border-primary text-primary'
                 : 'border-transparent text-text-secondary hover:text-text-primary'
               }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
