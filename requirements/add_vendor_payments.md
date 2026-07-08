# Vendor Payment Management

## Overview
`SUAdmin` can manage vendors (external service providers under recurring contracts) and track all associated costs — both recurring schedules and one-time charges. A grid view provides a month-by-month financial overview with payment tracking and overdue alerts.

---

## Vendor Setup

### Vendor Profile
`SUAdmin` can add a vendor with the following information:

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | Vendor/company name |
| Address | Yes | Full address |
| Picture | No | Uploaded via dedicated upload endpoint |
| Point of Contact — First Name | Yes | |
| Point of Contact — Last Name | Yes | |
| Point of Contact — Phone | Yes | |
| Point of Contact — Email | Yes | |
| Overview | Yes | Short description of the vendor's services |
| Valid Upto Date | Yes | Contract/empanelment validity end date |
| Payment Due Days | Yes | Number of days after service/month end when payment is due |
| Geographic Service Area | No | e.g., "Sector 15, Noida" |
| Business Type | No | e.g., Electrician, Plumber, Housekeeping |
| Contract File | No | Uploaded via dedicated upload endpoint; stores a contract PDF or image |

- `SUAdmin` can update an existing vendor profile including setting `isActive = false` to deactivate.
- ⚠️ **Gap:** No `GET /vendor-payments/vendors/{vendorId}` endpoint to fetch a single vendor's detail. Only the list endpoint exists.

### File Upload
- `POST /api/societies/{id}/vendor-payments/uploads/{documentType}` — upload a vendor picture or contract file to Azure Blob Storage. Returns an app-relative, authenticated file path (served via the shared authenticated file endpoint, not a raw long-lived SAS URL) to be stored on the vendor.
- ⚠️ **Gap:** Unlike maintenance payment proofs, the uploaded vendor picture/contract has **no preview or zoom popup** on web — the admin UI only shows a "Picture ready" / "Contract ready" text chip after upload, with no way to view the actual file inline. Mobile has no vendor-payments screen that displays a picture/contract or document at all (the mobile vendor-payments screen is a read-only charge list only).

---

## Recurring Cost Schedules

- `SUAdmin` can create a recurring payment schedule for a vendor with:
  - **Frequency** — `Weekly`, `BiWeekly`, `Monthly`, `Quarterly`, `Yearly`
  - **Fixed Amount** — the cost per frequency cycle
  - **Start Date** — month and year from which charges begin
  - **End Date** — month and year at which the schedule ends
  - **Label** — a description for this schedule (e.g., "Monthly housekeeping fee")
- **Calculated display:** When a fixed amount and frequency are entered, the system should show the monthly equivalent and annual equivalent cost for reference.
  - ⚠️ **Gap:** `MonthlyEquivalent` and `AnnualEquivalent` are not included in `VendorRecurringScheduleDto`; the frontend derives this from the raw frequency and amount.
- **Validation:** Schedule end date cannot exceed the vendor's `ValidUptoDate`. The command handler must enforce this.
- A vendor can have **multiple active schedules**.

### Schedule Updates
- `PUT /api/societies/{id}/vendor-payments/schedules/{id}` — update a schedule's end date or set `InactiveFromDate`.
- When a schedule is made **inactive from a given month**, all future charges from that month onward are voided/inactivated.
- When the **end date is extended**, only the net new months in the extended range have charges added.
- When the **end date is shortened**, all future charges beyond the new end date are inactivated.

---

## One-Time Charges

- `SUAdmin` can add an ad-hoc one-time charge for a vendor with:
  - **Effective Date** — month and year
  - **Amount**
  - **Description**
- `POST /api/societies/{id}/vendor-payments/charges/one-time`

---

## Vendor Cost Grid View

- `GET /api/societies/{id}/vendor-payments/grid?year={year}` — returns a grid where:
  - **Y-axis** = Vendors
  - **X-axis** = Months (Jan–Dec for the given year)
  - Each cell shows the total cost for that vendor in that month (sum of all active charges)
  - Bottom row shows total monthly cost across all vendors (split into paid and outstanding)
  - Inactive charges are excluded from totals
- Each charge in the grid has:
  - **Pay option** — opens a popup to enter payment receipt and date
  - **Inactivate / Delete / Reactivate** actions
- **Overdue highlighting** — a charge not paid by its due date is marked in red.
- ⚠️ **Gap:** Admin overdue notification (push/email sent when a payment exceeds its due date) is documented as a requirement but notification delivery is not confirmed in the current implementation.

---

## Payment Marking

- `POST /api/societies/{id}/vendor-payments/charges/{id}/mark-paid` — mark a charge as paid with:
  - Payment date
  - Payment method
  - Transaction reference
  - Receipt/proof document URL
  - Notes (optional)

---

## Charge Management

| Action | Endpoint | Notes |
|--------|----------|-------|
| List charges | `GET /api/societies/{id}/vendor-payments/charges` | Filter by vendorId, year, month, status |
| Inactivate charge | `POST /api/societies/{id}/vendor-payments/charges/{id}/inactivate` | Soft delete |
| Activate charge | `POST /api/societies/{id}/vendor-payments/charges/{id}/activate` | Re-enable |
| Delete charge | `DELETE /api/societies/{id}/vendor-payments/charges/{id}` | Permanent deletion |

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/vendor-payments/vendors` | SUAdmin | Create vendor |
| `PUT` | `/api/societies/{id}/vendor-payments/vendors/{id}` | SUAdmin | Update vendor |
| `GET` | `/api/societies/{id}/vendor-payments/vendors` | SUAdmin | List/search vendors |
| ~~`GET`~~ | ~~`/api/societies/{id}/vendor-payments/vendors/{id}`~~ | — | ⚠️ Not implemented — single vendor view missing |
| `POST` | `/api/societies/{id}/vendor-payments/uploads/{type}` | SUAdmin | Upload picture or contract |
| `POST` | `/api/societies/{id}/vendor-payments/schedules` | SUAdmin | Create recurring schedule |
| `PUT` | `/api/societies/{id}/vendor-payments/schedules/{id}` | SUAdmin | Update schedule |
| `GET` | `/api/societies/{id}/vendor-payments/schedules` | SUAdmin | List schedules (by vendorId) |
| `POST` | `/api/societies/{id}/vendor-payments/charges/one-time` | SUAdmin | Add one-time charge |
| `GET` | `/api/societies/{id}/vendor-payments/charges` | SUAdmin | List charges with filters |
| `POST` | `/api/societies/{id}/vendor-payments/charges/{id}/mark-paid` | SUAdmin | Mark charge as paid |
| `POST` | `/api/societies/{id}/vendor-payments/charges/{id}/inactivate` | SUAdmin | Inactivate charge |
| `POST` | `/api/societies/{id}/vendor-payments/charges/{id}/activate` | SUAdmin | Reactivate charge |
| `DELETE` | `/api/societies/{id}/vendor-payments/charges/{id}` | SUAdmin | Delete charge |
| `GET` | `/api/societies/{id}/vendor-payments/grid` | SUAdmin | Monthly cost grid |

---

## Acceptance Criteria
- Vendor can have multiple recurring schedules with different frequencies.
- Schedule end date cannot exceed vendor's Valid Upto Date.
- Inactivating a schedule from a given month voids all charges from that month onward.
- Extending a schedule's end date adds only the new incremental charges.
- Grid shows total cost per vendor per month; bottom row shows society-wide monthly total.
- Inactive charges are excluded from totals.
- Overdue charges (past due date and unpaid) are flagged in the grid.

---

## Future / Planned

> 🔜 **Single vendor detail endpoint** — `GET /societies/{id}/vendor-payments/vendors/{id}` to fetch full vendor profile, all schedules, and recent charges.

> 🔜 **Monthly/annual equivalent on DTOs** — include `MonthlyEquivalent` and `AnnualEquivalent` fields in `VendorRecurringScheduleDto` so the frontend can display computed cost summaries without local calculation.

> 🔜 **Overdue payment notification** — push/email notification to `SUAdmin` when a vendor charge remains unpaid past its payment due date. Trigger via a daily timer-triggered Azure Function.

> 🔜 **Vendor picture/contract preview with zoom** — reuse the same secure-image + zoom-lightbox pattern already used for maintenance proofs so admins can view the uploaded vendor picture/contract inline instead of only a "ready" chip; extend to a mobile vendor-payments document view as well (mobile currently has no vendor document display).
