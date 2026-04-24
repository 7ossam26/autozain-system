import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { api } from '../../../services/api.js';
import { formatEGP } from '../../../utils/formatters.js';
import { useSocketEvent } from '../../../context/SocketContext.jsx';

const STATUS_TABS = [
  { key: '',          label: 'الكل' },
  { key: 'pending',   label: 'معلق' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'rejected',  label: 'مرفوض' },
];

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-primary-light text-primary',
  rejected:  'bg-red-100 text-error',
  refunded:  'bg-gray-100 text-text-secondary',
};

const STATUS_LABELS = {
  pending:   'معلق',
  confirmed: 'مؤكد',
  rejected:  'مرفوض',
  refunded:  'مسترد',
};

function ConfirmDialog({ deposit, action, onClose, onDone }) {
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const isConfirm = action === 'confirm';
  const label     = isConfirm ? 'تأكيد العربون' : 'رفض العربون';
  const btnClass  = isConfirm
    ? 'bg-primary hover:bg-primary-dark text-white'
    : 'bg-error hover:bg-red-700 text-white';

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await api.patch(`/deposits/${deposit.id}`, { action, notes: notes || undefined });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'حصل خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-md shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <h3 className="text-lg font-bold mb-1">{label}</h3>
        <p className="text-text-secondary text-sm mb-4">
          العربية: <span className="font-medium">{deposit.car?.carType} {deposit.car?.model}</span>
          {' — '}العربون: <span className="font-medium">{formatEGP(deposit.depositAmount)}</span>
        </p>

        {!isConfirm && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">سبب الرفض (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="اكتب سبب الرفض..."
            />
          </div>
        )}

        {error && <p className="text-error text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-sm border border-border hover:bg-background">
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-sm font-medium disabled:opacity-60 ${btnClass}`}
          >
            {loading ? 'جاري...' : label}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Deposits() {
  const [deposits, setDeposits] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [statusTab, setStatusTab] = useState('');
  const [dialog, setDialog]     = useState(null); // { deposit, action }

  const limit = 20;

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit });
      if (statusTab) params.set('status', statusTab);
      const { data } = await api.get(`/deposits?${params}`);
      setDeposits(data.data);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err.response?.data?.message || 'حصل خطأ أثناء تحميل طلبات العربون');
    } finally {
      setLoading(false);
    }
  }, [page, statusTab]);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  // Refresh when CFO receives a new deposit via socket
  useSocketEvent('deposit:submitted', () => { fetchDeposits(); }, [fetchDeposits]);

  const totalPages = Math.ceil(total / limit);

  function openDialog(deposit, action) {
    setDialog({ deposit, action });
  }

  function onDialogDone() {
    setDialog(null);
    fetchDeposits();
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">طلبات العربون</h1>
          <p className="text-text-secondary text-sm mt-0.5">{total} طلب إجمالاً</p>
        </div>
        <button onClick={fetchDeposits} className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-sm hover:bg-background">
          <RefreshCw size={15} />
          تحديث
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusTab(tab.key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${statusTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-error text-sm rounded-sm p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">جاري التحميل...</div>
      ) : deposits.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted">لا توجد طلبات عربون</div>
      ) : (
        <div className="bg-surface rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-right px-4 py-3 font-semibold">العربية</th>
                <th className="text-right px-4 py-3 font-semibold">المشتري</th>
                <th className="text-right px-4 py-3 font-semibold">مبلغ العربون</th>
                <th className="text-right px-4 py-3 font-semibold">الموظف</th>
                <th className="text-right px-4 py-3 font-semibold">التاريخ</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {deposits.map((dep, idx) => (
                <tr key={dep.id} className={idx % 2 === 1 ? 'bg-background/50' : ''}>
                  <td className="px-4 py-3 font-medium">
                    {dep.car?.carType} {dep.car?.model}
                    <span className="block text-xs text-text-muted">{dep.car?.plateNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    {dep.buyerName}
                    <span className="block text-xs text-text-muted">{dep.buyerPhone}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-accent">{formatEGP(dep.depositAmount)}</td>
                  <td className="px-4 py-3 text-text-secondary">{dep.employee?.fullName}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {new Date(dep.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[dep.status]}`}>
                      {dep.status === 'pending' && <Clock size={11} />}
                      {dep.status === 'confirmed' && <CheckCircle size={11} />}
                      {dep.status === 'rejected' && <XCircle size={11} />}
                      {STATUS_LABELS[dep.status] ?? dep.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {dep.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDialog(dep, 'confirm')}
                          className="px-3 py-1 text-xs rounded-sm bg-primary-light text-primary hover:bg-green-200 font-medium"
                        >
                          تأكيد
                        </button>
                        <button
                          onClick={() => openDialog(dep, 'reject')}
                          className="px-3 py-1 text-xs rounded-sm bg-red-50 text-error hover:bg-red-100 font-medium"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-border rounded-sm disabled:opacity-40 hover:bg-background"
          >
            السابق
          </button>
          <span className="text-sm text-text-secondary">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-border rounded-sm disabled:opacity-40 hover:bg-background"
          >
            التالي
          </button>
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          deposit={dialog.deposit}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDone={onDialogDone}
        />
      )}
    </div>
  );
}
