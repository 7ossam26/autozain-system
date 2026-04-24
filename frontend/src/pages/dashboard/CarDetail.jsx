import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Edit, Trash2, AlertTriangle, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api.js';
import { formatEGP, formatKm } from '../../utils/formatters.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STATUS_LABELS = {
  available:    'متاحة',
  deposit_paid: 'عربون',
  sold:         'مباعة',
  withdrawn:    'مسحوبة',
};

const STATUS_STYLES = {
  available:    'bg-primary-light text-primary',
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  sold:         'bg-blue-100 text-blue-700',
  withdrawn:    'bg-gray-100 text-text-secondary',
};

// Allowed transitions per current status
const TRANSITIONS = {
  available:    ['deposit_paid', 'withdrawn'],
  deposit_paid: ['available', 'sold'],
  sold:         [],
  withdrawn:    ['available'],
};

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [car, setCar]           = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [activeImage, setActiveImage]             = useState(0);
  const [statusChanging, setStatusChanging]       = useState(false);
  const [statusError, setStatusError]             = useState(null);
  const [deleteConfirm, setDeleteConfirm]         = useState(false);
  const [deleting, setDeleting]                   = useState(false);

  const roleName = user?.role?.name;
  const isSuperAdmin = roleName === 'superadmin';
  const canEdit = isSuperAdmin || user?.permissions?.cars_edit;
  const canDelete = isSuperAdmin || user?.permissions?.cars_delete;
  const canChangeStatus = isSuperAdmin || user?.permissions?.cars_change_status;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/cars/${id}`);
        const { auditLog: log, ...carData } = data.data;
        setCar(carData);
        setAuditLog(log || []);
      } catch (err) {
        setError(err.response?.data?.message || 'حصل خطأ أثناء التحميل');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleStatusChange(newStatus) {
    setStatusError(null);
    setStatusChanging(true);
    try {
      const { data } = await api.patch(`/cars/${id}/status`, { status: newStatus });
      setCar(data.data);
      // Refresh audit log
      const res = await api.get(`/cars/${id}`);
      const { auditLog: log, ...carData } = res.data.data;
      setCar(carData);
      setAuditLog(log || []);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'فشل تغيير الحالة');
    } finally {
      setStatusChanging(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/cars/${id}`);
      navigate('/dashboard/cars');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل الحذف');
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div dir="rtl" className="flex items-center justify-center py-20 text-text-muted">جاري التحميل…</div>
  );

  if (error) return (
    <div dir="rtl">
      <div className="bg-red-50 border border-red-200 text-error rounded-sm p-4 text-sm">{error}</div>
      <button onClick={() => navigate('/dashboard/cars')} className="mt-4 text-primary text-sm hover:underline">← العودة</button>
    </div>
  );

  if (!car) return null;

  const images = Array.isArray(car.images) ? car.images : [];
  const nextStatuses = TRANSITIONS[car.status] ?? [];

  return (
    <div dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/dashboard/cars" className="hover:text-text-primary">العربيات</Link>
        <ChevronRight size={14} />
        <span className="text-text-primary font-medium">{car.carType} {car.model}</span>
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{car.carType} {car.model}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${STATUS_STYLES[car.status]}`}>
              {STATUS_LABELS[car.status]}
            </span>
            <span className="text-text-muted text-sm">أضافه: {car.addedByUser?.fullName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && car.status !== 'sold' && (
            <Link
              to={`/dashboard/cars/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 border border-border-muted rounded-sm text-sm text-text-secondary hover:bg-background transition-colors"
            >
              <Edit size={15} /> تعديل
            </Link>
          )}
          {canDelete && car.status !== 'sold' && (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-sm text-sm text-error hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} /> حذف
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: images + details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          {images.length > 0 ? (
            <div className="bg-surface border border-border-muted rounded-md overflow-hidden shadow-sm">
              <img
                src={images[activeImage]}
                alt=""
                className="w-full h-64 sm:h-80 object-cover"
              />
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`shrink-0 w-16 h-12 rounded-sm overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-border-muted rounded-md h-48 flex items-center justify-center text-text-muted shadow-sm">
              لا توجد صور
            </div>
          )}

          {/* Car specs */}
          <div className="bg-surface border border-border-muted rounded-md p-6 shadow-sm">
            <h2 className="font-semibold text-text-primary mb-4 text-base">بيانات العربية</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Spec label="السعر" value={formatEGP(car.listingPrice)} highlight />
              <Spec label="العداد" value={formatKm(car.odometer)} />
              <Spec label="ناقل الحركة" value={car.transmission === 'automatic' ? 'أوتوماتيك' : 'عادي'} />
              <Spec label="نوع الوقود" value={car.fuelType ? FUEL_LABELS[car.fuelType] : '—'} />
              <Spec label="اللون" value={car.color || '—'} />
              <Spec label="رقم اللوحة" value={car.plateNumber || '—'} />
              <Spec label="تراخيص" value={car.licenseInfo || '—'} />
              <Spec label="تاريخ الإضافة" value={new Date(car.createdAt).toLocaleDateString('ar-EG')} />
            </div>
            {car.additionalInfo && (
              <div className="mt-4 pt-4 border-t border-border-muted">
                <p className="text-xs text-text-muted mb-1">معلومات إضافية</p>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{car.additionalInfo}</p>
              </div>
            )}
            {car.inspectionImageUrl && (
              <div className="mt-4 pt-4 border-t border-border-muted">
                <p className="text-xs text-text-muted mb-2">تقرير الفحص</p>
                <img src={car.inspectionImageUrl} alt="تقرير الفحص" className="max-w-xs rounded-sm border border-border-muted" />
              </div>
            )}
          </div>

          {/* Seller info (conditionally shown) */}
          {car.sellerName && (
            <div className="bg-surface border border-border-muted rounded-md p-6 shadow-sm">
              <h2 className="font-semibold text-text-primary mb-4 text-base">بيانات البائع</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Spec label="الاسم" value={car.sellerName} />
                <Spec label="رقم الموبايل" value={car.sellerPhone} />
                <Spec label="محل الإقامة" value={car.sellerResidence || '—'} />
              </div>
              {(car.sellerLicenseFront || car.sellerLicenseBack) && (
                <div className="mt-4 pt-4 border-t border-border-muted flex gap-4">
                  {car.sellerLicenseFront && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">رخصة — وجه</p>
                      <img src={car.sellerLicenseFront} alt="" className="w-32 h-20 object-cover rounded-sm border border-border-muted" />
                    </div>
                  )}
                  {car.sellerLicenseBack && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">رخصة — ظهر</p>
                      <img src={car.sellerLicenseBack} alt="" className="w-32 h-20 object-cover rounded-sm border border-border-muted" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: status change + audit log */}
        <div className="space-y-6">
          {/* Status change */}
          {canChangeStatus && nextStatuses.length > 0 && (
            <div className="bg-surface border border-border-muted rounded-md p-5 shadow-sm">
              <h2 className="font-semibold text-text-primary mb-4 text-sm">تغيير الحالة</h2>
              {statusError && (
                <div className="bg-red-50 border border-red-200 text-error rounded-sm p-2 text-xs mb-3 flex items-center gap-1">
                  <AlertTriangle size={12} /> {statusError}
                </div>
              )}
              <div className="space-y-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    disabled={statusChanging}
                    onClick={() => handleStatusChange(s)}
                    className="w-full flex items-center justify-between px-4 py-2.5 border border-border-muted rounded-sm text-sm hover:bg-background transition-colors disabled:opacity-50"
                  >
                    <span>{STATUS_LABELS[s]}</span>
                    <ArrowRight size={14} className="text-text-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Audit log timeline */}
          <div className="bg-surface border border-border-muted rounded-md p-5 shadow-sm">
            <h2 className="font-semibold text-text-primary mb-4 text-sm">سجل التغييرات</h2>
            {auditLog.length === 0 ? (
              <p className="text-text-muted text-sm">لا توجد تغييرات مسجلة</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((entry) => (
                  <AuditEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-md p-6 shadow-lg max-w-sm w-full" dir="rtl">
            <h3 className="font-semibold text-text-primary mb-2">تأكيد الحذف</h3>
            <p className="text-text-secondary text-sm mb-5">
              هل أنت متأكد إنك تحذف "{car.carType} {car.model}"؟ الإجراء ده مش هيتراجع.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm border border-border-muted rounded-sm text-text-secondary hover:bg-background"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-error text-white rounded-sm hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? 'جاري الحذف…' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spec({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-primary text-base' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

const AUDIT_ICONS = {
  create:        <CheckCircle size={14} className="text-primary" />,
  status_change: <ArrowRight size={14} className="text-warning" />,
  update:        <Edit size={14} className="text-text-secondary" />,
  delete:        <XCircle size={14} className="text-error" />,
};

const AUDIT_ACTION_LABELS = {
  create: 'إضافة',
  status_change: 'تغيير حالة',
  update: 'تعديل',
  delete: 'حذف',
};

const STATUS_AR = { available: 'متاحة', deposit_paid: 'عربون', sold: 'مباعة', withdrawn: 'مسحوبة' };

function AuditEntry({ entry }) {
  const isStatus = entry.action === 'status_change';
  const old = entry.oldValue;
  const nw = entry.newValue;

  return (
    <div className="flex gap-3 text-xs">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="mt-0.5">{AUDIT_ICONS[entry.action] ?? <Clock size={14} className="text-text-muted" />}</div>
        <div className="flex-1 w-px bg-border-muted min-h-[12px]" />
      </div>
      <div className="pb-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-text-primary">{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</span>
          {isStatus && old?.status && nw?.status && (
            <span className="text-text-muted">
              {STATUS_AR[old.status]} → {STATUS_AR[nw.status]}
            </span>
          )}
        </div>
        <p className="text-text-muted mt-0.5">
          {entry.performer?.fullName} · {new Date(entry.createdAt).toLocaleString('ar-EG')}
        </p>
      </div>
    </div>
  );
}

const FUEL_LABELS = {
  benzine: 'بنزين', diesel: 'ديزل', gas: 'غاز', electric: 'كهرباء', hybrid: 'هايبرد',
};
