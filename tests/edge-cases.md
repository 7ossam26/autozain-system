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

## Phase 4 — Discovered During Implementation

### Socket.io
- Cookie JWT verified in `io.use` middleware; invalid/expired tokens fall through as anonymous (public room only) rather than erroring the connection
- Anonymous connections are allowed (public visitors) so the employee list can update live without auth
- Dashboard user logs in/out → `SocketProvider` disconnects + reconnects the singleton so the server re-joins the correct rooms with the new cookie
- Socket connection established before `/auth/me` finishes → `SocketProvider` waits for `loading=false` to open the connection, preventing anonymous-first-then-auth race
- `cookie-parser` package not imported in socket module → minimal inline parser avoids adding a second cookie dependency

### Contact Requests
- Request submitted while target employee's status just flipped to `busy` → controller returns `EMPLOYEE_NOT_AVAILABLE` (409) before creating the row
- Request expires while employee is opening the accept dialog → PATCH returns `INVALID_STATE` (409); client dismisses overlay on `contact_request:timeout`
- Two buyers submit for the same employee simultaneously → the second request still lands while status is still `available`; first acceptance flips status and wins — the second request stays `pending` until timeout sweep or employee action (document in release notes, Phase 5 may add per-employee pending cap = `max_concurrent_requests`)
- Repeat notification fires after 60s only if the request is still `pending` and the `notification_repeat` setting is `true`
- Timeout sweeper runs every 15s and uses the latest `request_timeout_minutes` setting from cache — changes to the setting take effect on the next sweep without a restart
- Session ended → `tryAssignFromQueue` pulls the oldest `waiting` buyer and creates a fresh contact request + emits `queue:assigned` + `contact_request:new`

### Queue
- Buyer tries to join queue while at least one employee is available → controller returns `EMPLOYEES_AVAILABLE` (409) to nudge them back to the employees page
- Queue auto-assign happens on: `PATCH /users/me/status` → `available`, and `PATCH /contact-requests/:id/complete` — both fire-and-forget; failures are logged but don't affect the primary response
- Queue entry expired while auto-assign runs → the `.catch(()=>{})` prevents a crash

### Push
- `web-push` returns 410 or 404 → `users.push_subscription` is nulled out per MASTER_PLAN §13 rule 19; next login triggers resubscribe
- VAPID keys missing from `.env` → `sendPush` returns `{ sent:false, reason:'VAPID_NOT_CONFIGURED' }`; socket events still deliver (in-app only)
- Service Worker file updated → browsers may cache the old one; `skipWaiting` + `clients.claim` ensure the new SW activates immediately
- Permission `denied` once → browser remembers it; banner remains dismissible but cannot re-request until user manually re-enables in browser settings

### Dashboard — Employee
- Employee tries to toggle to `offline` while an accepted session is still open → `ACTIVE_SESSION` (409) error surfaces in the toggle UI
- Employee status `busy` is read-only in the UI — the toggle is disabled and the system sets it automatically on accept / available on complete
- Overlay shown on page reload for any employee who already has a `pending` request (`/contact-requests/me` on mount)
- Audio alert blocked by browser autoplay policy until first user interaction — `useAudioAlert` primes the AudioContext on `pointerdown`/`keydown`
- `navigator.vibrate` missing (desktop) → silent fallback
- Car status changed during active session → server emits `session:suggest_end` to the acting employee's room; the session panel shows an inline suggestion

## Phase 5 — Discovered During Implementation

### Deposits
- Employee submits deposit for car NOT in `deposit_paid` state → 409 INVALID_STATE (must change status first)
- Duplicate pending deposit for same car → 409 DUPLICATE_DEPOSIT (only one pending per car at a time)
- CFO tries to confirm/reject an already-confirmed deposit → 409 INVALID_STATE
- Deposit rejected → car auto-reverted to `available`, `car:status_changed` event emitted to dashboard
- `deposit_amount` submitted as decimal string (e.g. "150.5") → `parseInt` strips decimal; backend validates > 0

### Sales
- Close sale for car with status `available` or `withdrawn` → 409 INVALID_STATE
- Close sale twice for same car → 409 DUPLICATE_SALE (check `findSaleByCarId` before insert)
- `final_sale_price < seller_received` → `dealership_revenue` goes negative; allowed (CFO's responsibility), frontend shows warning color on net profit
- `employee_commission` not provided → defaults to `default_commission` from settings cache
- `employee_id` not provided in body → falls back to `car.addedBy` (the employee who added the car)
- `taxPercentage` stored as `Decimal(5,2)` in Prisma; `Number()` coercion needed before arithmetic
- Car transitions to `sold` and `car:status_changed` emitted — consumer site should remove it from listings

### Export
- Export with no matching records → valid empty Excel/PDF still generated (no crash)
- PDF without Arabic font at `backend/assets/fonts/IBMPlexSansArabic-Regular.ttf` → falls back to pdfkit default font; Arabic characters may not render with proper ligatures; place the TTF to fix
- Excel column `numFmt: '#,##0'` formats integers with commas — decimal amounts are truncated since all amounts are `Int`
- `columns` query param is comma-separated list of column keys; unknown keys are silently ignored by `COLUMN_DEFS.filter`

### Reports / Stats
- `GET /sales/stats` is separate from `GET /sales` to keep list pagination clean
- Stats use `aggregate._sum` which returns `null` (not 0) if no rows exist — `?? 0` guard applied in repository
- Date filter `end_date` has its time set to 23:59:59.999 so full-day inclusive filtering works

### Frontend
- `CloseSaleModal` fetches `default_commission` and `tax_percentage` from `/settings` on mount; stale settings only affect pre-fill, not server calculation
- Phone soft-warning uses same regex as backend (`EGYPTIAN_MOBILE_RE`) for consistency
- Export buttons trigger a direct browser download via `<a href>` trick — no Blob needed; auth cookie is sent automatically (same-origin)

### Real-time broadcasts
- Public `/cars` page with active filters → new `car:added` is prepended regardless of filter match (simple behavior); Phase 5+ could filter client-side
- `car:status_changed` to a non-`available` status → public Cars page removes it from state and decrements `total`
- Public CarDetail currently viewing a car that just got sold → error banner replaces the detail UI rather than 500
- Settings updated via UI → `settings:updated` emitted only to `dashboard` room except `numeral_system` and `buyer_can_attach_car` which are public-visible
