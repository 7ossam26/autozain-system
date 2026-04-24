import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, RefreshCw, Eye, Download, Upload, Car } from 'lucide-react';
import { api } from '../../services/api.js';
import { formatEGP, formatKm } from '../../utils/formatters.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { SkeletonRow } from '../../components/ui/Skeleton.jsx';

const STATUS_TABS = [
  { key: '',              label: 'الكل' },
  { key: 'available',     label: 'متاحة' },
  { key: 'deposit_paid',  label: 'عربون' },
  { key: 'sold',          label: 'مباعة' },
  { key: 'withdrawn',     label: 'مسحوبة' },
];

const STATUS_STYLES = {
  available:    'bg-primary-light text-primary',
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  sold:         'bg-blue-100 text-blue-700',
  withdrawn:    'bg-gray-100 text-text-secondary',
};

const STATUS_LABELS = {
  available:    'متاحة',
  deposit_paid: 'عربون',
  sold:         'مباعة',
  withdrawn:    'مسحوبة',
};

export default function Cars() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const toast     = useToast();

  const [cars, setCars]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [exporting, setExporting] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');

  const limit      = 20;
  const isSuperAdmin = user?.role?.name === 'superadmin';
  const canAdd     = isSuperAdmin || user?.permissions?.cars_add;

  const fetchCars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const { data } = await api.get(`/cars?${params}`);
      setCars(data.data);
      setTotal(data.meta.total);
    } catch (err) {
      setError(err.response?.data?.message || 'حصل خطأ أثناء تحميل العربيات');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchCars(); }, [fetchCars]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const response = await api.get(`/cars/export?${params}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', 'cars.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير ملف Excel بنجاح');
    } catch {
      toast.error('فشل تصدير الملف');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">العربيات</h1>
          <p className="text-text-secondary text-sm mt-0.5">{total} عربية إجمالاً</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 border border-border-muted text-text-secondary px-3 py-2 rounded-sm text-sm hover:bg-background disabled:opacity-60 transition-colors"
            aria-label="تصدير Excel"
          >
            <Download size={15} />
            {exporting ? 'جاري…' : 'تصدير'}
          </button>
          {/* Import */}
          {canAdd && (
            <Link
              to="/dashboard/cars/import"
              className="flex items-center gap-2 border border-border-muted text-text-secondary px-3 py-2 rounded-sm text-sm hover:bg-background transition-colors"
            >
              <Upload size={15} />
              استيراد
            </Link>
          )}
          {/* Add */}
          {canAdd && (
            <Link
              to="/dashboard/cars/add"
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus size={16} />
              إضافة عربية
            </Link>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-surface rounded-sm p-1 border border-border-muted w-fit overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors whitespace-nowrap
              ${statusFilter === tab.key
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + refresh */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="ابحث بالنوع أو الموديل…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pr-9 pl-3 py-2 border border-border-muted rounded-sm text-sm bg-surface focus:outline-none focus:border-primary"
            aria-label="بحث في العربيات"
          />
        </div>
        <button
          onClick={fetchCars}
          className="p-2 border border-border-muted rounded-sm hover:bg-background text-text-secondary transition-colors"
          title="تحديث"
          aria-label="تحديث القائمة"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-error rounded-sm p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-md border border-border-muted overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background border-b border-border-muted">
              <tr>
                <th className="text-right py-3 px-4 font-medium text-text-secondary w-16">صورة</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">العربية</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">السعر</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">الحالة</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">النمرة</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">العداد</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">التاريخ</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}

              {!loading && cars.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Car size={40} className="mx-auto mb-3 text-text-muted opacity-30" />
                    <p className="text-text-secondary font-medium">
                      {search || statusFilter ? 'مفيش نتايج بالفلاتر دي' : 'مفيش عربيات لحد دلوقتي'}
                    </p>
                    {!search && !statusFilter && canAdd && (
                      <Link
                        to="/dashboard/cars/add"
                        className="inline-flex items-center gap-2 mt-3 text-primary text-sm hover:underline"
                      >
                        <Plus size={14} />
                        أضف أول عربية
                      </Link>
                    )}
                  </td>
                </tr>
              )}

              {!loading && cars.map((car, idx) => {
                const thumb = Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : null;
                return (
                  <tr
                    key={car.id}
                    className={`border-b border-border-muted last:border-0 hover:bg-background/50 transition-colors cursor-pointer
                      ${idx % 2 === 0 ? '' : 'bg-background/30'}`}
                    onClick={() => navigate(`/dashboard/cars/${car.id}`)}
                  >
                    <td className="py-3 px-4">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-12 h-9 object-cover rounded-sm bg-background"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded-sm bg-background flex items-center justify-center text-text-muted">
                          <Car size={14} />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-text-primary">{car.carType} {car.model}</p>
                      <p className="text-text-muted text-xs mt-0.5">{car.addedByUser?.fullName}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {formatEGP(car.listingPrice)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[car.status]}`}>
                        {STATUS_LABELS[car.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{car.plateNumber || '—'}</td>
                    <td className="py-3 px-4 text-text-secondary">{formatKm(car.odometer)}</td>
                    <td className="py-3 px-4 text-text-muted text-xs">
                      {new Date(car.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/cars/${car.id}`); }}
                        className="p-1.5 text-text-muted hover:text-primary rounded-sm hover:bg-primary-light transition-colors"
                        aria-label="عرض التفاصيل"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-muted">
            <p className="text-text-muted text-sm">
              صفحة {page} من {totalPages} — {total} نتيجة
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-border-muted rounded-sm disabled:opacity-40 hover:bg-background transition-colors"
              >
                السابق
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-border-muted rounded-sm disabled:opacity-40 hover:bg-background transition-colors"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
