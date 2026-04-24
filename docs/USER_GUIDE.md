# AutoZain User Guide

This guide explains how to use AutoZain after all phases are complete. It follows the real operating model from the public customer journey through employee handling, manager monitoring, CFO closing, and superadmin administration.

## 1. Run the app

Install and prepare the database once:

```bash
npm install
npm run db:migrate
npm run db:seed
```

Start local development:

```bash
npm run dev
```

Default local URLs:

- Public website: `http://localhost:5173`
- Dashboard login: `http://localhost:5173/dashboard/login`
- Backend API: `http://localhost:3000/api/v1`
- Health check: `http://localhost:3000/api/v1/health`

The seeded permanent account is:

- Username: `superadmin`
- Password: `246810@Ad`

All other users should be created by the superadmin from the dashboard.

## 2. Roles

### Customer

Customers do not log in. They use the public website only.

Main pages:

- `/` - home page and featured cars
- `/cars` - car listing, search, filters, sorting, pagination
- `/cars/:id` - car details
- `/favorites` - saved favorites in browser localStorage
- `/employees` - available/busy employees and contact request form

Customer actions:

- Browse available cars only.
- Search by brand, model, and extra info.
- Filter by brand, model, price, odometer, transmission, fuel type, and color.
- Save or remove favorites.
- Choose an employee and submit a contact request with name and phone.

Customers do not see seller data, financial data, dashboard data, or internal notes.

### Employee

Employees use the dashboard.

Main pages:

- `/dashboard` - personal dashboard and session/status area
- `/dashboard/cars` - inventory table
- `/dashboard/cars/add` - add a car and seller information
- `/dashboard/cars/:id` - car details, seller info, status actions, audit trail

Employee actions:

- Log in with username/password.
- Toggle status between available and offline.
- Receive incoming customer requests.
- Accept or reject a request.
- Handle the customer outside the system by phone.
- Add cars on behalf of sellers.
- Change car state when permitted by settings.
- End the active session with an outcome.

Important status rules:

- `available` -> `deposit_paid`
- `available` -> `withdrawn`
- `deposit_paid` -> `available`
- `deposit_paid` -> `sold`
- `sold` is final.
- `withdrawn` can return to `available` only by admin/superadmin.

### Team Manager

Team managers monitor employees and performance.

Main pages:

- `/dashboard/monitor` - live employee status, active sessions, queue count
- `/dashboard/team` - employee performance stats
- `/dashboard/cars` - inventory visibility if the role has `cars_view`

Manager actions:

- See who is available, busy, or offline.
- See active buyer sessions and phone numbers.
- Track waiting queue size.
- Review accepted/rejected/total sessions per employee.

Team managers do not close sales or edit financial records unless permissions are changed.

### CFO

CFO users handle deposits, sale closing, and reports.

Main pages:

- `/dashboard/financial/deposits` - pending, confirmed, rejected deposits
- `/dashboard/financial/pending` - cars ready for sale closing
- `/dashboard/reports` - sales report, filters, column selection, export
- `/dashboard/archive` - sold and withdrawn cars if permission is enabled

CFO actions:

- Confirm or reject deposit requests.
- Close a sale by entering:
  - Final sale price
  - Seller received amount
  - Employee commission
  - Buyer name and phone
  - Payment method and notes
- Review calculated dealership revenue.
- Export reports to Excel or PDF.

Financial meaning:

- Dealership revenue = final sale price - seller received amount.
- Tax is calculated from the configured tax percentage.
- Net profit accounts for tax and employee commission.

### SuperAdmin

SuperAdmin controls the whole system and bypasses normal RBAC restrictions.

Main pages:

- `/dashboard` - business overview
- `/dashboard/users` - create/edit/deactivate users, reset passwords
- `/dashboard/permissions` - module access by role
- `/dashboard/settings` - configurable system settings
- `/dashboard/cars` - all car operations
- `/dashboard/archive` - sold and withdrawn cars
- `/dashboard/reports` - financial reports
- `/dashboard/monitor` and `/dashboard/team` - manager views

SuperAdmin actions:

- Create employee, team manager, CFO, admin, and other users.
- Reset user passwords.
- Enable or disable modules per role.
- Change settings like request timeout, numeral system, tax percentage, default commission, and employee permissions.
- Review archive and reports.

## 3. First complete cycle

### Step 1: SuperAdmin prepares the system

1. Open `/dashboard/login`.
2. Log in as `superadmin`.
3. Go to `/dashboard/users`.
4. Create at least:
   - One employee
   - One team manager
   - One CFO
5. Go to `/dashboard/permissions`.
6. Confirm:
   - Employee has car view/add/status permissions.
   - Team manager has employee monitor permission.
   - CFO has financial, reports, and archive permissions.
7. Go to `/dashboard/settings`.
8. Review:
   - `request_timeout_minutes`
   - `buyer_can_attach_car`
   - `default_commission`
   - `tax_percentage`
   - `employee_can_change_status`

### Step 2: Employee adds inventory

1. Log in as the employee.
2. Set status to available.
3. Go to `/dashboard/cars/add`.
4. Enter car data:
   - Brand/type
   - Model
   - Listing price
   - Odometer
   - Transmission
   - Plate number
   - License info
   - Optional color, fuel type, notes, and images
5. Enter seller data:
   - Seller name
   - Seller phone
   - Seller residence
   - Optional license photos
6. Submit the car.
7. Confirm it appears in `/dashboard/cars` and on the public `/cars` page while status is `available`.

### Step 3: Customer sends request

1. Open the public site without logging in.
2. Browse `/cars`.
3. Open a car detail page.
4. Optionally add it to favorites.
5. Go to `/employees`.
6. Choose an available employee.
7. Submit the contact form with customer name and phone.
8. The customer sees a confirmation/countdown while the employee receives the request.

### Step 4: Employee handles request

1. The employee receives an incoming request overlay/notification.
2. Click accept.
3. Employee status becomes busy.
4. The active session appears in the dashboard.
5. Employee contacts the customer by phone outside the system.
6. If the customer pays a deposit, open the car detail page and change status to `deposit_paid`.
7. End the session with the correct outcome, usually `sold` or `interested`.

Deposit note:

- The backend supports formal deposit requests through `POST /api/v1/deposits`.
- The CFO deposit page consumes those requests.
- If using only the current UI, the CFO can still close a pending sale once the car is in `deposit_paid`.

### Step 5: Team manager monitors

1. Log in as the team manager.
2. Open `/dashboard/monitor`.
3. Confirm:
   - Employee status changed from available to busy during the session.
   - Active buyer session is visible.
   - Queue count updates if all employees are busy.
4. Open `/dashboard/team`.
5. Review employee session totals and accepted/rejected counts.

### Step 6: CFO confirms and closes

1. Log in as the CFO.
2. Open `/dashboard/financial/deposits`.
3. Confirm or reject pending deposits.
4. Open `/dashboard/financial/pending`.
5. Click close sale for the car.
6. Enter:
   - Final sale price
   - Seller received amount
   - Employee commission
   - Buyer name and phone
   - Payment method and notes
7. Review auto-calculated dealership revenue, tax, and net profit.
8. Submit the sale.
9. Open `/dashboard/reports`.
10. Confirm the sale appears.
11. Export Excel or PDF if needed.

After closing:

- A sale record is created.
- The car becomes `sold`.
- The car leaves the public website.
- The car appears in archive/reports.

### Step 7: SuperAdmin reviews

1. Log in as superadmin.
2. Open `/dashboard/archive`.
3. Confirm the sold car appears.
4. Open `/dashboard/reports`.
5. Confirm the financial record appears.
6. Open `/dashboard/users`, `/dashboard/permissions`, and `/dashboard/settings` for admin checks.

## 4. Tested walkthrough

I tested the app with:

- Public customer guest
- Employee: `e2e_cycle_employee`
- Team manager: `e2e_cycle_manager`
- CFO: `e2e_cycle_cfo`
- SuperAdmin: `superadmin`

The test car was:

- `E2ECycle FlowCar`

The tested cycle was:

1. Public customer browsed the car.
2. Public customer opened employees and submitted a request.
3. Employee logged in and accepted the request.
4. Team manager saw the active employee/customer session.
5. Employee moved the car to deposit paid and submitted a deposit request.
6. CFO confirmed the deposit.
7. CFO closed the sale.
8. CFO saw the sale in reports.
9. SuperAdmin saw the sold car in archive and reports.
10. SuperAdmin saw the created users in user management.

The full existing Playwright E2E suite also passed on desktop and mobile:

- 22 tests passed.
- Covered buyer, employee, CFO, superadmin, realtime car updates, and edge cases.

## 5. Practical operating notes

- Sellers never log in. Employees add cars on behalf of sellers.
- Customers never create accounts.
- Customer communication happens by phone, outside the system.
- Favorites are browser-local; clearing browser storage removes them.
- The public site only shows `available` cars.
- Dashboard access is controlled by role permissions.
- SuperAdmin can bypass module permissions.
- Audit logs are created for important changes such as status changes, users, deposits, and sales.
- There is no public password reset flow; password reset is handled by superadmin/user management.
- Reports are generated from closed sales, not merely from car status.
