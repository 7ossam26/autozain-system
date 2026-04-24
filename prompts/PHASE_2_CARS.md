# Phase 2 — Car Management + Seller Data + Settings (Sonnet)

> Ref: `docs/MASTER_PLAN.md` — Sections 3, 5, 11, 13
> Stack: PostgreSQL + Prisma | All money = INTEGER (whole EGP)

## Build

### Backend
- **Prisma models**: `Car`, `AuditLog`, `Setting` per MASTER_PLAN §3
  - `listing_price` is `Int` (whole EGP, no decimals)
  - `fuel_type` is nullable enum
  - `images` is `Json` (array of URL strings)
  - `status` is enum: `available`, `deposit_paid`, `sold`, `withdrawn`
- `npx prisma migrate dev` for new models
- Car routes `/api/v1/cars`:
  - `GET /` — paginated (default 20), filterable (status, car_type, model, transmission, fuel_type, price range, odometer range), searchable (car_type + model + additional_info). RBAC: `cars_view`
  - `GET /:id` — full details. Seller info included only if user has RBAC access
  - `POST /` — create car + seller info + images. RBAC: `cars_add`. Validate: car_type, model, listing_price, seller_name, seller_phone required
  - `PUT /:id` — update. RBAC: `cars_edit`. Check `employee_can_edit_car` setting for employee role
  - `DELETE /:id` — soft delete (set withdrawn or actual delete). RBAC: `cars_delete`. Check `employee_can_delete_car` setting. Block if status=`deposit_paid`
  - `PATCH /:id/status` — state change. RBAC: `cars_change_status`. Validate transition per MASTER_PLAN §11 state machine. Check `employee_can_change_status` setting
- **Image upload** (multer): car images (multi, max from `max_car_images` setting), inspection report (single), seller license front/back. Max 5MB/file, JPEG/PNG/WebP only. Store in `backend/uploads/`, serve via `/uploads/*`
- **Audit log service**: on every car create/status_change/delete → insert `AuditLog` with old_value, new_value, performed_by
- **Settings routes** `/api/v1/settings`:
  - `GET /` — grouped by category. RBAC: `settings_view`
  - `PUT /:key` — update value. RBAC: `settings_edit`. Audit logged. Broadcast via Socket.io (placeholder, wired in Phase 4)
- **Seed settings** from MASTER_PLAN §3 defaults (including `numeral_system`)
- **Settings cache**: load all settings into memory on startup. Refresh on update. Export helper `getSetting(key)`
- **Input validation**:
  - Phone: soft warning regex `^01[0125]\d{8}$` — always allow submission, return `warning` field in response
  - Price: integer only, reject decimals

### Frontend (Dashboard)
- **Cars page** (`/dashboard/cars`): table with image thumbnail, brand+model, price (ج.م, formatted with commas, respects `numeral_system` setting), status badge (colored), plate, date. Status filter tabs. Search bar
- **Add Car page** (`/dashboard/cars/add`): single form, all fields. Sections: بيانات العربية + بيانات البائع + الصور. Drag-drop image upload zone. Phone soft warning inline. Price input: integer only, no decimals. Optional fields marked
- **Car Detail page** (`/dashboard/cars/:id`): full info + seller info (if permitted). Status change dropdown with confirmation dialog. Edit button (if permitted). Audit log timeline at bottom
- **Settings page** (`/dashboard/settings`): grouped by category per MASTER_PLAN §5. Toggles for booleans, number inputs, select dropdowns. Save per section. Include `numeral_system` toggle

## Tests
- CRUD: create/read/update/delete
- State machine: valid transitions pass, invalid blocked
- Image: success, >5MB rejected, non-image rejected, over max count rejected
- Audit: entries created on state change
- Settings: update + verify cached value refreshes
- Input: integer price enforced, phone warning works
- Edge: employee edit when disabled, delete car with deposit, concurrent status changes

## After
Update `docs/PHASE_TRACKER.md` + `tests/edge-cases.md`