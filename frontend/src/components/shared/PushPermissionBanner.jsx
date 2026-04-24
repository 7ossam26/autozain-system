import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { pushSupported, getPermission, ensurePushSubscription } from '../../services/pushClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function PushPermissionBanner() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(() => (pushSupported() ? getPermission() : 'unsupported'));
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  // Auto-subscribe if already granted.
  useEffect(() => {
    if (!user || user.role?.name !== 'employee') return;
    if (!pushSupported()) return;
    if (getPermission() === 'granted') {
      ensurePushSubscription().catch(() => {});
    }
  }, [user]);

  if (!user || user.role?.name !== 'employee') return null;
  if (!pushSupported()) return null;
  if (permission === 'granted') return null;
  if (permission === 'denied' && dismissed) return null;

  async function enable() {
    setWorking(true);
    setError(null);
    try {
      const res = await ensurePushSubscription();
      if (res.ok) setPermission('granted');
      else if (res.reason === 'DENIED') setPermission('denied');
      else setError('تعذّر تفعيل الإشعارات');
    } catch {
      setError('تعذّر تفعيل الإشعارات');
    } finally {
      setWorking(false);
    }
  }

  const denied = permission === 'denied';

  return (
    <div className={`mb-4 rounded-md border px-4 py-3 flex items-start gap-3 ${
      denied ? 'bg-red-50 border-red-200 text-error' : 'bg-primary-light border-primary/30 text-primary'
    }`} dir="rtl">
      <BellRing size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        {denied ? (
          <>
            الإشعارات متوقفة — لازم تفعّلها من إعدادات المتصفح عشان توصلك طلبات المشترين.
          </>
        ) : (
          <>
            فعّل الإشعارات عشان توصلك طلبات التواصل حتى لو التبويب مش مفتوح.
          </>
        )}
        {error && <p className="text-error text-xs mt-1">{error}</p>}
      </div>
      {!denied && (
        <button
          onClick={enable}
          disabled={working}
          className="shrink-0 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-sm hover:bg-primary-dark disabled:opacity-60"
        >
          {working ? '...' : 'تفعيل'}
        </button>
      )}
      {denied && (
        <button onClick={() => setDismissed(true)} className="shrink-0 text-error/70 hover:text-error">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
