# Phase 7 — Testing & QA with Playwright (Sonnet)

> Ref: `docs/MASTER_PLAN.md` — Section 16 + `tests/edge-cases.md`
> Auth: JWT in HTTP-only cookies. Seed: `superadmin` / `246810@Ad`

## Setup
- Playwright: locale `ar-EG`, RTL
- Viewports: desktop (1280x720), mobile (375x812)
- Test DB: seeded via Prisma seed before each suite
- Auth helper: login via API call, cookies auto-managed by Playwright browser context

## E2E Tests

### 1. Buyer Journey (`tests/e2e/buyer.spec.js`)
- Home loads → Arabic content, logo "أوتوزين"
- /cars → grid renders, filters work (combine brand+price)
- Car details → all specs displayed, seller info HIDDEN, price in ج.م
- Favorites → add/remove via heart, persists on reload (localStorage)
- /employees → available/busy badges, real-time update
- Contact request → submit name+phone → confirmation + countdown
- Timeout → can re-request another employee

### 2. Employee Journey (`tests/e2e/employee.spec.js`)
- Login as employee (create via API seed) → dashboard loads
- Toggle "أنا متاح" → status changes
- Receive contact request (trigger via API) → notification UI
- Accept → session panel visible, status=busy
- Change car → deposit_paid → suggestion modal
- End session → returns to available

### 3. CFO Journey (`tests/e2e/cfo.spec.js`)
- Login as CFO → financial dashboard
- Confirm deposit → car status updated
- Close sale → fill all fields (integer amounts) → submit
- Verify in reports → data matches, calculations correct (integer math)
- Export Excel → file downloads. Export PDF → file downloads

### 4. SuperAdmin Journey (`tests/e2e/admin.spec.js`)
- Login: `superadmin` / `246810@Ad`
- Overview dashboard with stats
- Create employee user → appears in list
- Reset employee password via Users page
- Set permissions → toggles save correctly
- Update settings (e.g. numeral_system) → verify changes
- No password reset page exists (by design)

### 5. Real-Time (`tests/e2e/realtime.spec.js`)
- Consumer /cars in context A + dashboard in context B
- Add car in B → appears in A without refresh
- Change status to 'sold' in B → disappears from A

### 6. Edge Cases (`tests/e2e/edge-cases.spec.js`)
- All items from `tests/edge-cases.md`
- Login rate limit: 5 failures → blocked
- Cookie not sent without `withCredentials` → 401
- Decimal price input → rejected
- Phone soft warning → shows but allows submit
- Numeral system: switch → verify display changes
- Concurrent status changes on same car

### Integration (`tests/integration/`)
- All API endpoints: valid → 200, invalid → 400, no auth → 401, no RBAC → 403
- Cookie lifecycle: set on login, cleared on logout, refreshed on token refresh

### Unit (`tests/unit/`)
- Financial calculations: dealership_revenue, tax_amount (integer math)
- State machine transition validator
- RBAC permission checker
- Numeral formatting util
- Phone validation regex

## After
Run all tests, fix failures. Final `docs/PHASE_TRACKER.md` → all ✅