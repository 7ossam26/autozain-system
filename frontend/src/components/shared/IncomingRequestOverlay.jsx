import { useEffect, useState } from 'react';
import { Phone, Check, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { useAudioAlert } from '../../hooks/useAudioAlert.js';

export default function IncomingRequestOverlay() {
  const { user, refetchUser } = useAuth();
  const { play, vibrate, muted, setMuted } = useAudioAlert();
  const [request, setRequest] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  // Only employees should see this overlay
  const isEmployee = user?.role?.name === 'employee';

  useSocketEvent('contact_request:new', (payload) => {
    if (!isEmployee) return;
    setRequest(payload);
    setError(null);
    play();
    vibrate();
  }, [isEmployee, play, vibrate]);

  useSocketEvent('contact_request:repeat', (payload) => {
    if (!isEmployee) return;
    // If the overlay still shows that request, replay the alert.
    if (request && request.requestId === payload.requestId) {
      play();
      vibrate();
    }
  }, [isEmployee, play, vibrate, request]);

  useSocketEvent('contact_request:timeout', (payload) => {
    if (request && request.requestId === payload.requestId) {
      setRequest(null);
    }
  }, [request]);

  // Fetch any pending request on mount so an employee refreshing their page
  // doesn't miss an in-flight request.
  useEffect(() => {
    if (!isEmployee) return;
    let cancelled = false;
    api.get('/contact-requests/me').then(({ data }) => {
      if (cancelled) return;
      const pending = data.data?.pending?.[0];
      if (pending) {
        setRequest({
          requestId: pending.id,
          buyerName: pending.buyerName,
          buyerPhone: pending.buyerPhone,
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEmployee]);

  if (!isEmployee || !request) return null;

  async function act(action) {
    setWorking(true);
    setError(null);
    try {
      await api.patch(`/contact-requests/${request.requestId}`, { action });
      if (action === 'accept') {
        refetchUser?.();
      }
      setRequest(null);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الإجراء');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-surface w-full max-w-md rounded-md shadow-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-text-muted">طلب تواصل جديد</p>
            <h2 className="text-xl font-bold text-text-primary">{request.buyerName}</h2>
          </div>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="text-xs text-text-muted hover:text-text-primary px-2 py-1 border border-border-muted rounded-full"
            title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
          >
            {muted ? '🔕' : '🔔'}
          </button>
        </div>

        <a
          href={`tel:${request.buyerPhone}`}
          className="flex items-center gap-2 bg-background text-text-primary px-3 py-2 rounded-md mb-4"
        >
          <Phone size={16} className="text-primary" />
          <span className="font-mono text-sm tracking-wide">{request.buyerPhone}</span>
        </a>

        {request.interestedCar && (
          <div className="mb-4 p-3 bg-primary-light text-primary rounded-md text-sm">
            مهتم بـ: <strong>{request.interestedCar.carType} {request.interestedCar.model}</strong>
          </div>
        )}

        {error && <p className="text-error text-sm mb-3">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => act('reject')}
            disabled={working}
            className="flex items-center justify-center gap-1.5 border border-border-muted text-text-primary bg-surface hover:bg-background py-2.5 rounded-md disabled:opacity-60"
          >
            {working ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            رفض
          </button>
          <button
            onClick={() => act('accept')}
            disabled={working}
            className="flex items-center justify-center gap-1.5 bg-primary text-white hover:bg-primary-dark py-2.5 rounded-md disabled:opacity-60"
          >
            {working ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            قبول
          </button>
        </div>
      </div>
    </div>
  );
}
