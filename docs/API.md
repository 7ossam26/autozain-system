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
- `GET /public/employees` — **Phase 4** (employee list + status for contact-request flow)

### Contact Requests (`/contact-requests`) — Phase 4
- `POST /contact-requests`
- `PATCH /contact-requests/:id`

### Queue (`/queue`) — Phase 4
- `POST /queue`
- `GET /queue`

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
