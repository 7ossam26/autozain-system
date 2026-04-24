# Phase 6 — Admin + Archive + Import/Export + Polish (Sonnet)

> Ref: `docs/MASTER_PLAN.md` — Sections 4, 5, 11, 12
> Prisma ORM. No password-reset flow (SuperAdmin resets manually via Users page)

## Build

### Features

**Archive (`/dashboard/archive`):** sold + withdrawn cars. Search + filter. RBAC: `archive_view`. Click → read-only detail with audit_log timeline

**Team Manager Stats (`/dashboard/team`):** employee cards: total sessions, accepted/rejected count (from Prisma aggregate on contact_requests). RBAC: `employee_monitor`

**SuperAdmin Overview (`/dashboard`):** stat cards: cars by status, users by role, sales this month, active employees. Quick links. RBAC: SuperAdmin/Admin

**Import (`/dashboard/cars/import`):**
- Upload CSV/Excel → parse (papaparse for CSV, xlsx for Excel) → validate columns (car_type, model, listing_price as Int, transmission, plate_number, odometer, seller_name, seller_phone, seller_residence required)
- Preview table → confirm → Prisma `createMany`
- Error report for invalid rows (bad price format, missing fields)
- RBAC: `cars_add`
- Backend: `POST /api/v1/cars/import` (multipart)

**Export:** Button on Cars page → `GET /api/v1/cars/export` (same filters) → CSV/Excel. RBAC: `cars_view`

**Static Pages:** `/terms`, `/privacy` (placeholder Arabic), `/404`

### Polish (ALL existing pages)
- **Loading:** consistent Skeleton component on every data-fetch
- **Empty states:** Arabic messages + icon (no cars, no results, no favorites, no deposits, no sales)
- **Toasts:** global system (success/error/warning/info). Top-right desktop, top-center mobile
- **Confirm dialogs:** delete car, delete user, change permissions, reject deposit, close sale. Arabic buttons (تأكيد/إلغاء)
- **Error boundary:** wraps routes → "حصل مشكلة" + retry
- **Password reset:** on Users page edit modal, "تغيير كلمة السر" section (SuperAdmin/users_edit only)
- **Mobile dashboard:** sidebar → bottom nav (5 items). Tables → card layout. Larger tap targets
- **Performance:** React.lazy + Suspense per route. Image `loading="lazy"`. Stale-while-revalidate for car listings
- **Accessibility:** focus trap on modals, aria-labels on icon buttons, keyboard nav on tables
- **Numeral system:** verify all number displays respect the setting

## Tests
- Archive: correct cars, RBAC enforced
- Import: valid CSV, invalid errors, duplicate plates
- Export: matches filters
- Password reset: works from Users page
- Mobile: usable at 375px
- Edge: import 500+ rows, missing required fields, decimal prices in CSV (reject)

## After
Update `docs/PHASE_TRACKER.md` + `tests/edge-cases.md`