# Phase 1 — Foundation + Auth + RBAC (Sonnet)

> Ref: `docs/MASTER_PLAN.md` — Sections 2, 3, 4, 13
> Stack: PostgreSQL + Prisma + Express.js + React (Vite) | JS ES modules, no TS

## Build

### Backend
- **Prisma schema** (`backend/prisma/schema.prisma`): define models for `User`, `Role`, `ModuleAccess` per MASTER_PLAN §3. Use native Prisma enums. UUIDs. All timestamps auto-managed
- `npx prisma migrate dev` for initial migration
- Prisma Client singleton in `src/config/db.js`
- Auth routes `/api/v1/auth`:
  - `POST /login` → validate credentials (bcrypt), issue access JWT (15min) + refresh JWT (7d) in **HTTP-only cookies** (`SameSite=Lax`, `Secure` when `NODE_ENV=production`). Rotate refresh token on each use
  - `POST /logout` → clear cookies
  - `GET /me` → current user + role + permissions from module_access
  - `POST /refresh-token` → read refresh cookie, issue new pair
- **Rate limiting** on login: 5 attempts per 15min, keyed on IP + username
- `authMiddleware`: extract JWT from cookie, verify, attach `req.user`
- `rbacMiddleware(moduleKey)`: check `module_access` where role_id + module_key → `is_enabled`. SuperAdmin bypasses
- **Seed script** (`backend/prisma/seed.js`): 
  - 5 default roles (superadmin, admin, cfo, team_manager, employee) with Arabic display names
  - Default module_access rows per role per MASTER_PLAN §4
  - ONE SuperAdmin user: username `superadmin`, password `246810@Ad` (bcrypt-hashed)
  - No other users — SuperAdmin creates them via UI
  - No password reset flow — SuperAdmin resets via Users page
- User routes `/api/v1/users`: CRUD. RBAC: `users_create`, `users_edit`, `users_delete`. Password set on create, resettable via edit
- Error format: `{ success: false, message, error_code }` / `{ success: true, data }`

### Frontend
- Vite + React 18 + Tailwind CSS (RTL: `dir="rtl"`)
- Google Font: IBM Plex Sans Arabic
- Design tokens from MASTER_PLAN §12 into tailwind.config.js
- Placeholder SVG logo + favicon in `public/`
- `AuthContext`: login/logout/user state, axios with `withCredentials: true` (cookies)
- `ProtectedRoute` → redirects to `/dashboard/login` if no auth
- **Router in App.jsx:**
  - `/` → `PublicLayout` — placeholder pages
  - `/dashboard/login` → Login page (no layout)
  - `/dashboard/*` → `DashboardLayout` wrapped in `ProtectedRoute`
- **Login page** (`/dashboard/login`): centered card, Arabic labels, username + password, green submit. Rate limit feedback ("حاول تاني بعد X دقيقة")
- **DashboardLayout**: RTL sidebar (collapsible, icons+text, active highlight) + top header (user name + role badge + logout). Mobile: bottom nav
- **PublicLayout**: Navbar ("أوتوزين" logo + placeholder links) + Footer
- **Users page** (`/dashboard/users`): table, create/edit modal (username, full_name, password, role dropdown), delete confirm. Password field on create only, separate "reset password" on edit
- **Permissions page** (`/dashboard/permissions`): matrix — rows=modules, columns=roles, toggle switches

## Tests
- Auth: login success/failure, refresh, expiry, rate limit hit
- RBAC: authorized vs unauthorized, SuperAdmin bypass
- Cookies: HTTP-only flag set, cleared on logout
- Edge: invalid token, expired token, deleted user, concurrent sessions

## After
Update `docs/PHASE_TRACKER.md` Phase 1 → ✅