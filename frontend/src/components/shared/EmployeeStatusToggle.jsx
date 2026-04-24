import { useState, useEffect } from 'react';
import { Circle, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const LABELS = {
  available: 'أنا متاح',
  busy: 'مشغول',
  offline: 'مش متاح',
};

export default function EmployeeStatusToggle() {
  const { user, refetchUser } = useAuth();
  const [current, setCurrent] = useState(user?.status ?? 'offline');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setCurrent(user?.status ?? 'offline'); }, [user?.status]);

  // Only employees see this toggle.
  if (!user || user.role?.name !== 'employee') return null;

  async function toggle() {
    if (saving) return;
    setError(null);

    // busy is not directly toggleable by the user
    const next = current === 'available' ? 'offline' : 'available';
    setSaving(true);
    try {
      await api.patch('/users/me/status', { status: next });
      setCurrent(next);
      refetchUser?.();
    } catch (err) {
      const code = err.response?.data?.error_code;
      if (code === 'ACTIVE_SESSION') {
        setError('اقفل الجلسة الشغالة الأول');
      } else {
        setError(err.response?.data?.message || 'فشل تحديث الحالة');
      }
    } finally {
      setSaving(false);
    }
  }

  const isOn = current === 'available';
  const isBusy = current === 'busy';

  const color = isBusy ? 'text-accent' : isOn ? 'text-primary' : 'text-text-muted';
  const dotBg = isBusy ? 'bg-accent' : isOn ? 'bg-primary' : 'bg-text-muted';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saving || isBusy}
        title={isBusy ? 'مشغول في جلسة' : ''}
        className={`inline-flex items-center gap-2 border border-border-muted px-3 py-1.5 rounded-full text-xs font-medium bg-surface hover:bg-background transition-colors disabled:opacity-60 ${color}`}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Circle size={8} className={dotBg} fill="currentColor" />}
        {LABELS[current]}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
