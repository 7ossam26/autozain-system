# Edge Cases — AutoZain

Living document. Seeded from [MASTER_PLAN.md](../docs/MASTER_PLAN.md) §16. Each phase appends newly discovered cases.

## Auth
- Login with empty fields
- Login with wrong password 10 times (rate limiting — 5 per 15 min)
- Access dashboard with expired token
- Access dashboard with tampered token
- Two sessions same user (latest-wins vs. multi-session)

## Cars
- Add car with all fields empty
- Add car with extremely long text in `additional_info` (10,000 chars)
- Upload image over 5 MB (max enforced)
- Upload non-image file as car image
- Upload non-JPEG/PNG/WebP format
- Change status of non-existent car
- Two employees change same car status simultaneously
- Delete car that has `deposit_paid` status
- Car with no images — placeholder on consumer site

## Contact Requests
- Submit request with invalid Egyptian phone number (soft warning, still accepted)
- Submit request when target employee just went offline
- Two buyers request same employee at the same moment
- Employee accepts request but buyer's phone is unreachable
- Buyer submits multiple requests rapidly (rate limit)
- Employee goes offline mid-session
- Target employee session exceeds `max_concurrent` setting

## Queue
- 50 buyers join queue simultaneously
- Employee becomes available → oldest queue entry assigned
- Queue entry expires (buyer leaves)
- Setting `max_concurrent` changed while queue has waiting buyers

## Financial
- CFO tries to close sale for car still `available`
- CFO enters negative commission (block)
- CFO enters sale price lower than listing price (allow — negotiation)
- Export report with 10,000+ records
- Concurrent CFO closes same sale (optimistic lock)
- Deposit refund flow

## Real-Time
- Socket disconnects and reconnects
- 100+ concurrent socket connections
- Car added while consumer has filters active (should appear only if it matches filters)
- Push subscription returns `410 Gone` → null out `users.push_subscription`

## Settings
- Change `max_concurrent` while employee has active sessions
- Change `request_timeout_minutes` while a request is pending
- Disable `employee_can_change_status` while employee is in session
- Toggle `numeral_system` (western ↔ arabic-indic) live

## Audit / Permissions
- SuperAdmin demotes themselves (must be blocked)
- Delete a role that has users assigned
- Toggle `module_access` for a role while users of that role are mid-action

## Uploads
- `backend/uploads/` not writable (Dokploy volume misconfigured)
- File name with path traversal (`../../etc/passwd`) — multer diskStorage uses crypto random filename, mitigated
- Simultaneous uploads exceeding disk quota

## Phase 2 — Discovered During Implementation

### Cars / State Machine
- Employee tries to change status when `employee_can_change_status = false` → must receive 403
- Employee tries to edit when `employee_can_edit_car = false` → must receive 403
- Employee tries to delete when `employee_can_delete_car = false` → must receive 403
- `withdrawn → available` attempted by employee (admin-only transition) → must receive 422
- `available → sold` direct jump (invalid transition) → must receive 422
- Car images array exceeds `max_car_images` setting → must receive 400 with TOO_MANY_IMAGES
- Seller phone that's an empty string vs. missing field (both should trigger warning, not block)
- Update car with no changed fields → 400 VALIDATION_ERROR

### Settings Cache
- Server restart while a setting is being updated → cache re-loads from DB on next start (safe)
- Multiple concurrent PUT /settings/:key for same key → last write wins (single process)
- Setting `max_car_images` reduced below count of existing images → cars already saved not affected, only future uploads blocked

### Concurrency
- Two users simultaneously change same car status (e.g. available → deposit_paid) → both succeed at DB level (no optimistic lock in Phase 2); Phase 5 should add conflict detection if needed

## Phase 3 — Discovered During Implementation

### Public API
- Seller fields leaking through nested/include queries → mitigated by explicit `select` projection in `publicCarRepository` (no `include: true` shortcuts)
- Car whose status flips from `available` to `sold` between list and detail fetch → detail returns 404 (not a 500); favorites page silently drops it
- Detail request for a `withdrawn` car → 404 (same projection rules as sold)
- `GET /public/cars/:id` with malformed UUID → Prisma throws; centralized error handler should return 500-class — consider validating UUID shape before the query if noise appears in logs
- `include_filters=1` on large catalogs → distinct queries run per request; Phase 4+ may want to cache the filter options response
- Price/odometer min/max passed as empty string → treated as "not set" (repository guards against `NaN`)
- Multi-value `car_type=Toyota,Honda` combined with `model=Corolla` → brand OR is combined via AND with model list — works, but no cross-validation that the model actually belongs to the selected brand

### Favorites (localStorage)
- `localStorage` disabled (private mode / quota full) → `useFavorites` returns empty list; toggle is a silent no-op rather than throwing
- Favorited car deleted or marked sold → detail fetch 404s; Favorites page filters those out so the UI never shows a broken card
- Tab A adds a favorite while Tab B is open → `storage` event refreshes Tab B's count badge
- `localStorage` contains non-array / tampered JSON → reader returns `[]` (no crash)
- Same id pushed twice → toggle treats it as "remove"; list de-duped implicitly via `includes` check

### Search & Filters
- Arabic search query (e.g. "نضيفة") against `additional_info` → Postgres `contains` is case-insensitive and Arabic-safe; confirmed by integration test
- Filter sidebar with zero inventory → `options` is `null`, sidebar renders only price/odometer/color/fuel/transmission (brand+model lists hidden gracefully)
- URL params with unknown keys → ignored; unknown `sort` value falls back to `latest`
- User sets `price_min > price_max` → query returns empty set (no validation error, matches Sylndr UX)

### UI / Responsive
- Very long brand+model name (e.g. 80 chars) → card truncates via `truncate`/min-width-0; detail breadcrumb truncates the last segment
- Car with no images → card shows "لا توجد صورة" placeholder; gallery shows placeholder block
- Mobile filter drawer open + page navigation → drawer unmounts with the route; no lingering overlay
- Toggling `numeral_system` in dashboard while a public page is open → public page reflects new system only after reload (fetched once on `PublicLayout` mount by design)
