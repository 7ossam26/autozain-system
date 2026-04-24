# Phase 4 — Real-Time + Notifications + Employee Flow (Opus)

> Ref: `docs/MASTER_PLAN.md` — Sections 7, 8, 9, 6 (employee list)
> Most complex phase: Socket.io + Push + Audio + Vibration + Queue + Timeout

## Build

### Backend

**Socket.io** (same Express server, same port):
- Auth: dashboard connections extract JWT from **HTTP-only cookie** (parse cookie header in handshake). Public connections are anonymous
- Rooms: `public`, `dashboard`, `employee:{id}`, `role:cfo`, `role:team_manager`
- Events per MASTER_PLAN §9

**Web Push** (web-push):
- VAPID keys from `.env` (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
- `POST /api/v1/push/subscribe` — saves subscription to `users.push_subscription` (Prisma Json field)
- `notificationService.sendPush(userId, payload)`

**Contact Request** `/api/v1/contact-requests`:
- `POST /` — buyer submits (name, phone, employee_id, car_id?). Phone: soft validate Egyptian format. Creates record status='pending'. Emits to `employee:{id}` socket + sends push. Rate limit: 3 requests per 5min per IP
- `PATCH /:id` — employee accepts/rejects. Accept: set employee status='busy'. Reject: request back to pool or escalate
- `PATCH /:id/complete` — end session. Set outcome. Return employee to 'available'. Auto-check queue
- Timeout: `setInterval` check — if pending > `request_timeout_minutes` setting → expire

**Queue** `/api/v1/queue`:
- `POST /` — add to queue when all employees busy
- On employee available → auto-assign oldest waiting → notify via socket + push

**Employee status:**
- `PATCH /api/v1/users/me/status` — manual toggle available/offline
- Auto-busy on accept. Auto-available on session end

### Frontend — Public

**Employee List (`/employees`):**
- Real-time via Socket.io (public room, `employee:status_changed` event)
- Each: name + badge (green "متاح" / orange "مشغول"). "تواصل" button (disabled if busy)
- All busy → queue option

**Contact Modal:** name + phone (soft warning for non-Egyptian format) + optional car dropdown (if `buyer_can_attach_car` setting)
**Confirmation:** "تم إرسال طلبك" + countdown (from `request_timeout_minutes`)
**Queue:** "مفيش موظف متاح" → enter name+phone → "هنبلغك أول ما حد يفضى"
**Real-time cars:** `car:added`/`car:status_changed` → auto-update listing without refresh

### Frontend — Dashboard (Employee)

**Status toggle** in header: "أنا متاح" / "مش متاح" switch. Green dot indicator
**Incoming request:** overlay modal with buyer name + phone + interested car. Accept/Reject
**Session panel:** buyer info + "إنهاء الجلسة" + car status change during session → suggestion: "عايز تنهي الجلسة؟"
**Audio:** preload sound, play on `contact_request:new` (Web Audio API). Mute toggle
**Vibration:** `navigator.vibrate([200, 100, 200])` on mobile. Graceful fallback
**Repeat:** if no response after 60s, replay once

### Frontend — Dashboard (Team Manager)
- Live employee monitor: cards with name + status + current session info. Real-time via socket

### Service Worker (`public/sw.js`)
- `push` → `showNotification` with buyer info
- `notificationclick` → `clients.openWindow('/dashboard')`
- Permission request on employee login. Denied → persistent banner

## Tests
- Push: granted/denied, notification received
- Socket: connect/disconnect/reconnect, cookie auth works
- Contact: full flow buyer → employee → accept → end
- Queue: all busy → queued → assigned on availability
- Timeout: expires correctly, buyer can re-request
- Real-time: add car → appears on consumer
- Audio/vibration: plays, mute works
- Edge: offline mid-session, simultaneous requests to same employee, permission revoked, browser closed while busy, rapid requests (rate limit)

## After
Update `docs/PHASE_TRACKER.md` + `tests/edge-cases.md`