import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Heart, Gauge, Settings2, Hash, Fuel, Droplet, FileText, ChevronRight, UserCircle2 } from 'lucide-react';
import { publicApi } from '../../services/publicApi.js';
import { formatEGP, formatKm } from '../../utils/formatters.js';
import { useFavorites } from '../../hooks/useFavorites.js';
import ImageGallery from '../../components/shared/ImageGallery.jsx';

const FUEL_LABELS = {
  benzine: 'بنزين', diesel: 'ديزل', gas: 'غاز', electric: 'كهرباء', hybrid: 'هايبرد',
};

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggle } = useFavorites();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    publicApi.get(`/cars/${id}`)
      .then(({ data }) => { if (!cancelled) setCar(data.data); })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) setError('العربية مش موجودة أو اتباعت. جرّب عربية تانية.');
        else setError('حصل خطأ أثناء التحميل. حاول مرة تانية.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div dir="rtl" className="max-w-5xl mx-auto px-4 py-10 text-center text-text-muted">
        جاري التحميل…
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary mb-4">{error}</p>
        <Link to="/cars" className="text-primary font-medium hover:underline">← الرجوع لكل العربيات</Link>
      </div>
    );
  }

  if (!car) return null;

  const fav = isFavorite(car.id);

  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-4">
        <Link to="/" className="hover:text-text-primary">الرئيسية</Link>
        <ChevronRight size={14} />
        <Link to="/cars" className="hover:text-text-primary">العربيات</Link>
        <ChevronRight size={14} />
        <span className="text-text-primary font-medium truncate">{car.carType} {car.model}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: gallery + details */}
        <div className="space-y-6 min-w-0">
          <ImageGallery images={car.images} />

          {/* Title + price */}
          <div className="bg-surface border border-border-muted rounded-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                  {car.carType} {car.model}
                </h1>
                <p className="text-primary text-2xl md:text-3xl font-bold mt-2">
                  {formatEGP(car.listingPrice)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(car.id)}
                aria-label={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                className="shrink-0 w-11 h-11 rounded-full border border-border-muted flex items-center justify-center bg-surface hover:bg-background transition-colors"
              >
                <Heart size={20} className={fav ? 'fill-accent text-accent' : 'text-text-secondary'} />
              </button>
            </div>
          </div>

          {/* Specs grid */}
          <div className="bg-surface border border-border-muted rounded-md p-5">
            <h2 className="font-semibold text-text-primary mb-4">المواصفات</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SpecPill icon={<Gauge size={16} />} label="العداد" value={formatKm(car.odometer)} />
              <SpecPill icon={<Settings2 size={16} />} label="ناقل الحركة" value={car.transmission === 'automatic' ? 'أوتوماتيك' : 'عادي'} />
              {car.plateNumber && <SpecPill icon={<Hash size={16} />} label="النمرة" value={car.plateNumber} />}
              {car.color && <SpecPill icon={<Droplet size={16} />} label="اللون" value={car.color} />}
              {car.fuelType && <SpecPill icon={<Fuel size={16} />} label="الوقود" value={FUEL_LABELS[car.fuelType] ?? car.fuelType} />}
              {car.licenseInfo && <SpecPill icon={<FileText size={16} />} label="التراخيص" value={car.licenseInfo} />}
            </div>
          </div>

          {/* Inspection report */}
          {car.inspectionImageUrl && (
            <div className="bg-surface border border-border-muted rounded-md p-5">
              <h2 className="font-semibold text-text-primary mb-2">تقرير الفحص</h2>
              <p className="text-xs text-text-muted mb-3">
                التقرير مرفق من البائع — المعرض غير مسؤول عن دقته.
              </p>
              <img
                src={car.inspectionImageUrl}
                alt="تقرير الفحص"
                loading="lazy"
                className="w-full max-w-md rounded-sm border border-border-muted"
              />
            </div>
          )}

          {/* Additional info */}
          {car.additionalInfo && (
            <div className="bg-surface border border-border-muted rounded-md p-5">
              <h2 className="font-semibold text-text-primary mb-2">معلومات إضافية</h2>
              <p className="text-text-secondary text-sm whitespace-pre-wrap leading-relaxed">
                {car.additionalInfo}
              </p>
            </div>
          )}
        </div>

        {/* Right: sticky CTA (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 bg-surface border border-border-muted rounded-md p-5 space-y-3">
            <p className="text-sm text-text-secondary">
              عجبتك العربية؟ موظف من أوتوزين هيتواصل معاك دلوقتي.
            </p>
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-md font-medium hover:bg-primary-dark transition-colors"
            >
              <UserCircle2 size={18} />
              تواصل مع موظف
            </button>
            <button
              type="button"
              onClick={() => toggle(car.id)}
              className="w-full flex items-center justify-center gap-2 border border-border-muted px-4 py-2.5 rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
            >
              <Heart size={16} className={fav ? 'fill-accent text-accent' : ''} />
              {fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
            </button>
          </div>
        </aside>
      </div>

      {/* Sticky bottom CTA (mobile) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border-muted p-3 z-40 shadow-lg">
        <button
          type="button"
          onClick={() => navigate('/employees')}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-md font-medium hover:bg-primary-dark"
        >
          <UserCircle2 size={18} />
          تواصل مع موظف
        </button>
      </div>
    </div>
  );
}

function SpecPill({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-background rounded-md">
      <div className="text-text-muted mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary truncate">{value}</p>
      </div>
    </div>
  );
}
