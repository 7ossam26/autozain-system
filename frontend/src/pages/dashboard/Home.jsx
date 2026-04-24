import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, Users, DollarSign, Activity, TrendingUp, ChevronLeft,
  Archive, BarChart2, ShieldCheck, Settings,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatEGP, formatNumber } from '../../utils/formatters.js';
import { SkeletonStatCard } from '../../components/ui/Skeleton.jsx';

export default function DashboardHome() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === 'superadmin';
  const isAdmin = user?.role?.name === 'admin';
  const canSeeStats = isSuperAdmin || isAdmin;

  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(canSeeStats);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!canSeeStats) return;
    api.get('/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch(() => setError('فشل تحميل الإحصائيات'))
      .finally(() => setLoading(false));
  }, [canSeeStats]);

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          مرحباً، {user?.fullName}
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          {new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {canSeeStats && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-error text-sm p-3 rounded-sm mb-4">
              {error}
            </div>
          )}

          {/* Main stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <BigStatCard
                  icon={<Car size={20} />}
                  label="العربيات المتاحة"
                  value={formatNumber(stats?.carsAvailable ?? 0)}
                  color="text-primary"
                  bg="bg-primary-light"
                />
                <BigStatCard
                  icon={<TrendingUp size={20} />}
                  label="مباعة هذا الشهر"
                  value={formatNumber(stats?.salesThisMonth ?? 0)}
                  color="text-success"
                  bg="bg-green-50"
                />
                <BigStatCard
                  icon={<Users size={20} />}
                  label="موظفين نشطين"
                  value={formatNumber(stats?.activeEmployees ?? 0)}
                  color="text-accent"
                  bg="bg-accent/10"
                />
                <BigStatCard
                  icon={<DollarSign size={20} />}
                  label="إيرادات الشهر"
                  value={formatEGP(stats?.revenueThisMonth ?? 0)}
                  color="text-secondary"
                  bg="bg-background"
                  small
                />
              </>
            )}
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'إجمالي العربيات', value: stats?.totalCars },
              { label: 'عربون',            value: stats?.carsDepositPaid },
              { label: 'مسحوبة',           value: stats?.carsWithdrawn },
              { label: 'الأرشيف',          value: stats?.carsArchived },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface border border-border-muted rounded-md p-3 text-center">
                <p className="text-text-muted text-xs mb-1">{label}</p>
                <p className="text-xl font-bold text-text-primary">
                  {loading ? '…' : formatNumber(value ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          وصول سريع
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks(user, isSuperAdmin).map((link) => (
            <QuickLink key={link.to} {...link} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BigStatCard({ icon, label, value, color, bg, small = false }) {
  return (
    <div className="bg-surface border border-border-muted rounded-md p-4">
      <div className={`w-9 h-9 rounded-sm ${bg} flex items-center justify-center ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className={`font-bold ${color} ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function QuickLink({ to, icon, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 bg-surface border border-border-muted rounded-md
                 hover:border-primary hover:bg-primary-light/20 transition-all group"
    >
      <div className="p-2 bg-background rounded-sm text-text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary text-sm">{label}</p>
        <p className="text-text-muted text-xs">{desc}</p>
      </div>
      <ChevronLeft size={16} className="text-text-muted shrink-0 group-hover:text-primary transition-colors" />
    </Link>
  );
}

function quickLinks(user, isSuperAdmin) {
  const links = [];
  const has = (perm) => isSuperAdmin || user?.permissions?.[perm];

  if (has('cars_view'))       links.push({ to: '/dashboard/cars',              icon: <Car size={18} />,       label: 'العربيات',          desc: 'إدارة المخزون' });
  if (has('users_view'))      links.push({ to: '/dashboard/users',             icon: <Users size={18} />,     label: 'المستخدمين',        desc: 'إدارة الموظفين' });
  if (has('employee_monitor')) links.push({ to: '/dashboard/monitor',          icon: <Activity size={18} />,  label: 'مراقبة الموظفين',   desc: 'نشاط لحظي' });
  if (has('financial_view'))  links.push({ to: '/dashboard/financial/deposits', icon: <DollarSign size={18} />, label: 'الماليات',         desc: 'عربونات وبيعات' });
  if (has('archive_view'))    links.push({ to: '/dashboard/archive',           icon: <Archive size={18} />,   label: 'الأرشيف',           desc: 'مباعة ومسحوبة' });
  if (has('reports_view'))    links.push({ to: '/dashboard/reports',           icon: <BarChart2 size={18} />, label: 'التقارير',          desc: 'تقارير مالية' });
  if (has('permissions_manage')) links.push({ to: '/dashboard/permissions',    icon: <ShieldCheck size={18} />, label: 'الصلاحيات',      desc: 'إدارة الأدوار' });
  if (has('settings_view'))   links.push({ to: '/dashboard/settings',          icon: <Settings size={18} />,  label: 'الإعدادات',         desc: 'ضبط النظام' });

  return links;
}
