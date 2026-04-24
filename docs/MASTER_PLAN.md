# AutoZain — Master Production Plan
# Phase 0: Architecture, Rules & Execution Guide
---
> **Project:** AutoZain — Used Car Dealership Management System
> **Location:** Egypt (Egyptian Market)
> **Language:** Arabic Only (RTL)
> **Design Reference:** Sylndr.com (layout, card style, filter UX)
> **Date:** April 2026

---

## TABLE OF CONTENTS
1. System Overview & Business Logic
2. Tech Stack & Architecture
3. Database Schema
4. Role & Permission System (RBAC)
5. Settings Engine (Configurable Items)
6. Consumer Site (Public) — Buyer Journey
7. Employee Flow & Session Management
8. Notification System (Push + Audio + Vibration)
9. Real-Time Engine (WebSocket)
10. Financial Module & CFO Flow
11. Car State Machine & Audit Log
12. UI/UX Design System (Sylndr-Inspired)
13. Project Structure & Conventions
14. Phase Breakdown (Phases 1–7)
15. Phase Prompts (Copy-Paste for Claude Code)
16. Testing Strategy & Edge Cases

---

## 1. SYSTEM OVERVIEW & BUSINESS LOGIC

AutoZain is a used car dealership in Egypt. They do NOT buy cars — they host other people's cars on their lot and facilitate sales. The system has two sides:

### Architecture Split — IMPORTANT
**Single React App, Route-Based Split, One Repo:**
- `/` → Public site (buyers) — `PublicLayout` (Navbar + Footer) — NO AUTH
- `/dashboard/*` → Business site (employees, CFO, admin) — `DashboardLayout` (Sidebar + Header) — AUTH REQUIRED
- Express serves React static build (`frontend/dist`) + API (`/api/v1/*`) + Socket.io — all on same port
- Single database shared between both sides
- **Seller has NO access to the system** — employees add cars on behalf of sellers

### Consumer Site (Public — No Auth, Routes: `/`, `/cars`, `/cars/:id`, `/favorites`, `/employees`)
- Buyers browse available cars as guests (no registration)
- Smart search & filtering
- Favorites saved in localStorage
- Buyer sees list of available employees and sends a contact request (name + phone only)
- Employee receives notification → contacts buyer externally (phone) → closes or ends session
- No payments, no chat, no negotiation inside the system

### Business Dashboard (Auth Required — Username/Password, Routes: `/dashboard/*`)
- Employees add cars (with seller info bundled together)
- Employees manage sessions with buyers
- CFO closes sales end-of-day, enters final financial data
- Team Manager monitors employees live
- SuperAdmin controls everything — module access per role, settings, user creation
- All car state changes logged in audit trail

### Revenue Model
- Dealership takes a cut after the sale is completed
- CFO enters: final sale price (what buyer paid), how much seller received, how much dealership kept, employee commission
- No money changes hands inside the system — all transactions happen in person

---

## 2. TECH STACK & ARCHITECTURE

```
┌─────────────────────────────────────────────────┐
│                   VPS (Dokploy)                  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │           Express.js Server               │    │
│  │                                           │    │
│  │  ┌─────────────┐  ┌──────────────────┐   │    │
│  │  │  REST API    │  │  Socket.io Server │   │    │
│  │  │  /api/*      │  │  Real-time events │   │    │
│  │  └─────────────┘  └──────────────────┘   │    │
│  │                                           │    │
│  │  ┌─────────────────────────────────────┐  │    │
│  │  │  Static Files (React Build)          │  │    │
│  │  │  Serves: index.html + assets         │  │    │
│  │  └─────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────┐     │
│  │  Database     │  │  File Storage        │     │
│  │  (TBD)        │  │  /uploads            │     │
│  └──────────────┘  └──────────────────────┘     │
└─────────────────────────────────────────────────┘
```

### Stack Details
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React.js 18+ | Vite build, served as static by Express |
| Backend | Express.js | REST API + Socket.io on same server |
| Real-time | Socket.io | Car updates, employee status, notifications |
| Auth | JWT (jsonwebtoken) | Access + Refresh tokens, stored in HTTP-only cookies |
| Password | bcrypt | Hashing |
| Database | PostgreSQL | Single shared DB for public + dashboard sides |
| ORM | Prisma | Schema in `prisma/schema.prisma`; migrations via `prisma migrate` |
| Language | JavaScript (ES modules) | No TypeScript |
| Process model | Single Node process (v1) | Settings cache is in-memory; multi-instance deferred |
| File Upload | multer | Car images, inspection reports, license photos |
| Push Notifications | web-push | VAPID keys, Service Worker |
| Export | exceljs + pdfkit | Report generation |
| Styling | Tailwind CSS | RTL support via `dir="rtl"` |
| Icons | Lucide React or React Icons | Clean, minimal |
| State Management | React Context + useReducer | No Redux needed at this scale |
| HTTP Client | Axios | API calls from React |
| Deployment | Dokploy on VPS | Single container, Express serves everything |

### Folder Structure
```
autozain/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, env, constants
│   │   ├── middleware/       # auth, rbac, upload, errorHandler
│   │   ├── routes/           # cars, auth, users, financial, settings, notifications
│   │   ├── controllers/      # business logic per route
│   │   ├── models/           # DB models/schemas
│   │   ├── services/         # carService, notificationService, socketService, exportService
│   │   ├── utils/            # helpers, validators, auditLogger
│   │   ├── socket/           # Socket.io event handlers
│   │   └── app.js            # Express + Socket.io setup
│   ├── uploads/              # car images, reports, license photos
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── assets/           # fonts, static images
│   │   ├── components/       # shared UI components
│   │   │   ├── ui/           # Button, Input, Card, Badge, Modal, Toast
│   │   │   ├── layout/
│   │   │   │   ├── PublicLayout.jsx    # Navbar + Footer (for / routes)
│   │   │   │   ├── DashboardLayout.jsx # Sidebar + Header (for /dashboard routes)
│   │   │   │   └── MobileNav.jsx       # Bottom nav for mobile
│   │   │   └── shared/       # CarCard, EmployeeCard, FilterBar, SearchBar
│   │   ├── pages/
│   │   │   ├── public/       # Home, CarListing, CarDetails, EmployeeList
│   │   │   └── dashboard/    # Login, Cars, AddCar, Financial, Settings, Users, Archive, Reports
│   │   ├── context/          # AuthContext, SocketContext, NotificationContext
│   │   ├── hooks/            # useAuth, useSocket, useCars, useNotification
│   │   ├── services/         # api.js (axios instance), socket.js
│   │   ├── utils/            # formatters, validators, constants
│   │   ├── styles/           # tailwind config, global CSS, RTL overrides
│   │   ├── sw/               # Service Worker for Push Notifications
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── sw.js             # Service Worker file
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── tests/
│   ├── e2e/                  # Playwright E2E tests
│   ├── integration/          # API integration tests
│   ├── unit/                 # Unit tests
│   └── edge-cases.md         # Edge cases document (updated per phase)
├── docs/
│   ├── MASTER_PLAN.md        # This file
│   ├── API.md                # API documentation
│   └── PHASE_TRACKER.md      # Phase completion tracker
├── playwright.config.js
├── package.json              # Root scripts (dev, build, test)
└── README.md
```

---

## 3. DATABASE SCHEMA

> **Database:** PostgreSQL. **ORM:** Prisma. The tables below describe the logical schema; the source of truth is `backend/prisma/schema.prisma`. JSON columns map to Prisma `Json` type. Enums are Postgres native enums.

### Users Table
```
users
├── id                    (PK, UUID)
├── username              (UNIQUE, NOT NULL)
├── password_hash         (NOT NULL)
├── full_name             (NOT NULL)
├── role_id               (FK → roles.id)
├── status                (ENUM: 'available', 'busy', 'offline')
├── avatar_url            (NULLABLE)
├── push_subscription     (JSON, NULLABLE — Web Push subscription object)
├── max_concurrent        (INT, DEFAULT 1 — max simultaneous buyer sessions)
├── is_active             (BOOLEAN, DEFAULT true)
├── created_at            (TIMESTAMP)
├── updated_at            (TIMESTAMP)
└── created_by            (FK → users.id, NULLABLE)
```

### Roles Table
```
roles
├── id                    (PK, UUID)
├── name                  (UNIQUE — 'superadmin', 'admin', 'cfo', 'team_manager', 'employee')
├── display_name_ar       (NOT NULL — 'مدير النظام', 'شريك', 'مدير حسابات', 'مدير فريق', 'موظف')
├── is_system             (BOOLEAN — true for default roles, cannot be deleted)
├── created_at            (TIMESTAMP)
└── updated_at            (TIMESTAMP)
```

### Module Access Table (Dynamic RBAC)
```
module_access
├── id                    (PK, UUID)
├── role_id               (FK → roles.id)
├── module_key            (VARCHAR — e.g. 'cars_view', 'cars_add', 'cars_edit', 'cars_delete',
│                           'cars_change_status', 'financial_view', 'financial_close_sale',
│                           'reports_view', 'reports_export', 'settings_view', 'settings_edit',
│                           'users_view', 'users_create', 'users_edit', 'users_delete',
│                           'archive_view', 'employee_monitor', 'permissions_manage')
├── is_enabled            (BOOLEAN, DEFAULT false)
├── updated_at            (TIMESTAMP)
└── updated_by            (FK → users.id)
```

### Cars Table
```
cars
├── id                    (PK, UUID)
├── car_type              (VARCHAR — brand/make, e.g. 'Mitsubishi')
├── model                 (VARCHAR — e.g. 'Lancer')
├── listing_price         (INTEGER — سعر العرض، جنيه مصري بدون كسور)
├── license_info          (VARCHAR — تراخيص / رخصة الملكية)
├── transmission          (ENUM: 'automatic', 'manual')
├── plate_number          (VARCHAR — النمر / اللوحة المعدنية)
├── odometer              (INT — عداد الكيلومترات)
├── color                 (VARCHAR, NULLABLE — اللون, optional)
├── fuel_type             (ENUM: 'benzine', 'diesel', 'gas', 'electric', 'hybrid', NULLABLE — optional)
├── additional_info       (TEXT, NULLABLE — معلومات إضافية)
├── inspection_image_url  (VARCHAR, NULLABLE — صورة تقرير الفحص)
├── status                (ENUM: 'available', 'deposit_paid', 'sold', 'withdrawn')
├── images                (JSON ARRAY of URLs — صور العربية)
├── seller_name           (VARCHAR — اسم البائع)
├── seller_phone          (VARCHAR — رقم تواصل البائع)
├── seller_residence      (VARCHAR — محل إقامة البائع)
├── seller_license_front  (VARCHAR, NULLABLE — صورة الرخصة وجه)
├── seller_license_back   (VARCHAR, NULLABLE — صورة الرخصة ظهر)
├── added_by              (FK → users.id — الموظف اللي ضاف العربية)
├── created_at            (TIMESTAMP)
└── updated_at            (TIMESTAMP)
```

### Contact Requests Table (Buyer → Employee)
```
contact_requests
├── id                    (PK, UUID)
├── buyer_name            (VARCHAR)
├── buyer_phone           (VARCHAR)
├── employee_id           (FK → users.id)
├── interested_car_id     (FK → cars.id, NULLABLE — optional, configurable)
├── status                (ENUM: 'pending', 'accepted', 'rejected', 'expired', 'completed')
├── accepted_at           (TIMESTAMP, NULLABLE)
├── completed_at          (TIMESTAMP, NULLABLE)
├── outcome               (ENUM: 'sold', 'interested', 'no_answer', 'cancelled', NULLABLE)
├── created_at            (TIMESTAMP)
└── updated_at            (TIMESTAMP)
```

### Queue Table (When all employees busy)
```
buyer_queue
├── id                    (PK, UUID)
├── buyer_name            (VARCHAR)
├── buyer_phone           (VARCHAR)
├── interested_car_id     (FK → cars.id, NULLABLE)
├── status                (ENUM: 'waiting', 'assigned', 'expired')
├── assigned_employee_id  (FK → users.id, NULLABLE)
├── assigned_at           (TIMESTAMP, NULLABLE)
├── created_at            (TIMESTAMP)
└── updated_at            (TIMESTAMP)
```

### Sales Table (CFO Closes Sales)
```
sales
├── id                    (PK, UUID)
├── car_id                (FK → cars.id)
├── employee_id           (FK → users.id — الموظف اللي قفل البيعة)
├── closed_by             (FK → users.id — CFO اللي قفل الحساب)
├── final_sale_price      (INTEGER — السعر النهائي، جنيه)
├── seller_received       (INTEGER — اللي البائع استلمه، جنيه)
├── dealership_revenue    (INTEGER — اللي المعرض خده، جنيه)
├── employee_commission   (INTEGER, DEFAULT 0 — عمولة الموظف، جنيه)
├── deposit_amount        (INTEGER, DEFAULT 0 — مبلغ العربون، جنيه)
├── tax_percentage        (DECIMAL, DEFAULT 0 — نسبة الضريبة %)
├── tax_amount            (INTEGER, DEFAULT 0 — مبلغ الضريبة، جنيه)
├── buyer_name            (VARCHAR — اسم المشتري)
├── buyer_phone           (VARCHAR — رقم المشتري)
├── payment_method        (VARCHAR, NULLABLE — كاش/تحويل)
├── notes                 (TEXT, NULLABLE)
├── sale_date             (TIMESTAMP)
├── created_at            (TIMESTAMP)
└── updated_at            (TIMESTAMP)
```

### Deposit Requests Table
```
deposit_requests
├── id                    (PK, UUID)
├── car_id                (FK → cars.id)
├── employee_id           (FK → users.id — الموظف اللي قدم الطلب)
├── deposit_amount        (INTEGER — جنيه)
├── buyer_name            (VARCHAR)
├── buyer_phone           (VARCHAR)
├── status                (ENUM: 'pending', 'confirmed', 'rejected', 'refunded')
├── confirmed_by          (FK → users.id, NULLABLE — CFO)
├── confirmed_at          (TIMESTAMP, NULLABLE)
├── notes                 (TEXT, NULLABLE)
├── created_at            (TIMESTAMP)
└── updated_at            (TIMESTAMP)
```

### Audit Log Table
```
audit_log
├── id                    (PK, UUID)
├── entity_type           (VARCHAR — 'car', 'sale', 'deposit', 'user', 'setting')
├── entity_id             (UUID — ID of the affected record)
├── action                (VARCHAR — 'status_change', 'create', 'update', 'delete')
├── old_value             (JSON, NULLABLE)
├── new_value             (JSON, NULLABLE)
├── performed_by          (FK → users.id)
├── ip_address            (VARCHAR, NULLABLE)
├── created_at            (TIMESTAMP)
```

### Settings Table (Key-Value, Configurable)
```
settings
├── id                    (PK, UUID)
├── key                   (UNIQUE VARCHAR)
├── value                 (TEXT — JSON-encoded value)
├── description_ar        (VARCHAR — وصف بالعربي)
├── category              (VARCHAR — 'general', 'employee', 'buyer', 'financial', 'notifications')
├── updated_by            (FK → users.id, NULLABLE)
└── updated_at            (TIMESTAMP)
```

**Default Settings Seed Data:**
```
| key                        | default value | description_ar                                      |
|----------------------------|---------------|-----------------------------------------------------|
| request_timeout_minutes    | 5             | المدة قبل ما المشتري يقدر يطلب موظف تاني          |
| escalation_enabled         | false         | تفعيل نظام التصعيد                                  |
| escalation_timeout_seconds | 300           | مدة التصعيد بالثواني                                 |
| max_car_images             | 10            | الحد الأقصى لعدد صور العربية                         |
| max_concurrent_requests    | 1             | الحد الأقصى للطلبات المتزامنة لكل موظف              |
| default_commission         | 0             | عمولة الموظف الافتراضية                              |
| tax_percentage             | 0             | نسبة الضريبة                                        |
| employee_can_edit_car      | false         | الموظف يقدر يعدل بيانات العربية                     |
| employee_can_delete_car    | false         | الموظف يقدر يمسح العربية                            |
| employee_can_change_status | true          | الموظف يقدر يغير حالة العربية                       |
| buyer_can_attach_car       | false         | المشتري يقدر يرفق العربية المهتم بيها في الطلب      |
| employee_display_mode      | 'list'        | طريقة عرض الموظفين (list/auto_assign)               |
| notification_repeat        | true          | إعادة الإشعار مرة تانية بعد دقيقة                   |
| notification_sound         | 'default'     | صوت الإشعار                                          |
| numeral_system             | 'western'     | نظام الأرقام (western: 1,2,3 / arabic: ١,٢,٣)        |
```

### Bootstrap Seed (run once on fresh DB)
- **Roles:** all five default roles inserted (`superadmin`, `admin`, `cfo`, `team_manager`, `employee`) with their Arabic display names.
- **Module access:** default `module_access` rows per role per §4 (SuperAdmin gets nothing — bypassed in middleware).
- **SuperAdmin user (the ONLY user seeded):** username `superadmin`, password `246810@Ad` (bcrypt-hashed). Documented here so the seed is reproducible; rotate after first deployment. No example users for the other roles — SuperAdmin creates them via the Users page.
- **No password-reset/forgot-password flow.** SuperAdmin (or anyone with `users_edit`) resets passwords manually via the Users page.
- **Settings:** all default rows from the settings table inserted.

### Runtime Defaults (configurable via `.env`)
- **Cookies:** `HttpOnly; SameSite=Lax; Secure` (Secure auto-disabled when `NODE_ENV=development`). `COOKIE_DOMAIN` env var (empty → host-only cookie).
- **JWT lifetimes:** access token 15 min, refresh token 7 days (rotated on each refresh).
- **Login rate limit:** 5 attempts per 15 min, keyed on IP + username.
- **Image uploads:** 5 MB max per file; JPEG, PNG, WebP only.
- **URLs:** `FRONTEND_URL` and `BACKEND_URL` in `.env` (default `http://localhost:5173` and `http://localhost:3000` for dev).
- **Branding:** placeholder SVG logo + favicon shipped in `frontend/public/` until real assets are provided.

### Input Format Rules
- **Phone numbers (buyer + seller):** No strict regex enforcement. Show a soft inline warning ("الرقم ممكن يكون غلط — راجعه") if the value doesn't look like an Egyptian mobile (`^01[0125]\d{8}$` or `+20…`), but always allow submission.
- **Currency:** Integers only. All amount fields (`listing_price`, `final_sale_price`, `seller_received`, `dealership_revenue`, `employee_commission`, `deposit_amount`, `tax_amount`) are stored and entered as whole EGP. No decimal input in forms.
- **Numerals in UI:** Default Western Arabic digits (1, 2, 3). The `numeral_system` setting can switch to Arabic-Indic (١, ٢, ٣) globally.

---

## 4. ROLE & PERMISSION SYSTEM (RBAC)

### Default Roles & Capabilities

#### SuperAdmin (Zein)
- FULL access to everything
- Manages module_access table (gives/revokes access per role)
- Creates/edits/deletes users and roles
- Manages settings
- Cannot be deleted or demoted

#### Admin (Business Partner)
- Same as SuperAdmin EXCEPT: cannot manage permissions (module_access)
- Everything else controlled by SuperAdmin via module_access

#### CFO (Chief Financial Officer)
- Default access: financial_view, financial_close_sale, reports_view, reports_export
- No access to: cars page, employee monitoring (unless SuperAdmin enables)
- Confirms deposit requests
- Closes sales one-by-one with financial details
- Exports reports (Excel/PDF)

#### Team Manager
- Default access: employee_monitor, cars_view
- Live monitoring of all employees (status, current sessions)
- Employee performance stats
- Can distribute requests (future feature, currently configurable)

#### Employee
- Default access: cars_add, cars_change_status (configurable)
- Adds cars with seller info
- Receives buyer contact requests
- Manages sessions (accept/reject/end)
- Submits deposit requests to CFO

### RBAC Middleware Logic
```
1. Request comes in → extract JWT → get user.role_id
2. Check module_access table: WHERE role_id = user.role_id AND module_key = required_module
3. If is_enabled = true → allow
4. If is_enabled = false → 403 Forbidden
5. SuperAdmin bypasses all checks
```

---

## 5. SETTINGS ENGINE

All configurable items are stored in the `settings` table. The Settings page is accessible based on module_access ('settings_view', 'settings_edit').

### Settings Categories:
1. **عام (General):** employee_display_mode, max_car_images
2. **الموظفين (Employee):** max_concurrent_requests, employee_can_edit_car, employee_can_delete_car, employee_can_change_status
3. **المشتري (Buyer):** request_timeout_minutes, buyer_can_attach_car
4. **المالية (Financial):** default_commission, tax_percentage
5. **الإشعارات (Notifications):** escalation_enabled, escalation_timeout_seconds, notification_repeat, notification_sound

Settings are cached in memory on server start and refreshed on update via Socket.io broadcast.

---

## 6. CONSUMER SITE (PUBLIC) — BUYER JOURNEY

### Pages:
1. **الرئيسية (Home)** — Hero + featured cars + search bar
2. **العربيات المتاحة (Car Listing)** — Grid/list with filters (Sylndr-style)
3. **تفاصيل العربية (Car Details)** — Image gallery + specs + inspection report
4. **الموظفين المتاحين (Available Employees)** — List of available employees + request form
5. **المفضلة (Favorites)** — Cars saved in localStorage

### Car Listing Page — Filters:
- نوع العربية (Brand/Make)
- الموديل (Model)
- سعر العرض (Price range — min/max slider)
- ناقل الحركة (Transmission — automatic/manual)
- العداد (Odometer — range)
- اللون (Color — if provided)
- نوع الوقود (Fuel — if provided)
- Sort by: السعر (تصاعدي/تنازلي), الأحدث, الأقدم, العداد

### Car Details Page:
- Image gallery (swipeable on mobile)
- Car specs in badge/pill format (Sylndr-style): KM, Transmission, Plate, Year
- Listing price (prominent)
- Inspection report image (if available, with disclaimer)
- Additional info section
- "تواصل مع موظف" CTA button → navigates to employee list
- Add to favorites button (heart icon)

### Employee Selection & Contact Request Flow:
```
1. Buyer clicks "تواصل مع موظف" on any page
2. Buyer sees list of employees:
   - Available employees: show name + green "متاح" badge + "تواصل" button
   - Busy employees: show name + orange "مشغول" badge (button disabled)
3. Buyer clicks "تواصل" on an available employee
4. Modal appears: "أدخل اسمك ورقم موبايلك" (name + phone fields)
   - Optional: interested car dropdown (if setting enabled)
5. Buyer submits → contact_request created (status: 'pending')
6. Employee receives: Web Push + Audio + Vibration
7. Buyer sees confirmation: "تم إرسال طلبك — الموظف هيتواصل معاك في أقرب وقت"
8. Timer starts (configurable timeout)
9. If employee doesn't respond within timeout → buyer can re-request another employee
10. If ALL employees busy → buyer enters queue → assigned when someone is free
```

### Queue Flow:
```
1. All employees busy → buyer sees: "مفيش موظف متاح دلوقتي — هنبلغك أول ما حد يفضى"
2. Buyer enters name + phone → added to buyer_queue (status: 'waiting')
3. When an employee becomes available → Socket.io event → auto-assign oldest queue entry
4. Employee receives notification about queued buyer
```

---

## 7. EMPLOYEE FLOW & SESSION MANAGEMENT

### Status Lifecycle:
```
[Logs In] → offline (default)
    ↓
[Clicks "أنا متاح" toggle] → available
    ↓
[Receives contact request] → busy (auto)
    ↓
[Accepts & contacts buyer] → busy (in session)
    ↓
[Changes car status OR clicks End] → available
    ↓
[Clicks "أنا مش متاح" toggle] → offline
```

### Session Actions:
1. **Accept** — Employee sees buyer info (name + phone), starts session
2. **Reject** — Request goes back to "available pool" or escalates
3. **Change car status** — If employee changes car to 'deposit_paid', system suggests: "عايز تنهي الجلسة؟" (Yes/No)
4. **End session** — Employee clicks End, status returns to available
5. **Timeout** — If employee doesn't respond within timeout, request expires or escalates

### Notification received by employee:
```
{
  type: 'new_contact_request',
  buyer_name: 'أحمد محمد',
  buyer_phone: '01012345678',
  interested_car: 'Mitsubishi Lancer 2020' (if enabled),
  request_id: 'uuid'
}
```

### Repeat notification logic:
- First notification: immediate (Push + Audio + Vibration)
- If no response after 60 seconds: repeat once more
- If still no response after timeout: request expires → buyer can re-request

---

## 8. NOTIFICATION SYSTEM

### Web Push Notifications (Service Worker)
```
Implementation:
1. Generate VAPID keys (server-side, stored in .env)
2. Service Worker registered on first load (sw.js in public/)
3. On employee login → browser asks permission
4. If granted → subscription object sent to backend → stored in users.push_subscription
5. If denied → show persistent banner: "لازم تسمح بالإشعارات عشان توصلك الطلبات"
6. Backend uses web-push library to send notifications
```

### In-App Audio Alert (Web Audio API)
```
Implementation:
1. Preload notification sound on app mount
2. On 'new_contact_request' socket event → play audio
3. Mute toggle available in employee's personal settings
4. Sound plays ONLY when app is open/focused
```

### Vibration Alert (Vibration API)
```
Implementation:
1. On 'new_contact_request' socket event → navigator.vibrate([200, 100, 200])
2. Only works on mobile devices with vibration support
3. Graceful fallback if not supported
```

### Notification Events Matrix:
| Event | Who gets notified | Channel |
|-------|------------------|---------|
| New contact request | Target employee | Push + Audio + Vibration |
| Request timeout/escalation | Next available employee | Push + Audio + Vibration |
| Queue assignment | Assigned employee | Push + Audio + Vibration |
| New car added | All connected clients (broadcast) | Socket.io (real-time UI update) |
| Deposit request submitted | CFO | In-app notification |
| Sale closed by CFO | Employee (who sold) | In-app notification |

---

## 9. REAL-TIME ENGINE (SOCKET.IO)

### Socket Events:

#### Server → Client (Broadcasts)
| Event | Payload | Audience |
|-------|---------|----------|
| `car:added` | Full car object | ALL (public + dashboard) |
| `car:updated` | Updated car object | ALL |
| `car:status_changed` | { carId, newStatus } | ALL |
| `employee:status_changed` | { employeeId, newStatus } | Public site + Team Manager |
| `contact_request:new` | Request details | Target employee |
| `contact_request:timeout` | { requestId } | Target employee + buyer |
| `queue:assigned` | { buyerName, buyerPhone } | Assigned employee |
| `deposit:submitted` | Deposit details | CFO users |
| `sale:closed` | Sale summary | Selling employee |
| `settings:updated` | { key, value } | ALL dashboard users |

#### Client → Server
| Event | Payload | From |
|-------|---------|------|
| `employee:toggle_status` | { status: 'available'/'offline' } | Employee |
| `contact_request:accept` | { requestId } | Employee |
| `contact_request:reject` | { requestId } | Employee |
| `session:end` | { requestId } | Employee |

### Room Structure:
- `public` — all public site visitors (for car broadcasts)
- `dashboard` — all logged-in users
- `employee:{id}` — individual employee channel
- `role:cfo` — all CFO users
- `role:team_manager` — all team managers

---

## 10. FINANCIAL MODULE & CFO FLOW

### CFO Dashboard:
1. **بيعات بتستنى تقفيل (Pending Sales)** — Cars with status 'sold' or 'deposit_paid' that haven't been financially closed yet
2. **قفل البيعة (Close Sale Form):**
   - السعر النهائي (Final sale price)
   - المبلغ اللي البائع استلمه (Seller received)
   - المبلغ اللي المعرض خده (Dealership cut — auto-calculated)
   - عمولة الموظف (Employee commission — default from settings)
   - اسم المشتري (Buyer name)
   - رقم المشتري (Buyer phone)
   - طريقة الدفع (Payment method — optional)
   - ملاحظات (Notes — optional)
   - ضريبة (Tax — auto-calculated from settings percentage)
3. **تأكيد العربون (Confirm Deposit)** — List of pending deposit requests from employees
4. **التقارير (Reports):**
   - Filterable by: date range, employee, car type, status
   - Columns (all toggleable): car name, listing price, sale price, seller received, dealership cut, commission, employee name, sale date, buyer name+phone, seller name+phone, net profit
   - Export to Excel (.xlsx) and PDF
5. **الأرشيف (Archive):** View sold/withdrawn cars (access controlled via module_access)

### Deposit Flow:
```
1. Employee changes car status to 'deposit_paid'
2. System prompts: "أدخل مبلغ العربون واسم المشتري"
3. deposit_request created (status: 'pending')
4. CFO receives in-app notification
5. CFO reviews and confirms/rejects
6. If confirmed → car stays 'deposit_paid'
7. If rejected → car returns to 'available' + audit logged
8. If buyer cancels → employee or CFO changes car back to 'available' + audit logged
```

---

## 11. CAR STATE MACHINE & AUDIT LOG

### State Transitions:
```
                 ┌──────────────┐
                 │   متاحة      │ (Available)
                 │  available    │
                 └──────┬───────┘
                        │
              ┌─────────┼─────────┐
              ▼                    ▼
    ┌──────────────┐     ┌──────────────┐
    │  تم دفع عربون │     │   مسحوبة     │ (Withdrawn)
    │ deposit_paid  │     │  withdrawn    │
    └──────┬───────┘     └──────────────┘
           │
           ├──────────────────┐
           ▼                  ▼
    ┌──────────────┐   (Back to available
    │    مباعة     │    if buyer cancels)
    │    sold      │
    └──────────────┘
```

### Who Can Change What:
| From | To | Who |
|------|----|-----|
| available | deposit_paid | Employee (if enabled in settings) |
| available | withdrawn | Employee (if enabled) or Admin/SuperAdmin |
| deposit_paid | available | Employee or CFO (audit logged) |
| deposit_paid | sold | Employee or CFO |
| sold | — | Final state (no changes, goes to archive) |
| withdrawn | available | Admin/SuperAdmin only |

### Audit Log Entry:
Every state change creates an audit_log record:
```json
{
  "entity_type": "car",
  "entity_id": "car-uuid",
  "action": "status_change",
  "old_value": { "status": "available" },
  "new_value": { "status": "deposit_paid" },
  "performed_by": "user-uuid",
  "created_at": "2026-04-23T14:30:00Z"
}
```

---

## 12. UI/UX DESIGN SYSTEM (SYLNDR-INSPIRED)

### Design Tokens:
```css
:root {
  /* Colors — Clean, modern, Sylndr-inspired */
  --color-primary: #00C853;         /* Green — primary actions */
  --color-primary-dark: #009624;
  --color-primary-light: #E8F5E9;
  --color-secondary: #1A1A2E;       /* Dark navy — headers, text */
  --color-accent: #FF6B35;          /* Orange — badges, alerts */
  --color-background: #F5F5F5;      /* Light gray — page bg */
  --color-surface: #FFFFFF;         /* White — cards */
  --color-text-primary: #1A1A2E;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-border: #E5E7EB;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
  --color-success: #10B981;

  /* Typography */
  --font-family: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  /* Spacing */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

### Component Patterns (Sylndr-Inspired):
1. **Car Card:** Image top, specs in pills below, price prominent, favorite heart icon
2. **Filter Sidebar:** Collapsible sections, checkboxes for multi-select, range sliders for price/km
3. **Car Details:** Full-width image gallery, specs grid, sticky CTA bar on mobile
4. **Employee Card:** Avatar placeholder, name, status badge (green=available, orange=busy)
5. **Dashboard Sidebar:** Collapsible, icon + text, active state highlight
6. **Tables:** Clean, zebra striping, sortable headers, pagination
7. **Forms:** Floating labels, right-aligned, validation inline
8. **Modals:** Centered, backdrop blur, slide-up on mobile
9. **Toasts:** Top-right for desktop, top-center for mobile

### RTL Considerations:
- All `text-align: right` by default
- Flex direction reversal via Tailwind `rtl:` utilities
- Icons that imply direction must be flipped (arrows, chevrons)
- Number formatting: use Arabic-Indic numerals option (configurable) or Western Arabic
- Currency: always suffix "ج.م" (EGP)

---

## 13. CODING CONVENTIONS & RULES

### For Claude Code — Follow These Rules:

1. **Language:** All UI text in Arabic. All code (variables, comments, docs) in English
2. **File naming:** camelCase for files, PascalCase for React components
3. **API routes:** RESTful, nested under `/api/v1/`
4. **Error handling:** Centralized error middleware, all errors return `{ success: false, message, error_code }`
5. **Success responses:** `{ success: true, data, meta: { total, page, limit } }`
6. **Validation:** Validate on BOTH frontend and backend. Backend validation is source of truth
7. **Auth:** JWT in HTTP-only cookie (access + refresh). Socket.io handshake reads the same cookie server-side (same-origin: Express serves the SPA).
8. **RBAC check:** Every protected route goes through `authMiddleware` → `rbacMiddleware(module_key)`
9. **Socket auth:** Authenticate socket connections with JWT token
10. **Commits:** Conventional commits (feat:, fix:, chore:, docs:, test:)
11. **No hardcoded strings:** All configurable values come from settings table
12. **Audit everything:** Every state change, every permission change, every financial action
13. **Responsive:** Mobile-first design. Test at 375px, 768px, 1280px
14. **Performance:** Paginate all lists (default 20 items). Lazy load images. Debounce search
15. **Security:** Sanitize all inputs. Rate limit auth endpoints. CORS configured properly
16. **Language:** JavaScript only (ES modules), no TypeScript. JSDoc for non-obvious function signatures
17. **Repository pattern:** Controllers/services NEVER call Prisma client directly — always go through `repositories/*.js`. Prisma stays isolated to the repository layer
18. **Uploads volume:** `backend/uploads/` must be mounted as a persistent Docker volume in Dokploy (otherwise images vanish on container restart)
19. **Push subscriptions:** When `web-push` returns `410 Gone`, null out `users.push_subscription` immediately

---

## 14. PHASE BREAKDOWN

### Phase 1: Foundation (Project Setup + Auth + Roles)
**Goal:** Bootable project with auth system and RBAC
**Deliverables:**
- [ ] Initialize React (Vite) + Express project structure
- [ ] Database connection setup (adapter pattern for TBD DB)
- [ ] Users, Roles, ModuleAccess tables/models
- [ ] Auth routes: POST /login, POST /logout, GET /me, POST /refresh-token
- [ ] JWT middleware (access + refresh tokens)
- [ ] RBAC middleware (checks module_access)
- [ ] Seed script: create SuperAdmin user + default roles + default module_access
- [ ] Login page (Arabic, RTL, clean design)
- [ ] Dashboard layout shell (sidebar + header + content area)
- [ ] Protected route wrapper component
- [ ] User management page (SuperAdmin): create/edit/delete users
- [ ] Permission management page (SuperAdmin): toggle module_access per role

**Testing (Phase 1):**
- [ ] Auth flow: login success, login failure, token refresh, token expiry
- [ ] RBAC: authorized access, unauthorized access, SuperAdmin bypass
- [ ] Edge cases: invalid token, expired token, deleted user trying to access

---

### Phase 2: Car Management + Seller Data
**Goal:** Full car CRUD with seller info, images, state machine, audit log
**Deliverables:**
- [ ] Cars, AuditLog tables/models
- [ ] Car routes: GET /cars, GET /cars/:id, POST /cars, PUT /cars/:id, PATCH /cars/:id/status, DELETE /cars/:id
- [ ] Image upload (multer) — car images, inspection report, seller license photos
- [ ] Car state machine with transition validation
- [ ] Audit log service — logs every state change
- [ ] Settings table + seed with default values
- [ ] Settings routes: GET /settings, PUT /settings/:key
- [ ] Dashboard — Cars page: table view with filters, status badges
- [ ] Dashboard — Add Car form: all fields + seller info + image uploads
- [ ] Dashboard — Car Detail view: full info + seller info (restricted to authorized roles)
- [ ] Dashboard — Settings page: grouped by category, editable

**Testing (Phase 2):**
- [ ] Car CRUD: create, read, update, delete
- [ ] State transitions: valid transitions pass, invalid transitions blocked
- [ ] Image upload: success, file too large, invalid format
- [ ] Audit log: verify entries created on state change
- [ ] Edge cases: employee tries to edit when setting disabled, delete non-existent car

---

### Phase 3: Consumer Site (Public)
**Goal:** Buyer-facing site with Sylndr-inspired design, search, favorites
**Deliverables:**
- [ ] Public routes: GET /api/v1/public/cars (paginated, filterable)
- [ ] Home page: hero section, featured cars, search bar
- [ ] Car Listing page: card grid + filter sidebar + sort + pagination
- [ ] Car Details page: image gallery, specs, CTA button
- [ ] Favorites: localStorage-based, heart toggle on cards
- [ ] Smart search: debounced, searches across brand + model + additional_info
- [ ] Mobile responsive: bottom nav, swipeable gallery, collapsible filters
- [ ] RTL layout throughout
- [ ] SEO basics: meta tags, page titles in Arabic
- [ ] Loading skeletons for cards

**Testing (Phase 3):**
- [ ] Search: returns correct results, handles empty, handles Arabic input
- [ ] Filters: combine multiple filters, clear filters
- [ ] Favorites: add, remove, persist across page reload, clear on localStorage wipe
- [ ] Responsive: renders correctly at 375px, 768px, 1280px
- [ ] Edge cases: no cars available, all filters return empty, extremely long car names

---

### Phase 4: Real-Time + Notifications + Employee Tracking
**Goal:** Socket.io integration, Push notifications, employee status, contact request flow
**Deliverables:**
- [ ] Socket.io server setup (authenticated connections for dashboard, public for consumer)
- [ ] Service Worker (sw.js) for Web Push
- [ ] VAPID key generation + web-push integration
- [ ] Push subscription storage in users table
- [ ] Employee status toggle (available/offline)
- [ ] Contact Request routes: POST /contact-requests, PATCH /contact-requests/:id
- [ ] Buyer Queue routes: POST /queue, GET /queue
- [ ] Consumer: Employee list page with real-time status
- [ ] Consumer: Contact request modal (name + phone + optional car)
- [ ] Consumer: Confirmation + timeout countdown
- [ ] Consumer: Queue fallback when all busy
- [ ] Dashboard (Employee): incoming request notification with buyer info
- [ ] Dashboard (Employee): accept/reject/end session actions
- [ ] Dashboard (Employee): session suggestion when car status changes
- [ ] Dashboard (Team Manager): live employee monitor
- [ ] Audio alert (Web Audio API) on new request
- [ ] Vibration alert on mobile
- [ ] Real-time car broadcast (new car appears on consumer site live)
- [ ] Notification repeat logic (once after 60s)
- [ ] Timeout + escalation logic

**Testing (Phase 4):**
- [ ] Push notification: permission granted, permission denied
- [ ] Socket: connect, disconnect, reconnect
- [ ] Contact request: full flow buyer → employee → accept → end
- [ ] Queue: all busy → queued → assigned when free
- [ ] Timeout: request expires after configured time
- [ ] Edge cases: employee goes offline mid-session, two buyers request same employee simultaneously, notification permission revoked mid-session

---

### Phase 5: Financial Module + Reports
**Goal:** CFO dashboard, deposit flow, sale closing, reports with export
**Deliverables:**
- [ ] Sales, DepositRequests tables/models
- [ ] Deposit routes: POST /deposits, PATCH /deposits/:id (confirm/reject)
- [ ] Sales routes: POST /sales, GET /sales (filterable), GET /sales/report
- [ ] Export routes: GET /sales/export/excel, GET /sales/export/pdf
- [ ] Dashboard (CFO): pending deposits list with confirm/reject
- [ ] Dashboard (CFO): pending sales list (cars sold but not financially closed)
- [ ] Dashboard (CFO): close sale form (all financial fields)
- [ ] Dashboard (CFO): reports page with date range + filters
- [ ] Dashboard (CFO): column selector for reports
- [ ] Dashboard (CFO): export buttons (Excel/PDF)
- [ ] Deposit flow integration with car state machine
- [ ] Financial calculations: auto-compute dealership cut, tax amount
- [ ] Dashboard widget: summary stats (total sales, revenue, pending deposits)

**Testing (Phase 5):**
- [ ] Deposit flow: employee submits → CFO confirms → car status correct
- [ ] Deposit rejection: car returns to available
- [ ] Sale closing: all fields saved correctly, calculations accurate
- [ ] Reports: filter by date, by employee, combined filters
- [ ] Export: Excel file valid, PDF file valid, Arabic text renders correctly
- [ ] Edge cases: close sale on car that's still available (should block), double-close same sale, export empty report

---

### Phase 6: Admin Dashboard + Archive + Polish
**Goal:** SuperAdmin features, archive, team manager stats, final polish
**Deliverables:**
- [ ] Archive page: sold + withdrawn cars with search/filter (access controlled)
- [ ] Team Manager: employee performance stats (total sessions, accepted, rejected)
- [ ] SuperAdmin: dashboard overview (total cars, users, sales, active employees)
- [ ] User profile: employee can update their avatar
- [ ] Import/Export feature: import cars from CSV/Excel, export car list
- [ ] Terms of Service + Privacy Policy pages (static)
- [ ] 404 page
- [ ] Error boundary components
- [ ] Loading states everywhere
- [ ] Empty states with illustrations
- [ ] Toast notification system
- [ ] Confirm dialogs for destructive actions
- [ ] Mobile dashboard optimization
- [ ] Performance audit: lazy loading, code splitting, image optimization
- [ ] Accessibility basics: focus management, aria labels

**Testing (Phase 6):**
- [ ] Archive: correct cars appear, access control works
- [ ] Import: valid CSV imports, invalid CSV shows errors
- [ ] Export: car list exports correctly
- [ ] Edge cases: import duplicate cars, import with missing fields, 500+ cars performance

---

### Phase 7: Testing & QA (Playwright)
**Goal:** Comprehensive E2E testing with Playwright MCP Server
**Deliverables:**
- [ ] Playwright config (Arabic locale, RTL viewport)
- [ ] E2E: Complete buyer journey (browse → filter → details → request employee → confirmation)
- [ ] E2E: Complete employee journey (login → toggle available → receive request → accept → change car status → end session)
- [ ] E2E: CFO journey (login → confirm deposit → close sale → export report)
- [ ] E2E: SuperAdmin journey (login → create user → set permissions → configure settings)
- [ ] E2E: Real-time test (add car in dashboard → verify appears on consumer site)
- [ ] Integration: All API endpoints with valid + invalid inputs
- [ ] Unit: State machine transitions, financial calculations, RBAC logic
- [ ] Edge case scenarios (from accumulated edge-cases.md)
- [ ] Cross-browser: Chrome, Firefox, Safari (mobile Safari)
- [ ] Performance: page load times, API response times
- [ ] Final bug fixes from test results

---

## 15. PHASE PROMPTS

Phase prompts are maintained as **separate files** to save tokens:

| File | Model | Content |
|------|-------|---------|
| `prompts/PHASE_0_INIT.md` | Opus (Plan Mode) | Project scaffold + architecture |
| `prompts/PHASE_1_FOUNDATION.md` | Sonnet | Auth + RBAC + Users + Permissions |
| `prompts/PHASE_2_CARS.md` | Sonnet | Car CRUD + Seller + State Machine + Settings |
| `prompts/PHASE_3_CONSUMER.md` | Opus | Public site + Sylndr design + Search + Favorites |
| `prompts/PHASE_4_REALTIME.md` | Opus | Socket.io + Push + Audio + Employee Flow + Queue |
| `prompts/PHASE_5_FINANCIAL.md` | Sonnet | CFO + Deposits + Sales + Reports + Export |
| `prompts/PHASE_6_POLISH.md` | Sonnet | Archive + Import/Export + Admin + UX polish |
| `prompts/PHASE_7_TESTING.md` | Sonnet | Playwright E2E + Integration + Unit + Edge Cases |

**Usage:** Paste the relevant phase prompt into Claude Code. Claude Code should always read `docs/MASTER_PLAN.md` first (referenced at top of each prompt).


---

## 16. TESTING STRATEGY & INITIAL EDGE CASES

### Testing Stack:
| Tool | Purpose |
|------|---------|
| Playwright | E2E testing (MCP Server) |
| Supertest | API integration tests |
| Jest or Vitest | Unit tests |
| Playwright MCP | Test execution via Claude Code |

### Initial Edge Cases Document (tests/edge-cases.md):
```markdown
# Edge Cases — AutoZain

## Auth
- Login with empty fields
- Login with wrong password 10 times (rate limiting)
- Access dashboard with expired token
- Access dashboard with tampered token
- Two sessions same user (should latest win?)

## Cars
- Add car with all fields empty
- Add car with extremely long text in additional_info (10000 chars)
- Upload image over 10MB
- Upload non-image file as car image
- Change status of non-existent car
- Two employees change same car status simultaneously
- Delete car that has deposit_paid status

## Contact Requests
- Submit request with invalid phone number
- Submit request when target employee just went offline
- Two buyers request same employee at same exact moment
- Employee accepts request but buyer's phone is unreachable (system can't know)
- Buyer submits multiple requests rapidly (rate limiting)
- Employee goes offline during active session

## Queue
- 50 buyers join queue simultaneously
- Employee becomes available → oldest queue entry should be assigned
- Queue entry expires (buyer leaves)

## Financial
- CFO tries to close sale for car that's still "available"
- CFO enters negative commission
- CFO enters sale price lower than listing price (should be allowed — negotiation)
- Export report with 10,000+ records
- Concurrent CFO closes same sale

## Real-Time
- Socket disconnects and reconnects
- 100 concurrent socket connections
- Car added while consumer has filters active (should it show if it matches filters?)

## Settings
- Change max_concurrent while employee has active sessions
- Change timeout while a request is pending
- Disable employee_can_change_status while employee is in session
```

---

## END OF MASTER PLAN

**Next step:** Paste the Phase 1 prompt into Claude Code and begin execution.
**Remember:** Always read MASTER_PLAN.md before starting any phase.
**Remember:** Update PHASE_TRACKER.md and edge-cases.md after each phase.