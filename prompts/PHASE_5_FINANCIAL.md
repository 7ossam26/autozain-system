# Phase 5 — Financial Module + Reports (Sonnet)

> Ref: `docs/MASTER_PLAN.md` — Sections 3, 10
> All money = INTEGER (whole EGP). Prisma models. Numeral formatting.

## Build

### Backend

**Prisma models:** `Sale`, `DepositRequest` per MASTER_PLAN §3. All money fields `Int`

**Deposit routes** `/api/v1/deposits`:
- `POST /` — employee submits (car_id, deposit_amount as Int, buyer_name, buyer_phone). Auto-changes car → 'deposit_paid'. RBAC: `cars_change_status`. Notifies CFO via socket `deposit:submitted`
- `GET /` — list. Filterable by status. RBAC: `financial_view`
- `PATCH /:id` — CFO confirms/rejects. Reject → car → 'available'. RBAC: `financial_close_sale`. Audit logged

**Sales routes** `/api/v1/sales`:
- `POST /` — CFO closes sale. Fields: car_id, final_sale_price (Int), seller_received (Int), employee_commission (Int, default from setting), buyer_name, buyer_phone, payment_method?, notes?. Auto-calculates: `dealership_revenue = final_sale_price - seller_received`, `tax_amount = Math.round(dealership_revenue * tax_percentage / 100)`. Car → 'sold'. Notifies selling employee. RBAC: `financial_close_sale`
- `GET /` — list. Filterable: date range, employee_id, car_type. Paginated. RBAC: `financial_view`
- `GET /stats` — totals: sales count, revenue sum, commissions sum, pending deposits count. RBAC: `financial_view`

**Export:**
- `GET /api/v1/sales/export/excel` — .xlsx via exceljs. Columns passed as query params. Arabic headers. Integer amounts formatted with commas. RBAC: `reports_export`
- `GET /api/v1/sales/export/pdf` — .pdf via pdfkit. Arabic font (IBM Plex Sans Arabic TTF bundled). Same column selection. RBAC: `reports_export`

### Frontend (`/dashboard/financial/*`)

**Deposits (`/dashboard/financial/deposits`):** table, confirm/reject per row (CFO). Confirm dialog

**Pending Sales (`/dashboard/financial/pending`):** cars sold/deposit_paid without sales record. "قفل البيعة" → form

**Close Sale Form (modal):** car summary (read-only). Fields: السعر النهائي, المبلغ للبائع, عمولة الموظف (default prefilled), اسم المشتري, رقمه, طريقة الدفع (optional: كاش/تحويل), ملاحظات. Auto-calc display: نصيب المعرض, الضريبة, صافي الربح. All inputs: **integer only, no decimals**. Phone: soft warning

**Reports (`/dashboard/financial/reports`):** date range + employee filter + search. Column selector checkboxes. Table (numeral_system aware). Export: Excel / PDF buttons

**Stats cards:** إجمالي المبيعات, الإيرادات, العمولات, عربون معلق

### Integration
- Employee → deposit_paid → auto deposit_request → CFO notified (socket)
- CFO closes sale → employee notified (socket)
- All financial actions → audit_log

## Tests
- Deposit: submit → confirm → status correct. Reject → revert
- Sale: calculations accurate (integer math, no float issues), all fields saved
- Reports: filters work, combined filters
- Export: Excel valid + Arabic, PDF valid + Arabic, integers formatted
- Stats: match actual data
- Edge: close sale on 'available' (blocked), double-close, negative commission (blocked), decimal input (rejected), empty export

## After
Update `docs/PHASE_TRACKER.md` + `tests/edge-cases.md`