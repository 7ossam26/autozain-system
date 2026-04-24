import { useCallback, useEffect, useState } from 'react';
import { Phone, CheckCircle2, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';

const OUTCOMES = [
  { value: 'sold',        label: 'اتباعت' },
  { value: 'interested',  label: 'مهتم' },
  { value: 'no_answer',   label: 'ما ردش' },
  { value: 'cancelled',   label: 'اتلغى' },
];

export default function ActiveSessionPanel() {
  const { user, refetchUser } = useAuth();
  const [active, setActive] = useState(null);
  const [working, setWorking] = useState(false);
  const [suggestEnd, setSuggestEnd] = useState(false);
  const [outcome, setOutcome] = useState('interested');

  const isEmployee = user?.role?.name === 'employee';

  const reload = useCallback(async () => {
    if (!isEmployee) return;
    try {
      const { data } = await api.get('/contact-requests/me');
      setActive(data.data?.active?.[0] ?? null);
    } catch {
      setActive(null);
    }
  }, [isEmployee]);

  useEffect(() => { reload(); }, [reload]);

  useSocketEvent('contact_request:accepted', () => { reload(); }, [reload]);
  useSocketEvent('session:ended', () => { setActive(null); setSuggestEnd(false); refetchUser?.(); }, []);

  useSocketEvent('session:suggest_end', ({ requestId }) => {
    if (active && active.id === requestId) setSuggestEnd(true);
  }, [active]);

  if (!isEmployee || !active) return null;

  async function endSession() {
    setWorking(true);
    try {
      await api.patch(`/contact-requests/${active.id}/complete`, { outcome });
      setActive(null);
      setSuggestEnd(false);
      refetchUser?.();
    } catch {
      /* ignore */
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="bg-surface border border-primary/40 rounded-md p-4 mb-6 shadow-sm" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-primary font-medium mb-1">جلسة شغالة</p>
          <p className="font-bold text-text-primary truncate">{active.buyerName}</p>
          <a
            href={`tel:${active.buyerPhone}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary mt-1 hover:text-primary"
          >
            <Phone size={13} /> <span className="font-mono">{active.buyerPhone}</span>
          </a>
          {active.interestedCar && (
            <p className="text-xs text-text-muted mt-1">
              مهتم بـ: {active.interestedCar.carType} {active.interestedCar.model}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="text-xs border border-border-muted rounded-sm px-2 py-1 bg-surface"
          >
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={endSession}
            disabled={working}
            className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-sm hover:bg-primary-dark disabled:opacity-60"
          >
            {working ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            إنهاء الجلسة
          </button>
        </div>
      </div>

      {suggestEnd && (
        <div className="mt-3 flex items-center justify-between gap-2 bg-primary-light text-primary text-xs rounded-sm px-3 py-2">
          <span>غيّرت حالة العربية — عايز تنهي الجلسة؟</span>
          <button
            onClick={() => setSuggestEnd(false)}
            className="p-0.5 text-primary hover:opacity-80"
            aria-label="إخفاء"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
