# AutoZain — API Reference

All endpoints are prefixed with `/api/v1`. Populated progressively per phase.

## Response Envelope

Success:
```json
{ "success": true, "data": { ... }, "meta": { "total": 0, "page": 1, "limit": 20 } }
```

Error:
```json
{ "success": false, "message": "...", "error_code": "..." }
```

## Authentication

JWT stored in HTTP-only cookies (`access_token`, `refresh_token`). Socket.io authenticates via the same cookie (same-origin).

## Endpoints

### Auth (`/auth`) — Phase 1
- `POST /login`
- `POST /logout`
- `GET /me`
- `POST /refresh-token`

### Users (`/users`) — Phase 1
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

### Cars (`/cars`) — Phase 2
- `GET /cars`
- `GET /cars/:id`
- `POST /cars`
- `PUT /cars/:id`
- `PATCH /cars/:id/status`
- `DELETE /cars/:id`

### Public (`/public`) — Phase 3 (no auth)
- `GET /public/cars` — paginated (20/page, max 50), filterable, sortable. Response EXCLUDES all seller fields. Only `status='available'` cars.
  - Query: `page`, `limit`, `sort` (`latest` | `price_asc` | `price_desc` | `km_asc`), `car_type` (comma-separated multi), `model` (comma-separated multi), `transmission`, `fuel_type`, `color`, `price_min`, `price_max`, `odometer_min`, `odometer_max`, `search`, `include_filters` (`1` to include available `brands`, `modelsByBrand`, `priceRange`, `odometerRange` in response)
- `GET /public/cars/:id` — single car detail (no seller fields). 404 if car is not `available`.
- `GET /public/settings/numeral_system` — `{ numeral_system: 'western' | 'arabic' }`
- `GET /public/employees` — list of employees whose status is `available` or `busy`. Response `meta.buyerCanAttachCar` reflects the setting. Offline employees are hidden.

### Contact Requests (`/contact-requests`) — Phase 4
- `POST /contact-requests` — **public** (no auth). Body: `{ buyer_name, buyer_phone, employee_id, car_id? }`. Creates a `pending` request, emits `contact_request:new` to `employee:{id}` + sends Web Push. Rate-limited 3 per 5 min per IP. Returns `{ id, status, createdAt, timeoutMinutes }` + optional `warning` if phone does not look Egyptian.
- `PATCH /contact-requests/:id` — auth. Body: `{ action: 'accept' | 'reject' }`. Accept flips employee status to `busy` and broadcasts `employee:status_changed`.
- `PATCH /contact-requests/:id/complete` — auth. Body: `{ outcome? }` (`sold | interested | no_answer | cancelled`). Ends the session, flips employee back to `available` when no other active sessions, and auto-assigns the oldest queued buyer if any.
- `GET /contact-requests/me` — auth. Returns `{ pending, active }` for the current user.

### Queue (`/queue`) — Phase 4
- `POST /queue` — **public**. Body: `{ buyer_name, buyer_phone, car_id? }`. Rejected with `EMPLOYEES_AVAILABLE` when at least one employee is currently `available`. Rate-limited 3 per 5 min per IP.
- `GET /queue` — auth + `employee_monitor`. Returns the waiting list.
- `DELETE /queue/:id` — buyer leaves / admin expires.

### Push (`/push`) — Phase 4
- `GET /push/public-key` — returns the VAPID public key (no auth).
- `POST /push/subscribe` — auth. Body: `{ subscription }` (Web Push subscription JSON). Stored on `users.push_subscription`.
- `DELETE /push/subscribe` — auth. Clears the current user's subscription.

### Users — Phase 4 additions
- `PATCH /users/me/status` — auth. Body: `{ status: 'available' | 'offline' }`. Blocked with `ACTIVE_SESSION` if the employee still has an `accepted` contact request. Going `available` auto-assigns the oldest queued buyer.
- `GET /users/monitor` — auth + `employee_monitor`. Returns `{ employees: [...], queueWaiting }` with each employee's current `activeSessions`.

### Socket.io events (Phase 4)
Server → Client broadcasts: `car:added`, `car:updated`, `car:status_changed`, `car:removed`, `employee:status_changed`, `contact_request:new`, `contact_request:repeat`, `contact_request:accepted`, `contact_request:rejected`, `contact_request:timeout`, `queue:assigned`, `queue:updated`, `session:ended`, `session:suggest_end`, `settings:updated`. Rooms: `public`, `dashboard`, `employee:{id}`, `role:cfo`, `role:team_manager`, `role:admin`.

### Deposits (`/deposits`) — Phase 5
- `POST /deposits`
- `PATCH /deposits/:id`

### Sales (`/sales`) — Phase 5
- `POST /sales`
- `GET /sales`
- `GET /sales/report`
- `GET /sales/export/excel`
- `GET /sales/export/pdf`

### Settings (`/settings`) — Phase 2
- `GET /settings`
- `PUT /settings/:key`

### Audit Log (`/audit-log`) — Phase 2
- `GET /audit-log` (admin only)
