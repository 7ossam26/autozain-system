import { useCallback, useEffect, useState } from 'react';
import { UserCircle2, Hourglass } from 'lucide-react';
import { publicApi } from '../../services/publicApi.js';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import ContactRequestModal from '../../components/shared/ContactRequestModal.jsx';
import RequestConfirmation from '../../components/shared/RequestConfirmation.jsx';
import QueueModal from '../../components/shared/QueueModal.jsx';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [buyerCanAttachCar, setBuyerCanAttachCar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // employee for contact modal
  const [confirmation, setConfirmation] = useState(null); // { id, timeoutMinutes }
  const [queueOpen, setQueueOpen] = useState(false);
  const [queued, setQueued] = useState(null); // { id }

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await publicApi.get('/employees');
      setEmployees(data.data ?? []);
      setBuyerCanAttachCar(data.meta?.buyerCanAttachCar === true);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // Live status updates
  useSocketEvent('employee:status_changed', ({ employeeId, status }) => {
    setEmployees((prev) => {
      const exists = prev.find((e) => e.id === employeeId);
      if (!exists) {
        // New employee came online — re-fetch to get full profile
        if (status === 'available' || status === 'busy') fetchEmployees();
        return prev;
      }
      if (status === 'offline') return prev.filter((e) => e.id !== employeeId);
      return prev.map((e) => e.id === employeeId ? { ...e, status } : e);
    });
  }, [fetchEmployees]);

  const anyAvailable = employees.some((e) => e.status === 'available');

  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 text-center">
        <UserCircle2 size={40} className="mx-auto text-primary mb-2" />
        <h1 className="text-2xl font-bold text-text-primary">تواصل مع موظف</h1>
        <p className="text-text-secondary text-sm mt-1">
          اختار موظف متاح واحنا هنرجعلك في أقرب وقت.
        </p>
      </div>

      {loading && (
        <div className="text-center text-text-muted py-12">جاري التحميل…</div>
      )}

      {!loading && employees.length === 0 && (
        <EmptyState onJoinQueue={() => setQueueOpen(true)} />
      )}

      {!loading && employees.length > 0 && (
        <div className="space-y-3">
          {employees.map((e) => (
            <EmployeeCard
              key={e.id}
              employee={e}
              onContact={() => setSelected(e)}
            />
          ))}

          {!anyAvailable && (
            <div className="bg-surface border border-border-muted rounded-md p-5 text-center mt-4">
              <p className="text-text-secondary mb-3">
                كل الموظفين مشغولين دلوقتي.
              </p>
              <button
                onClick={() => setQueueOpen(true)}
                className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
              >
                <Hourglass size={14} /> دخول قائمة الانتظار
              </button>
            </div>
          )}
        </div>
      )}

      {selected && !confirmation && (
        <ContactRequestModal
          employee={selected}
          buyerCanAttachCar={buyerCanAttachCar}
          onClose={() => setSelected(null)}
          onSubmitted={(info) => {
            setSelected(null);
            setConfirmation(info);
          }}
        />
      )}

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmation(null)} />
          <div className="relative w-full max-w-md">
            <RequestConfirmation
              timeoutMinutes={confirmation.timeoutMinutes ?? 5}
              onDone={() => setConfirmation(null)}
            />
            <div className="text-center mt-3">
              <button
                onClick={() => setConfirmation(null)}
                className="text-xs text-white/90 underline"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {queueOpen && !queued && (
        <QueueModal
          onClose={() => setQueueOpen(false)}
          onJoined={(entry) => {
            setQueueOpen(false);
            setQueued(entry);
          }}
        />
      )}

      {queued && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQueued(null)} />
          <div className="relative bg-surface w-full max-w-md rounded-md shadow-lg p-6 text-center">
            <Hourglass size={40} className="mx-auto text-accent mb-3" />
            <h2 className="text-xl font-bold text-text-primary mb-1">اتسجّلت في قائمة الانتظار</h2>
            <p className="text-sm text-text-secondary mb-4">
              هنتواصل معاك أول ما حد من الموظفين يفضى.
            </p>
            <button
              onClick={() => setQueued(null)}
              className="text-sm text-primary font-medium hover:underline"
            >
              تمام
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ employee, onContact }) {
  const isBusy = employee.status === 'busy';
  return (
    <div className="bg-surface border border-border-muted rounded-md p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center shrink-0">
        <span className="text-primary font-bold">{employee.fullName?.[0] ?? 'م'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">{employee.fullName}</p>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1
          ${isBusy
            ? 'bg-accent/10 text-accent'
            : 'bg-primary-light text-primary'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-accent' : 'bg-primary'}`} />
          {isBusy ? 'مشغول' : 'متاح'}
        </span>
      </div>
      <button
        type="button"
        onClick={onContact}
        disabled={isBusy}
        className="shrink-0 bg-primary text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
      >
        تواصل
      </button>
    </div>
  );
}

function EmptyState({ onJoinQueue }) {
  return (
    <div className="bg-surface border border-border-muted rounded-md p-8 text-center">
      <UserCircle2 size={40} className="mx-auto text-text-muted mb-3" />
      <p className="text-text-primary font-medium mb-1">مفيش موظفين متاحين دلوقتي</p>
      <p className="text-sm text-text-secondary mb-4">
        سيب اسمك ورقمك وهنبلغك أول ما حد يفضى.
      </p>
      <button
        onClick={onJoinQueue}
        className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
      >
        <Hourglass size={14} /> دخول قائمة الانتظار
      </button>
    </div>
  );
}
