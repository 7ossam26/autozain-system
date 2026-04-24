import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldCheck, Car, BarChart2,
  Settings, Archive, Activity, DollarSign,
  ChevronRight, ChevronLeft, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import MobileNav from './MobileNav.jsx';

const NAV_ITEMS = [
  { to: '/dashboard',           label: 'الرئيسية',      icon: LayoutDashboard, end: true,  module: null },
  { to: '/dashboard/users',     label: 'المستخدمين',    icon: Users,           end: false, module: 'users_view' },
  { to: '/dashboard/permissions', label: 'الصلاحيات',  icon: ShieldCheck,     end: false, module: 'permissions_manage' },
  { to: '/dashboard/cars',      label: 'العربيات',      icon: Car,             end: false, module: 'cars_view' },
  { to: '/dashboard/financial', label: 'الماليات',      icon: DollarSign,      end: false, module: 'financial_view' },
  { to: '/dashboard/reports',   label: 'التقارير',      icon: BarChart2,       end: false, module: 'reports_view' },
  { to: '/dashboard/monitor',   label: 'مراقبة الموظفين', icon: Activity,      end: false, module: 'employee_monitor' },
  { to: '/dashboard/archive',   label: 'الأرشيف',       icon: Archive,         end: false, module: 'archive_view' },
  { to: '/dashboard/settings',  label: 'الإعدادات',     icon: Settings,        end: false, module: 'settings_view' },
];

function canSeeItem(item, user) {
  if (!item.module) return true;
  if (user?.role?.name === 'superadmin') return true;
  return user?.permissions?.[item.module] === true;
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/dashboard/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter((item) => canSeeItem(item, user));

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center mb-8 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="text-xl font-bold text-primary">أوتوزين</span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-sm hover:bg-background text-text-secondary"
          title={collapsed ? 'توسيع' : 'تصغير'}
        >
          {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-primary-light text-primary'
                   : 'text-text-secondary hover:bg-background hover:text-text-primary'
                 }
                 ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={`mt-4 pt-4 border-t border-border-muted ${collapsed ? 'text-center' : ''}`}>
        {!collapsed && (
          <div className="mb-2 px-1">
            <p className="text-sm font-medium text-text-primary truncate">{user?.fullName}</p>
            <span className="inline-block text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full mt-0.5">
              {user?.role?.displayNameAr}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 text-sm text-text-secondary hover:text-error transition-colors px-1 py-1 rounded-sm w-full
                      ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-surface border-l border-border-muted p-4 transition-all duration-200 shrink-0
                    ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-surface border-l border-border-muted p-4 z-40 flex flex-col
                    transition-transform duration-200 md:hidden
                    ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-surface border-b border-border-muted h-14 flex items-center px-4 gap-3 shrink-0">
          <button
            className="md:hidden p-1.5 rounded-sm hover:bg-background text-text-secondary"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-text-primary leading-tight">{user?.fullName}</p>
              <span className="text-xs text-text-muted">{user?.role?.displayNameAr}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
              <span className="text-primary font-bold text-sm">
                {user?.fullName?.[0] || 'م'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 pb-24 md:pb-6 overflow-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <MobileNav items={visibleItems} />
      </div>
    </div>
  );
}
