import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Lock } from 'lucide-react';
import { api } from '../../../services/api.js';
import { formatEGP } from '../../../utils/formatters.js';
import { looksLikeEgyptianMobile } from '../../../utils/validators.js';
import { useSocketEvent } from '../../../context/SocketContext.jsx';

const PAYMENT_OPTIONS = [
  { value: '',         label: 'اختياري' },
  { value: 'كاش',     label: 'كاش' },
  { value: 'تحويل',   label: 'تحويل بنكي' },
];

function intInput(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function CloseSaleModal({ car, defaultCommission, taxPercentage, onClose, onDone }) {
  const [form, setForm] = useState({
    finalSalePrice:     '',
    sellerReceived:     '',
    employeeCommission: String(defaultCommission ?? 0),
    buyerName:          car.deposits?.[0]?.buyerName ?? '',
    buyerPhone:         car.deposits?.[0]?.buyerPhone ?? '',
    paymentMethod:      '',
    notes:              '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const finalPrice  = intInput(form.finalSalePrice);
  const sellerRec   = intInput(form.sellerReceived);
  const commission  = intInput(form.employeeCommission);
  const taxPct      = Number(taxPercentage ?? 0);

  const dealershipRevenue = finalPrice - sellerRec;
  const taxAmount         = Math.round(dealershipRevenue * taxPct / 100);
  const netProfit         = dealershipRevenue - taxAmount - commission;

  const phoneWarning =
    form.buyerPhone && !looksLikeEgyptianMobile(form.buyerPhone)
      ? 'الرقم ممكن يكون غلط — راجعه'
      : '';

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  // Enforce integer-only input
  function onIntChange(field) {
    return (e) => {
      const v = e.target.value.replace(/[^0-9]/g, '');
      setForm((f) => ({ ...f, [field]: v }));
    };
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!form.buyerName.trim() || !form.buyerPhone.trim()) {
      setError('اسم المشتري ورقمه مطلوبين');
      return;
    }
    if (finalPrice <= 0) {
      setError('السعر النهائي لازم يكون أكبر من صفر');
      return;
    }
    if (sellerRec < 0) {
      setError('المبلغ للبائع لا يمكن أن يكون سالباً');
      return;
    }
    if (commission < 0) {
      setError('العمولة لا يمكن أن تكون سالبة');
      return;
    }

    setLoading(true);
    try {
      await api.post('/sales', {
        car_id:              car.id,
        final_sale_price:    finalPrice,
        seller_received:     sellerRec,
        employee_commission: commission,
        employee_id:         car.addedByUser?.id,
        buyer_name:          form.buyerName.trim(),
        buyer_phone:         form.buyerPhone.trim(),
        payment_method:      form.paymentMethod || undefined,
        notes:               form.notes.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'حصل خطأ أثناء قفل البيعة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-surface rounded-md shadow-xl w-full max-w-xl my-4"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            قفل البيعة
          </h3>
          <p className="text-text-secondary text-sm mt-0.5">
            {car.carType} {car.model} — {car.plateNumber}
          </p>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {/* Car info strip */}
          <div className="grid grid-cols-3 gap-3 bg-background rounded-sm p-3 text-sm">
            <div>
              <span className="text-text-muted block text-xs">سعر العرض</span>
              <span className="font-semibold">{formatEGP(car.listingPrice)}</span>
            </div>
            <div>
              <span className="text-text-muted block text-xs">الموظف</span>
              <span className="font-medium">{car.addedByUser?.fullName}</span>
            </div>
            <div>
              <span className="text-text-muted block text-xs">العربون المدفوع</span>
              <span className="font-medium">{formatEGP(car.deposits?.[0]?.depositAmount ?? 0)}</span>
            </div>
          </div>

          {/* Price fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                السعر النهائي <span className="text-error">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.finalSalePrice}
                onChange={onIntChange('finalSalePrice')}
                required
                placeholder="0"
                className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                المبلغ للبائع <span className="text-error">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.sellerReceived}
                onChange={onIntChange('sellerReceived')}
                required
                placeholder="0"
                className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium mb-1">عمولة الموظف</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.employeeCommission}
              onChange={onIntChange('employeeCommission')}
              placeholder="0"
              className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Auto-calc display */}
          {finalPrice > 0 && (
            <div className="grid grid-cols-3 gap-2 bg-primary-light/30 rounded-sm p-3 text-sm">
              <div>
                <span className="text-text-muted block text-xs">نصيب المعرض</span>
                <span className={`font-bold ${dealershipRevenue < 0 ? 'text-error' : 'text-primary'}`}>
                  {formatEGP(dealershipRevenue)}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">الضريبة ({taxPct}%)</span>
                <span className="font-medium">{formatEGP(taxAmount)}</span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">صافي الربح</span>
                <span className={`font-bold ${netProfit < 0 ? 'text-error' : ''}`}>
                  {formatEGP(netProfit)}
                </span>
              </div>
            </div>
          )}

          {/* Buyer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                اسم المشتري <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.buyerName}
                onChange={set('buyerName')}
                required
                className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                رقم المشتري <span className="text-error">*</span>
              </label>
              <input
                type="tel"
                value={form.buyerPhone}
                onChange={set('buyerPhone')}
                required
                className={`w-full border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary
                  ${phoneWarning ? 'border-warning' : 'border-border'}`}
              />
              {phoneWarning && <p className="text-xs text-warning mt-0.5">{phoneWarning}</p>}
            </div>
          </div>

          {/* Payment + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
              <select
                value={form.paymentMethod}
                onChange={set('paymentMethod')}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات</label>
              <input
                type="text"
                value={form.notes}
                onChange={set('notes')}
                className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-sm border border-border hover:bg-background"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm rounded-sm bg-primary hover:bg-primary-dark text-white font-medium disabled:opacity-60"
            >
              {loading ? 'جاري...' : 'قفل البيعة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  sold:         'bg-blue-100 text-blue-700',
};
const STATUS_LABELS = {
  deposit_paid: 'عربون',
  sold:         'مباعة',
};

export default function PendingSales() {
  const [cars, setCars]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [modal, setModal]           = useState(null); // car object
  const [defaultCommission, setDefaultCommission] = useState(0);
  const [taxPercentage, setTaxPercentage]         = useState(0);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/sales/pending');
      setCars(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'حصل خطأ أثناء التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch financial settings once on mount
  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      const financial = data.data?.financial ?? [];
      const commission = financial.find((s) => s.key === 'default_commission')?.value ?? 0;
      const tax        = financial.find((s) => s.key === 'tax_percentage')?.value ?? 0;
      setDefaultCommission(Number(commission));
      setTaxPercentage(Number(tax));
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Refresh on car status change
  useSocketEvent('car:status_changed', () => { fetchPending(); }, [fetchPending]);

  function onSaleDone() {
    setModal(null);
    fetchPending();
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">بيعات تستنى تقفيل</h1>
          <p className="text-text-secondary text-sm mt-0.5">{cars.length} عربية</p>
        </div>
        <button onClick={fetchPending} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-sm hover:bg-background">
          <RefreshCw size={15} />
          تحديث
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-error text-sm rounded-sm p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">جاري التحميل...</div>
      ) : cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-2">
          <Lock size={32} className="text-border" />
          <p>مفيش بيعات معلقة</p>
        </div>
      ) : (
        <div className="bg-surface rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-right px-4 py-3 font-semibold">العربية</th>
                <th className="text-right px-4 py-3 font-semibold">الموظف</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold">العربون</th>
                <th className="text-right px-4 py-3 font-semibold">المشتري</th>
                <th className="text-right px-4 py-3 font-semibold">آخر تحديث</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {cars.map((car, idx) => {
                const deposit = car.deposits?.[0];
                return (
                  <tr key={car.id} className={idx % 2 === 1 ? 'bg-background/50' : ''}>
                    <td className="px-4 py-3 font-medium">
                      {car.carType} {car.model}
                      <span className="block text-xs text-text-muted">{car.plateNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{car.addedByUser?.fullName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[car.status]}`}>
                        {STATUS_LABELS[car.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-accent font-medium">
                      {deposit ? formatEGP(deposit.depositAmount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {deposit ? (
                        <>
                          {deposit.buyerName}
                          <span className="block text-xs text-text-muted">{deposit.buyerPhone}</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {new Date(car.updatedAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setModal(car)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-sm hover:bg-primary-dark font-medium"
                      >
                        <Lock size={12} />
                        قفل البيعة
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <CloseSaleModal
          car={modal}
          defaultCommission={defaultCommission}
          taxPercentage={taxPercentage}
          onClose={() => setModal(null)}
          onDone={onSaleDone}
        />
      )}
    </div>
  );
}
