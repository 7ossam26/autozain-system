# Edge Cases — AutoZain

Living document. Seeded from [MASTER_PLAN.md](../docs/MASTER_PLAN.md) §16. Each phase appends newly discovered cases.

## Auth
- Login with empty fields
- Login with wrong password 10 times (rate limiting — 5 per 15 min)
- Access dashboard with expired token
- Access dashboard with tampered token
- Two sessions same user (latest-wins vs. multi-session)

## Cars
- Add car with all fields empty
- Add car with extremely long text in `additional_info` (10,000 chars)
- Upload image over 5 MB (max enforced)
- Upload non-image file as car image
- Upload non-JPEG/PNG/WebP format
- Change status of non-existent car
- Two employees change same car status simultaneously
- Delete car that has `deposit_paid` status
- Car with no images — placeholder on consumer site

## Contact Requests
- Submit request with invalid Egyptian phone number (soft warning, still accepted)
- Submit request when target employee just went offline
- Two buyers request same employee at the same moment
- Employee accepts request but buyer's phone is unreachable
- Buyer submits multiple requests rapidly (rate limit)
- Employee goes offline mid-session
- Target employee session exceeds `max_concurrent` setting

## Queue
- 50 buyers join queue simultaneously
- Employee becomes available → oldest queue entry assigned
- Queue entry expires (buyer leaves)
- Setting `max_concurrent` changed while queue has waiting buyers

## Financial
- CFO tries to close sale for car still `available`
- CFO enters negative commission (block)
- CFO enters sale price lower than listing price (allow — negotiation)
- Export report with 10,000+ records
- Concurrent CFO closes same sale (optimistic lock)
- Deposit refund flow

## Real-Time
- Socket disconnects and reconnects
- 100+ concurrent socket connections
- Car added while consumer has filters active (should appear only if it matches filters)
- Push subscription returns `410 Gone` → null out `users.push_subscription`

## Settings
- Change `max_concurrent` while employee has active sessions
- Change `request_timeout_minutes` while a request is pending
- Disable `employee_can_change_status` while employee is in session
- Toggle `numeral_system` (western ↔ arabic-indic) live

## Audit / Permissions
- SuperAdmin demotes themselves (must be blocked)
- Delete a role that has users assigned
- Toggle `module_access` for a role while users of that role are mid-action

## Uploads
- `backend/uploads/` not writable (Dokploy volume misconfigured)
- File name with path traversal (`../../etc/passwd`)
- Simultaneous uploads exceeding disk quota
