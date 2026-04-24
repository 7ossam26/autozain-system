import { Link } from 'react-router-dom';
import { Heart, Gauge, Settings2, Hash } from 'lucide-react';
import { formatEGP, formatKm } from '../../utils/formatters.js';
import { useFavorites } from '../../hooks/useFavorites.js';

export default function CarCard({ car }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(car.id);
  const firstImage = Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : null;

  function onHeartClick(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle(car.id);
  }

  return (
    <Link
      to={`/cars/${car.id}`}
      className="group bg-surface rounded-md border border-border-muted shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-background overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage}
            alt={`${car.carType} ${car.model}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
            لا توجد صورة
          </div>
        )}
        <button
          type="button"
          aria-label={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          onClick={onHeartClick}
          className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-full w-9 h-9 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <Heart
            size={18}
            className={fav ? 'fill-accent text-accent' : 'text-text-secondary'}
          />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-text-primary text-base">
          {car.carType} {car.model}
        </h3>
        <p className="text-primary font-bold text-lg mt-1">{formatEGP(car.listingPrice)}</p>

        <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
          <Pill icon={<Gauge size={12} />}>{formatKm(car.odometer)}</Pill>
          <Pill icon={<Settings2 size={12} />}>
            {car.transmission === 'automatic' ? 'أوتوماتيك' : 'عادي'}
          </Pill>
          {car.plateNumber && (
            <Pill icon={<Hash size={12} />}>{car.plateNumber}</Pill>
          )}
        </div>
      </div>
    </Link>
  );
}

function Pill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 bg-background text-text-secondary px-2 py-1 rounded-full">
      {icon}
      {children}
    </span>
  );
}

export function CarCardSkeleton() {
  return (
    <div className="bg-surface rounded-md border border-border-muted overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-border-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-border-muted rounded w-2/3" />
        <div className="h-5 bg-border-muted rounded w-1/3" />
        <div className="flex gap-2 mt-3">
          <div className="h-5 bg-border-muted rounded-full w-16" />
          <div className="h-5 bg-border-muted rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}
