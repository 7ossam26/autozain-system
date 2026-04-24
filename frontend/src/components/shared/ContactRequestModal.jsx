import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { publicApi, publicWriteApi } from '../../services/publicApi.js';

const EG_MOBILE_RE = /^(?:\+20|0)1[0125]\d{8}$/;

export default function ContactRequestModal({ employee, buyerCanAttachCar, onClose, onSubmitted }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [carId, setCarId] = useState('');
  const [cars, setCars] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!buyerCanAttachCar) return;
    publicApi.get('/cars', { params: { limit: 50 } })
      .then(({ data }) => setCars(data.data ?? []))
      .catch(() => setCars([]));
  }, [buyerCanAttachCar]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        buyer_name: name.trim(),
        buyer_phone: phone.trim(),
        employee_id: employee.id,
      };
      if (buyerCanAttachCar && carId) body.car_id = carId;

      const { data } = await publicWriteApi.post('/contact-requests', body);
      onSubmitted({ id: data.data.id, timeoutMinutes: data.data.timeoutMinutes });
    } catch (err) {
      const code = err.response?.data?.error_code;
      if (code === 'RATE_LIMITED') setError('حاولت كتير — استنى شوية وحاول تاني.');
      else if (code === 'EMPLOYEE_NOT_AVAILABLE') setError('الموظف مش متاح دلوقتي — جرّب موظف تاني.');
      else setError(err.response?.data?.message || 'حصل خطأ — حاول تاني.');
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

        <h2 className="text-xl font-bold text-text-primary mb-1">تواصل مع {employee.fullName}</h2>
        <p className="text-sm text-text-secondary mb-5">
          هنبعت طلبك للموظف ويتواصل معاك في أقرب وقت.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">الاسم</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border-muted rounded-sm px-3 py-2 bg-background focus:outline-none focus:border-primary"
              placeholder="الاسم كامل"
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
            {phoneWarning && (
              <p className="text-xs text-warning mt-1">{phoneWarning}</p>
            )}
          </div>

          {buyerCanAttachCar && cars.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">العربية (اختياري)</label>
              <select
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                className="w-full border border-border-muted rounded-sm px-3 py-2 bg-surface focus:outline-none focus:border-primary"
              >
                <option value="">— مفيش —</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.carType} {c.model}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            {submitting ? 'بنبعت الطلب…' : 'إرسال الطلب'}
          </button>
        </form>
      </div>
    </div>
  );
}
