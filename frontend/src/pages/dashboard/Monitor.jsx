import { useCallback, useEffect, useState } from 'react';
import { Users, Phone, Activity, Hourglass, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useSocketEvent } from '../../context/SocketContext.jsx';

const STATUS_STYLES = {
  available: { label: 'متاح',   cls: 'bg-primary-light text-primary',  dot: 'bg-primary' },
  busy:      { label: 'مشغول',  cls: 'bg-accent/10 text-accent',       dot: 'bg-accent' },
  offline:   { label: 'مش متاح', cls: 'bg-gray-100 text-text-muted',    dot: 'bg-text-muted' },
};

export default function Monitor() {
  const [data, setData] = useState({ employees: [], queueWaiting: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const { data: res } = await api.get('/users/monitor');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Live: employee status changes → update one card; session events → reload affected employee.
  useSocketEvent('employee:status_changed', ({ employeeId, status }) => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => e.id === employeeId ? { ...e, status } : e),
    }));
  });
  useSocketEvent('session:ended',    () => { reload(); }, [reload]);
  useSocketEvent('queue:updated',    () => { reload(); }, [reload]);
  useSocketEvent('contact_request:accepted', () => { reload(); }, [reload]);

  if (loading) return <div dir="rtl" className="text-text-muted text-center py-10"><Loader2 className="animate-spin inline-block" size={16} /> جاري التحميل…</div>;
  if (error) return <div dir="rtl" className="text-error text-center py-10">{error}</div>;

  const available = data.employees.filter((e) => e.status === 'available').length;
  const busy      = data.employees.filter((e) => e.status === 'busy').length;
  const offline   = data.employees.filter((e) => e.status === 'offline').length;

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Activity size={22} /> مراقبة الموظفين
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">
          نظرة لحظية على الموظفين والجلسات الشغالة.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users size={16} />}      label="إجمالي الموظفين" value={data.employees.length} />
        <StatCard icon={<div className="w-2 h-2 rounded-full bg-primary" />} label="متاحين" value={available} color="text-primary" />
        <StatCard icon={<div className="w-2 h-2 rounded-full bg-accent" />}  label="مشغولين" value={busy} color="text-accent" />
        <StatCard icon={<Hourglass size={16} />}  label="قائمة الانتظار" value={data.queueWaiting} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.employees.map((e) => {
          const style = STATUS_STYLES[e.status] ?? STATUS_STYLES.offline;
          return (
            <div key={e.id} className="bg-surface border border-border-muted rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">{e.fullName?.[0] ?? 'م'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{e.fullName}</p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${style.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </div>
              </div>

              {e.activeSessions?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {e.activeSessions.map((s) => (
                    <div key={s.id} className="bg-background rounded-md px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-text-primary truncate">{s.buyerName}</span>
                        <a href={`tel:${s.buyerPhone}`} className="text-primary font-mono inline-flex items-center gap-1">
                          <Phone size={10} /> {s.buyerPhone}
                        </a>
                      </div>
                      {s.interestedCar && (
                        <p className="text-text-muted mt-0.5">
                          {s.interestedCar.carType} {s.interestedCar.model}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.employees.length === 0 && (
        <div className="bg-surface border border-border-muted rounded-md p-8 text-center text-text-muted">
          مفيش موظفين مسجّلين.
        </div>
      )}

      {/* Hidden marker — prevents unused import warning when list is empty. */}
      <span className="sr-only">{offline}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface border border-border-muted rounded-md p-3">
      <div className="flex items-center gap-2 text-text-muted text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
