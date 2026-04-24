import { useState } from 'react';
import { X, Loader2, Hourglass } from 'lucide-react';
import { publicApi } from '../../services/publicApi.js';

const EG_MOBILE_RE = /^(?:\+20|0)1[0125]\d{8}$/;

export default function QueueModal({ onClose, onJoined }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await publicApi.post('/queue', {
        buyer_name: name.trim(),
        buyer_phone: phone.trim(),
      });
      onJoined(data.data);
    } catch (err) {
      const code = err.response?.data?.error_code;
      if (code === 'EMPLOYEES_AVAILABLE') {
        setError('في موظف متاح دلوقتي — اقفل ده وشوف قائمة الموظفين.');
      } else if (code === 'RATE_LIMITED') {
        setError('حاولت كتير — استنى شوية.');
      } else {
        setError(err.response?.data?.message || 'حصل خطأ — حاول تاني.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const phoneWarning = phone && !EG_MOBILE_RE.test(phone.trim())
    ? 'الرقم ممكن يكون غلط — راجعه'
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-md rounded-md shadow-lg p-6">
        <button
          onClick={onClose}
          className="absolute top-3 left-3 p-1 text-text-muted hover:text-text-primary"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-5">
          <Hourglass size={36} className="mx-auto text-accent mb-2" />
          <h2 className="text-xl font-bold text-text-primary">مفيش موظف متاح دلوقتي</h2>
          <p className="text-sm text-text-secondary mt-1">
            سيب اسمك ورقمك وهنبلغك أول ما حد يفضى.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">الاسم</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border-muted rounded-sm px-3 py-2 bg-background focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">رقم الموبايل</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-border-muted rounded-sm px-3 py-2 bg-background focus:outline-none focus:border-primary"
              placeholder="01012345678"
              inputMode="numeric"
            />
            {phoneWarning && <p className="text-xs text-warning mt-1">{phoneWarning}</p>}
          </div>

          {error && (
            <p className="text-error text-sm bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !phone.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-sm font-medium hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'بنسجّلك…' : 'دخول قائمة الانتظار'}
          </button>
        </form>
      </div>
    </div>
  );
}
