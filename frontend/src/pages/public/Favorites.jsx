import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { publicApi } from '../../services/publicApi.js';
import { useFavorites } from '../../hooks/useFavorites.js';
import CarCard, { CarCardSkeleton } from '../../components/shared/CarCard.jsx';

export default function Favorites() {
  const { ids } = useFavorites();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setCars([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    // Fetch each favorited car individually. If a car is no longer available
    // (404), silently skip it — prevents dead favorites from blocking the page.
    Promise.all(
      ids.map((id) =>
        publicApi.get(`/cars/${id}`)
          .then((r) => r.data?.data ?? null)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      setCars(results.filter(Boolean));
      setLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Heart size={24} className="text-accent fill-accent" />
        <h1 className="text-2xl font-bold text-text-primary">المفضلة</h1>
        <span className="text-text-muted text-sm">({ids.length})</span>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: Math.min(ids.length || 3, 3) }).map((_, i) => <CarCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && cars.length === 0 && (
        <div className="text-center py-16 bg-surface border border-border-muted rounded-md">
          <Heart size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary mb-4">مفيش عربيات في المفضلة</p>
          <Link
            to="/cars"
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            تصفح العربيات
          </Link>
        </div>
      )}

      {!loading && cars.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cars.map((car) => <CarCard key={car.id} car={car} />)}
        </div>
      )}
    </div>
  );
}
