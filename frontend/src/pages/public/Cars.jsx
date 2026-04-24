import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { publicApi } from '../../services/publicApi.js';
import CarCard, { CarCardSkeleton } from '../../components/shared/CarCard.jsx';
import SearchBar from '../../components/shared/SearchBar.jsx';
import FilterSidebar from '../../components/shared/FilterSidebar.jsx';

const SORT_OPTIONS = [
  { value: 'latest',     label: 'الأحدث' },
  { value: 'price_asc',  label: 'الأقل سعراً' },
  { value: 'price_desc', label: 'الأعلى سعراً' },
  { value: 'km_asc',     label: 'الأقل كيلومترات' },
];

const PAGE_SIZE = 20;

// ─── URL <-> state mapping ───────────────────────────────────────────────────
const ARRAY_KEYS = new Set(['car_type', 'model']);
const STRING_KEYS = ['price_min', 'price_max', 'odometer_min', 'odometer_max', 'transmission', 'fuel_type', 'color', 'search', 'sort'];

function paramsToFilters(params) {
  const out = { car_type: [], model: [] };
  for (const key of ARRAY_KEYS) {
    const v = params.get(key);
    out[key] = v ? v.split(',').filter(Boolean) : [];
  }
  for (const key of STRING_KEYS) out[key] = params.get(key) ?? '';
  if (!out.sort) out.sort = 'latest';
  return out;
}

function filtersToParams(filters) {
  const p = new URLSearchParams();
  for (const key of ARRAY_KEYS) {
    if (filters[key]?.length) p.set(key, filters[key].join(','));
  }
  for (const key of STRING_KEYS) {
    const v = filters[key];
    if (v && !(key === 'sort' && v === 'latest')) p.set(key, v);
  }
  return p;
}

// API request params (cars backend uses comma-separated multi values already)
function filtersToApiParams(filters) {
  const p = {};
  if (filters.car_type?.length) p.car_type = filters.car_type.join(',');
  if (filters.model?.length) p.model = filters.model.join(',');
  for (const key of STRING_KEYS) {
    const v = filters[key];
    if (v) p[key] = v;
  }
  return p;
}

export default function Cars() {
  const [urlParams, setUrlParams] = useSearchParams();
  const [filters, setFilters] = useState(() => paramsToFilters(urlParams));
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [appending, setAppending] = useState(false);
  const [options, setOptions] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Track whether filters are from user interaction (reset to page 1)
  const firstRunRef = useRef(true);

  // Sync filters → URL
  useEffect(() => {
    const p = filtersToParams(filters);
    setUrlParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Fetch whenever filters change — reset to page 1. Debounce to coalesce
  // rapid input (price/odometer typing) into a single request.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  async function fetchPage(p, append) {
    const isFirst = firstRunRef.current;
    firstRunRef.current = false;

    if (append) setAppending(true);
    else setLoading(true);

    try {
      const params = {
        ...filtersToApiParams(filters),
        page: p,
        limit: PAGE_SIZE,
      };
      // Fetch filter options on first load only
      if (isFirst || !options) params.include_filters = 1;

      const { data } = await publicApi.get('/cars', { params });
      const list = data.data ?? [];
      if (append) setCars((prev) => [...prev, ...list]);
      else setCars(list);
      setTotal(data.meta?.total ?? 0);
      if (data.filters) setOptions(data.filters);
    } catch {
      if (!append) setCars([]);
    } finally {
      setLoading(false);
      setAppending(false);
    }
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }

  function updateFilters(patch) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  const hasMore = cars.length < total;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.car_type?.length) n += filters.car_type.length;
    if (filters.model?.length) n += filters.model.length;
    for (const k of ['price_min', 'price_max', 'odometer_min', 'odometer_max', 'transmission', 'fuel_type', 'color']) {
      if (filters[k]) n += 1;
    }
    return n;
  }, [filters]);

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">كل العربيات</h1>
          <p className="text-text-muted text-sm mt-0.5">{total} عربية متاحة</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SearchBar
            className="flex-1 sm:w-64"
            value={filters.search}
            onSearch={(v) => updateFilters({ search: v })}
          />
          <select
            value={filters.sort || 'latest'}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="px-3 py-2.5 border border-border-muted rounded-md text-sm bg-surface text-text-primary focus:outline-none focus:border-primary"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <button
        type="button"
        onClick={() => setMobileFiltersOpen(true)}
        className="lg:hidden flex items-center justify-center gap-2 w-full mb-4 py-2.5 border border-border-muted rounded-md bg-surface text-text-primary text-sm font-medium"
      >
        <SlidersHorizontal size={16} />
        الفلاتر
        {activeFilterCount > 0 && (
          <span className="bg-primary text-white rounded-full text-xs px-2 py-0.5">{activeFilterCount}</span>
        )}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Results */}
        <div className="min-w-0 order-2 lg:order-1">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <CarCardSkeleton key={i} />)}
            </div>
          )}

          {!loading && cars.length === 0 && (
            <div className="text-center py-16 bg-surface border border-border-muted rounded-md">
              <p className="text-text-muted">مفيش عربيات بتطابق الفلاتر دي.</p>
            </div>
          )}

          {!loading && cars.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {cars.map((car) => <CarCard key={car.id} car={car} />)}
              </div>

              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={appending}
                    className="px-6 py-3 border border-border-muted rounded-md text-sm font-medium text-text-primary bg-surface hover:bg-background disabled:opacity-60 transition-colors"
                  >
                    {appending ? 'جاري التحميل…' : 'تحميل المزيد'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop sidebar (right in RTL) */}
        <div className="hidden lg:block order-1 lg:order-2">
          <FilterSidebar filters={filters} onChange={setFilters} options={options} />
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[90%] max-w-sm bg-surface overflow-hidden shadow-lg">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              options={options}
              onClose={() => setMobileFiltersOpen(false)}
              mobile
            />
          </div>
        </div>
      )}
    </div>
  );
}
