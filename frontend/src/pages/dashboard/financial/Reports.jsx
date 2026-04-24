import { useState, useEffect, useCallback, useRef } from 'react';
import { FileSpreadsheet, FileText, RefreshCw, SlidersHorizontal, TrendingUp, DollarSign, Users, Clock } from 'lucide-react';
import { api } from '../../../services/api.js';
import { formatEGP, formatNumber } from '../../../utils/formatters.js';

const ALL_COLUMNS = [
  { key: 'car_name',            labelAr: 'العربية',         defaultOn: true },
  { key: 'final_sale_price',    labelAr: 'السعر النهائي',   defaultOn: true },
  { key: 'seller_received',     labelAr: 'للبائع',           defaultOn: true },
  { key: 'dealership_revenue',  labelAr: 'للمعرض',           defaultOn: true },
  { key: 'employee_commission', labelAr: 'العمولة',          defaultOn: true },
  { key: 'net_profit',          labelAr: 'صافي الربح',      defaultOn: true },
  { key: 'employee_name',       labelAr: 'الموظف',           defaultOn: true },
  { key: 'sale_date',           labelAr: 'التاريخ',          defaultOn: true },
  { key: 'buyer_name',          labelAr: 'اسم المشتري',     defaultOn: true },
  { key: 'buyer_phone',         labelAr: 'رقم المشتري',     defaultOn: false },
  { key: 'seller_name',         labelAr: 'اسم البائع',      defaultOn: false },
  { key: 'seller_phone',        labelAr: 'رقم البائع',      defaultOn: false },
  { key: 'listing_price',       labelAr: 'سعر العرض',       defaultOn: false },
  { key: 'tax_amount',          labelAr: 'الضريبة',          defaultOn: false },
  { key: 'payment_method',      labelAr: 'طريقة الدفع',     defaultOn: false },
  { key: 'notes',               labelAr: 'ملاحظات',          defaultOn: false },
];

const NUMBER_KEYS = new Set([
  'listing_price', 'final_sale_price', 'seller_received', 'dealership_revenue',
  'employee_commission', 'tax_amount', 'net_profit',
]);

function getCellValue(sale, key) {
  switch (key) {
    case 'car_name':            return `${sale.car?.carType ?? ''} ${sale.car?.model ?? ''}`.trim();
    case 'listing_price':       return sale.car?.listingPrice;
    case 'final_sale_price':    return sale.finalSalePrice;
    case 'seller_received':     return sale.sellerReceived;
    case 'dealership_revenue':  return sale.dealershipRevenue;
    case 'employee_commission': return sale.employeeCommission;
    case 'tax_amount':          return sale.taxAmount;
    case 'net_profit':          return sale.dealershipRevenue - sale.taxAmount - sale.employeeCommission;
    case 'employee_name':       return sale.employee?.fullName ?? '—';
    case 'sale_date':           return sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('ar-EG') : '';
    case 'buyer_name':          return sale.buyerName;
    case 'buyer_phone':         return sale.buyerPhone;
    case 'seller_name':         return sale.car?.sellerName ?? '—';
    case 'seller_phone':        return sale.car?.sellerPhone ?? '—';
    case 'payment_method':      return sale.paymentMethod || '—';
    case 'notes':               return sale.notes || '—';
    default:                    return '';
  }
}

function StatCard({ icon: Icon, label, value, color = 'text-primary' }) {
  return (
    <div className="bg-surface rounded-md border border-border p-4 flex items-start gap-3">
      <div className={`p-2 rounded-sm bg-background ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-text-muted mb-0.5">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export default function Reports() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [carType, setCarType]       = useState('');
  const [page, setPage]             = useState(1);
  const limit = 20;

  // Data
  const [sales, setSales]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [stats, setStats]     = useState(null);
  const [employees, setEmployees] = useState([]);

  // Column selector
  const [selectedCols, setSelectedCols] = useState(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)),
  );
  const [showColPicker, setShowColPicker] = useState(false);

  const [exporting, setExporting] = useState('');

  const visibleCols = ALL_COLUMNS.filter((c) => selectedCols.has(c.key));

  function buildParams(extra = {}) {
    const p = new URLSearchParams();
    if (startDate)  p.set('start_date',  startDate);
    if (endDate)    p.set('end_date',    endDate);
    if (employeeId) p.set('employee_id', employeeId);
    if (carType)    p.set('car_type',    carType);
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p;
  }

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams({ page, limit });
      const { data } = await api.get(`/sales?${params}`);
      setSales(data.data);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err.response?.data?.message || 'حصل خطأ أثناء تحميل التقارير');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, employeeId, carType, page]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/sales/stats');
      setStats(data.data);
    } catch { /* stats are non-critical */ }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Load employee list for filter
  useEffect(() => {
    api.get('/users?limit=100').then(({ data }) => {
      setEmployees(data.data ?? []);
    }).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / limit);

  function applyFilters(e) {
    e.preventDefault();
    setPage(1);
    fetchSales();
    fetchStats();
  }

  function clearFilters() {
    setStartDate('');
    setEndDate('');
    setEmployeeId('');
    setCarType('');
    setPage(1);
  }

  async function doExport(fmt) {
    setExporting(fmt);
    try {
      const params = buildParams({ columns: [...selectedCols].join(',') });
      const url = `/api/v1/sales/export/${fmt}?${params}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `autozain-sales-${Date.now()}.${fmt === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // nothing — browser handles
    } finally {
      setExporting('');
    }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">التقارير</h1>
          <p className="text-text-secondary text-sm mt-0.5">{total} بيعة</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => doExport('excel')}
            disabled={exporting === 'excel'}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-sm hover:bg-background disabled:opacity-50"
          >
            <FileSpreadsheet size={15} className="text-green-600" />
            {exporting === 'excel' ? 'جاري...' : 'Excel'}
          </button>
          <button
            onClick={() => doExport('pdf')}
            disabled={exporting === 'pdf'}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-sm hover:bg-background disabled:opacity-50"
          >
            <FileText size={15} className="text-red-500" />
            {exporting === 'pdf' ? 'جاري...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={TrendingUp}   label="إجمالي المبيعات"  value={formatNumber(stats.salesCount)}     color="text-primary" />
          <StatCard icon={DollarSign}   label="الإيرادات"         value={formatEGP(stats.totalRevenue)}     color="text-blue-600" />
          <StatCard icon={Users}        label="العمولات"           value={formatEGP(stats.totalCommissions)} color="text-accent" />
          <StatCard icon={Clock}        label="عربون معلق"        value={formatNumber(stats.pendingDeposits)} color="text-warning" />
        </div>
      )}

      {/* Filter bar */}
      <form onSubmit={applyFilters} className="bg-surface border border-border rounded-md p-4 mb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-border rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-border rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">الموظف</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-border rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
            >
              <option value="">الكل</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">نوع العربية</label>
            <input
              type="text"
              value={carType}
              onChange={(e) => setCarType(e.target.value)}
              placeholder="مثال: Toyota"
              className="w-full border border-border rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            className="px-4 py-1.5 text-sm bg-primary text-white rounded-sm hover:bg-primary-dark font-medium"
          >
            تطبيق
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-1.5 text-sm border border-border rounded-sm hover:bg-background"
          >
            مسح
          </button>
        </div>
      </form>

      {/* Column selector */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-secondary">{total} نتيجة</p>
        <button
          onClick={() => setShowColPicker((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-sm hover:bg-background"
        >
          <SlidersHorizontal size={14} />
          الأعمدة ({selectedCols.size})
        </button>
      </div>

      {showColPicker && (
        <div className="bg-surface border border-border rounded-md p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {ALL_COLUMNS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCols.has(col.key)}
                onChange={(e) => {
                  setSelectedCols((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(col.key);
                    else next.delete(col.key);
                    return next;
                  });
                }}
                className="accent-primary"
              />
              {col.labelAr}
            </label>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-error text-sm rounded-sm p-3 mb-4">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">جاري التحميل...</div>
      ) : sales.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted">لا توجد مبيعات بهذه الفلاتر</div>
      ) : (
        <div className="bg-surface rounded-md border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="border-b border-border bg-background">
                {visibleCols.map((col) => (
                  <th key={col.key} className="text-right px-3 py-3 font-semibold whitespace-nowrap">
                    {col.labelAr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, idx) => (
                <tr key={sale.id} className={idx % 2 === 1 ? 'bg-background/50' : ''}>
                  {visibleCols.map((col) => {
                    const val = getCellValue(sale, col.key);
                    return (
                      <td key={col.key} className="px-3 py-3 whitespace-nowrap">
                        {NUMBER_KEYS.has(col.key) ? (
                          <span className="font-medium">{formatEGP(val)}</span>
                        ) : val}
                      </td>
                    );
                  })}
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
    </div>
  );
}
