# Phase 3 — Consumer Site / Public Pages (Opus)

> Ref: `docs/MASTER_PLAN.md` — Sections 6, 12, 13
> Design: Sylndr.com inspired. Green primary (#00C853), card-based, Arabic RTL

## Build

### Backend (Public API — no auth)
- `GET /api/v1/public/cars` — paginated (20/page), filterable, sortable. Response EXCLUDES: seller_name, seller_phone, seller_residence, seller_license_*. Only status='available'. Also returns: available filter options (distinct brands, models, price range)
- `GET /api/v1/public/cars/:id` — single car (same exclusions). 404 if not available
- `GET /api/v1/public/settings/numeral_system` — returns numeral preference (public, no auth needed)

### Frontend — Public Pages (under `/`)

**Numeral formatting:** Create a `formatNumber(n)` util that checks `numeral_system` setting. Default western (1,2,3). If arabic → convert to ١,٢,٣. Use everywhere: prices, KM, counts. Price display: `formatNumber(price) + " ج.م"`

**Home (`/`)**
- Hero: search bar + "أوتوزين — أكبر معرض عربيات مستعملة"
- Latest 6 available cars in grid
- CTA: "شوف كل العربيات"

**Car Listing (`/cars`)**
- Sylndr layout:
  - Desktop: filter sidebar (RIGHT, RTL) + 3-column card grid
  - Mobile: collapsible filter bar + 1-column cards
- Filters: brand (multi-select), model (dependent), price range (min/max inputs), transmission (radio), odometer range, color, fuel
- Sort: الأحدث, الأقل سعراً, الأعلى سعراً, الأقل كيلومترات
- "تحميل المزيد" pagination (append)
- URL query params sync (filters persist on refresh)

**Car Card:**
- First image (fallback placeholder)
- Brand + Model
- Price (ج.م, comma-formatted, numeral_system aware)
- Spec pills: KM | Transmission | Plate
- Heart icon (localStorage favorites)

**Car Details (`/cars/:id`)**
- Image gallery: swipeable carousel (mobile), thumbnails (desktop)
- Brand + Model title
- Price: large, green
- Specs grid in pills: KM, transmission, plate, color, fuel (if available)
- Inspection report image (if exists) + disclaimer: "التقرير مرفق من البائع — المعرض غير مسؤول عن دقته"
- Additional info section
- Sticky bottom CTA (mobile): "تواصل مع موظف" → `/employees`
- Desktop: CTA in sidebar

**Favorites (`/favorites`)**
- Cars from localStorage IDs → fetch from API
- Remove (heart toggle). Empty state: "مفيش عربيات في المفضلة"

**Navbar:** "أوتوزين" (placeholder SVG logo) | الرئيسية | العربيات | المفضلة (count badge) | تواصل مع موظف
**Footer:** أوتوزين © 2026
**UX:** Loading skeletons, empty states, image lazy loading, debounced search (300ms)

## Tests
- Search: correct results, empty, Arabic chars
- Filters: combine, clear, URL sync, dependent model filter
- Favorites: add/remove, persist, clear on localStorage wipe
- Numeral system: prices display correctly in both western/arabic
- Responsive: 375px, 768px, 1280px
- Edge: no cars, empty filters, car deleted while viewing, very long names

## After
Update `docs/PHASE_TRACKER.md` + `tests/edge-cases.md`