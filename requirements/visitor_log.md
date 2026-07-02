# Visitor Log

## Overview
The visitor log module maintains a real-time record of all visitors entering and exiting a society. It serves both gate security (walk-in registration, QR scan check-in) and residents (pre-approval of visitors before they arrive). The module is accessible to `SUAdmin`, `SUSecurity`, and `SUUser` roles with different levels of access.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Full access — register, approve, deny, check-in, check-out, list all visitors |
| `SUSecurity` | Register walk-in visitors, scan QR for check-in/check-out, view all visitors |
| `SUUser` (resident) | Pre-approve visitors for their own apartment only; view their own apartment's visitor history |

---

## Features

### 1. Walk-in Visitor Registration (Gate Entry)
- `SUAdmin` and `SUSecurity` can register a visitor arriving at the gate without prior approval.
- Required fields: visitor name, phone number, purpose of visit, host apartment.
- Optional fields: email, company/service type (e.g., Amazon, Swiggy, personal), vehicle/bike/car number, visitor photo (captured from device camera).
- A 6-digit numeric **pass code** is generated for every registered visitor.
- A **QR code** (PNG, base64-encoded) is generated and stored against each visitor log entry.
- The visitor registration request is sent to the host apartment's residents for approval.

### 2. Resident Pre-Approval (Visitor Pass Generation)
- `SUUser` (resident) can pre-approve a visitor before they arrive.
- Pre-approval is only allowed for the resident's own apartment — the backend enforces this; a resident cannot pre-approve for another apartment.
- Required fields: visitor name, phone number, purpose.
- Optional: email, company/service type, vehicle number, visitor photo.
- Residents can set a **validity window** (e.g., 1, 2, 4, 8, 12, 24, 48, 72 hours, or no expiry) during which the pass remains valid.
- A pass code and QR code are generated immediately, with status `PreApproved` — no further resident approval is needed upon arrival.
- Pre-approved visitors can check in as long as their pass is within the validity window.

### 3. Visitor Pass — Shareable Link
- Every visitor pass has a unique public URL: `/visitor-pass/{passCode}`.
- This page is publicly accessible (no login required) and shows: visitor name, purpose, host apartment, status, QR code, and validity window.
- The QR code and pass details are hidden if the pass has expired.
- Residents can **copy the pass link** to clipboard from the pass card after pre-approving a visitor.
- Residents can **share the pass via email and/or SMS** — the system sends the link through ACS (Azure Communication Services).
- The shared link is only meaningful during the validity window; after expiry it shows an expired notice.

### 4. Resident Notifications
- When a visitor is registered at the gate (not pre-approved), a **push notification** is sent to all residents of the host apartment.
- The push notification shows: visitor name, phone number, visitor photo, and direct **Approve** / **Deny** deep-link actions.
- Residents can approve or deny via the notification or from the visitor list page.
- Pre-approved visitors do **not** require a second approval upon arrival — gate security can check them in directly.

### 5. Approval / Denial Workflow
- Any authenticated user (resident, SUAdmin, SUSecurity) can approve or deny a visitor request.
- Only residents of the host apartment or admins can approve — the command handler enforces this.
- On approval, visitor status changes from `Pending` → `Approved`.
- On denial, visitor status changes to `Denied`.
- The visitor list auto-refreshes every 30 seconds to reflect near-real-time status changes.

### 6. Check-In / Check-Out
- `SUSecurity` and `SUAdmin` can check in a visitor using their pass code or by scanning the QR code with the device camera.
- The frontend supports **browser-native QR camera scanning** (`BarcodeDetector` API).
- Check-in is blocked if the visitor pass has expired (`IsPassExpired = true`); the API returns a specific `VISITOR_PASS_EXPIRED` error code.
- On check-in, visitor status changes to `CheckedIn`.
- On check-out, visitor status changes to `CheckedOut`; check-out time is recorded.

### 7. Visitor Pass Expiry Enforcement
- `ValidUntil` is stored against each pre-approved visitor entry.
- `IsPassExpired` is a computed property: `ValidUntil != null && ValidUntil < DateTime.UtcNow`.
- Expired passes cannot be used for check-in via the API (returns `VISITOR_PASS_EXPIRED`).
- The public pass page shows an expired banner and hides the QR code when the pass is expired.

### 8. Visitor List and History
- `SUAdmin` and `SUSecurity` see all visitors across the society with pagination.
- `SUUser` (resident) sees only their own apartment's visitor records — the backend enforces this via the JWT `apartmentId` claim; the resident cannot bypass this by manipulating query parameters.
- Filter options: date range (from/to), visitor name search, resident name search, visitor status.
- Each visitor card shows: visitor photo (if available), name, company/service type, purpose, host flat, status chip, pass expiry badge, check-in/out times.
- Visitor list auto-refreshes every 30 seconds.

### 9. Active Visitors View
- A dedicated endpoint returns all currently checked-in visitors (`status = CheckedIn`) for a society.
- Used by SUSecurity for a real-time view of who is on the premises.

### 10. Reports and Export
- `SUAdmin` and `SUSecurity` can export visitor logs as a **CSV file** with filters (date range, status, apartment).
- Exported fields include: visitor name, phone, purpose, host apartment, company, vehicle number, status, check-in time, check-out time, registration time.

### 11. Visitor Image Upload
- A visitor photo can be uploaded before or during registration.
- Upload goes directly to Azure Blob Storage via a dedicated upload endpoint.
- The image URL is stored in the visitor log and shown in list cards, push notifications, and the public pass page.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/visitors` | SUAdmin, SUSecurity, SUUser | Register visitor or pre-approve |
| `GET` | `/api/societies/{id}/visitors` | Authenticated | List visitors (SUUser scoped to own apartment) |
| `GET` | `/api/societies/{id}/visitors/active` | Authenticated | Currently checked-in visitors |
| `GET` | `/api/societies/{id}/visitors/{id}` | Authenticated | Get single visitor |
| `GET` | `/api/societies/{id}/visitors/verify?passCode=` | SUAdmin, SUSecurity | Verify by pass code at gate |
| `POST` | `/api/societies/{id}/visitors/checkin` | SUAdmin, SUSecurity | Check in via pass code |
| `POST` | `/api/societies/{id}/visitors/{id}/checkout` | SUAdmin, SUSecurity | Check out visitor |
| `POST` | `/api/societies/{id}/visitors/{id}/approve` | Authenticated | Approve visitor request |
| `POST` | `/api/societies/{id}/visitors/{id}/deny` | Authenticated | Deny visitor request |
| `GET` | `/api/visitors/pass/{passCode}` | **No auth** | Public shareable pass page data |
| `POST` | `/api/societies/{id}/visitors/{id}/share` | Authenticated | Share pass via email/SMS |
| `GET` | `/api/societies/{id}/visitors/export` | SUAdmin, SUSecurity | CSV export |
| `POST` | `/api/societies/{id}/visitors/images/upload` | Authenticated | Upload visitor photo |

---

## Visitor Status Lifecycle

```
Pending → Approved → CheckedIn → CheckedOut
        ↓
       Denied
```

- `PreApproved` — created by resident pre-approval, no further action needed before check-in.
- `Pending` — created by gate staff; waiting for resident approval.
- `Approved` — resident approved the visitor.
- `Denied` — resident denied the visitor.
- `CheckedIn` — visitor has entered the premises.
- `CheckedOut` — visitor has exited.

---

## Acceptance Criteria
- SUUser cannot register walk-in visitors; only pre-approve for their own apartment.
- SUSecurity can register walk-in visitors but cannot pre-approve for a specific apartment.
- Expired pre-approved passes cannot be used for check-in; API returns `VISITOR_PASS_EXPIRED`.
- Shareable pass link works without login; sensitive data (phone, email, pass code) is not exposed on the public page.
- SUUser listing is always scoped to their apartment — the backend enforces this regardless of query parameters sent.
- Push notification is sent with approve/deny deep links only for non-pre-approved visitors.
- QR scan check-in works via the device camera in the browser (BarcodeDetector API).

---

## Future / Planned

> 🔜 **Real-time status update via push** — currently the security desk uses 30-second polling; a server-sent push notification when a resident approves/denies would allow the security screen to update instantly without polling.

> 🔜 **Physical visitor pass printing** — the current implementation generates a digital QR code only. A printable visitor pass layout is not yet available.

> 🔜 **Pending visitor count badge** — a per-apartment pending visitor count that could be surfaced as a notification badge for residents.
