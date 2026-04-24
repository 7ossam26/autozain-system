# Phase 0 — Project Init & Architecture (Run in PLAN MODE with Opus)

## Context
AutoZain: used car dealership system. Egypt. Arabic only, RTL. React.js + Express.js. VPS + Dokploy.

**DECIDED STACK (from MASTER_PLAN):**
- **DB:** PostgreSQL
- **ORM:** Prisma (`backend/prisma/schema.prisma` is source of truth)
- **Language:** JavaScript ES modules — NO TypeScript
- **Auth:** JWT in HTTP-only cookies (SameSite=Lax, Secure in prod)
- **Money:** All amounts INTEGER (whole EGP, no decimals)
- **Process:** Single Node process

**ARCHITECTURE:** Single repo. One React app with route-based split:
- `/` → Public site (buyers) — NO AUTH
- `/dashboard/*` → Business site — AUTH REQUIRED
- Express serves React static build + API (`/api/v1/*`) + Socket.io — all on same port
- Single PostgreSQL database shared between both sides
- **Seller has NO access** — employees add cars on behalf of sellers

## Instructions

1. Read `MASTER_PLAN.md` in full — it's the bible for this project.

2. Create the project scaffold:
```
autozain/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Prisma schema (source of truth for DB)
│   ├── src/
│   │   ├── config/               # db (prisma client), env, constants
│   │   ├── middleware/            # auth, rbac, upload, errorHandler, rateLimiter
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── socket/
│   │   └── app.js
│   ├── uploads/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   │   ├── PublicLayout.jsx
│   │   │   │   └── DashboardLayout.jsx
│   │   │   └── shared/
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   └── dashboard/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/sw.js
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── tests/
├── docs/MASTER_PLAN.md
├── docs/PHASE_TRACKER.md
├── prompts/                      # Phase prompt files
├── package.json
└── README.md
```

3. Create PHASE_TRACKER.md, tests/edge-cases.md (from MASTER_PLAN §16), README.md

4. Plan the Prisma schema based on MASTER_PLAN §3. Note:
   - All money fields are `Int` (whole EGP)
   - Use Prisma native enums for status fields
   - UUID primary keys via `@default(uuid())`
   - JSON columns use Prisma `Json` type

5. Plan the `.env.example` with: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_DOMAIN, NODE_ENV, FRONTEND_URL, BACKEND_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

## Output
Produce a plan covering the full scaffold. Do NOT write code — this is Plan Mode.