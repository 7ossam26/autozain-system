import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { publicApi } from '../../services/publicApi.js';
import CarCard, { CarCardSkeleton } from '../../components/shared/CarCard.jsx';
import SearchBar from '../../components/shared/SearchBar.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    publicApi.get('/cars', { params: { limit: 6, sort: 'latest' } })
      .then(({ data }) => { if (!cancelled) setCars(data.data ?? []); })
      .catch(() => { if (!cancelled) setCars([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function onSearch(q) {
    const query = (q ?? '').trim();
    navigate(query ? `/cars?search=${encodeURIComponent(query)}` : '/cars');
  }

  return (
    <div dir="rtl">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-light to-background py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-secondary mb-4 leading-tight">
            أوتوزين — أكبر معرض عربيات مستعملة
          </h1>
          <p className="text-text-secondary md:text-lg mb-8">
            عربيات متفحوصة، بيانات واضحة، وموظف بيتواصل معاك فوراً.
          </p>
          <SearchBar
            placeholder="ابحث عن نوع أو موديل العربية…"
            onSearch={onSearch}
            delay={0}
            className="max-w-xl mx-auto"
          />
        </div>
      </section>

      {/* Latest cars */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-text-primary">أحدث العربيات</h2>
          <Link to="/cars" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
            شوف كل العربيات
            <ArrowLeft size={14} />
          </Link>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <CarCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && cars.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            لسه مفيش عربيات متاحة — تابعنا قريب.
          </div>
        )}

        {!loading && cars.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cars.map((car) => <CarCard key={car.id} car={car} />)}
          </div>
        )}

        {!loading && cars.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to="/cars"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-md font-medium hover:bg-primary-dark transition-colors"
            >
              شوف كل العربيات
              <ArrowLeft size={16} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
