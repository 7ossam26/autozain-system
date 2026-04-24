import { useCallback, useEffect, useState } from 'react';
import { Users, TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { formatNumber } from '../../utils/formatters.js';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';

const STATUS_STYLES = {
  available: { label: 'متاح',    cls: 'bg-primary-light text-primary', dot: 'bg-primary' },
  busy:      { label: 'مشغول',   cls: 'bg-accent/10 text-accent',      dot: 'bg-accent' },
  offline:   { label: 'مش متاح', cls: 'bg-gray-100 text-text-muted',   dot: 'bg-gray-400' },
};

export default function Team() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users/team-stats');
      setEmployees(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const totals = employees.reduce(
    (acc, e) => ({
      sessions: acc.sessions + e.totalSessions,
      accepted: acc.accepted + e.acceptedSessions,
      rejected: acc.rejected + e.rejectedSessions,
    }),
    { sessions: 0, accepted: 0, rejected: 0 },
  );

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <TrendingUp size={22} />
          إحصائيات الفريق
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          أداء كل موظف — عدد الجلسات والاستجابات
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-error rounded-sm p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Summary row */}
      {!loading && employees.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <SummaryCard icon={<Activity size={16} />}    label="إجمالي الجلسات" value={totals.sessions} />
          <SummaryCard icon={<TrendingUp size={16} />}  label="مقبولة"          value={totals.accepted}  color="text-success" />
          <SummaryCard icon={<TrendingDown size={16} />} label="مرفوضة"         value={totals.rejected}  color="text-error" />
        </div>
      )}

      {/* Employee cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-surface border border-border-muted rounded-md p-10 text-center">
          <Users size={40} className="mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-secondary font-medium">مفيش موظفين مسجّلين</p>
          <p className="text-text-muted text-xs mt-1">أضف موظفين من صفحة المستخدمين</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {employees.map((e) => <EmployeeCard key={e.id} employee={e} />)}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ employee: e }) {
  const style = STATUS_STYLES[e.status] ?? STATUS_STYLES.offline;
  const acceptRate = e.totalSessions > 0
    ? Math.round((e.acceptedSessions / e.totalSessions) * 100)
    : null;

  return (
    <div className="bg-surface border border-border-muted rounded-md p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
          <span className="text-primary font-bold">{e.fullName?.[0] ?? 'م'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary truncate">{e.fullName}</p>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-0.5 ${style.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <StatItem label="جلسات" value={e.totalSessions} />
        <StatItem label="مقبولة" value={e.acceptedSessions} color="text-success" />
        <StatItem label="مرفوضة" value={e.rejectedSessions} color="text-error" />
      </div>

      {/* Accept rate bar */}
      {e.totalSessions > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>نسبة القبول</span>
            <span>{acceptRate}%</span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${acceptRate}%` }}
            />
          </div>
        </div>
      )}

      {e.totalSessions === 0 && (
        <p className="text-center text-text-muted text-xs mt-3">لم يستقبل أي طلبات بعد</p>
      )}
    </div>
  );
}

function StatItem({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-background rounded-sm py-2">
      <p className={`text-xl font-bold ${color}`}>{formatNumber(value)}</p>
      <p className="text-text-muted text-xs">{label}</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface border border-border-muted rounded-md p-3">
      <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{formatNumber(value)}</p>
    </div>
  );
}
