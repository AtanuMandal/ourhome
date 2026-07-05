# Recurring Fee Payment

## Overview
This module covers how residents pay their maintenance fees and other recurring charges. The **current implementation** is a manual proof-upload flow where residents upload payment receipts and admins verify them. Full payment gateway integration with automated deductions is planned for a future phase.

---

## Current Implementation (Manual Payment Flow)

The maintenance module supports the following payment workflow:

### 1. Resident Payment Actions
- Residents can view their maintenance charges broken down by year and month, with status: `Pending`, `Submitted`, `Paid`, `Overdue`.
- Residents can upload a payment proof image/document via `POST /societies/{id}/maintenance/payments/proof/upload` — returns an app-relative, authenticated file path (served via the shared secure file endpoint) rather than a raw Blob Storage URL.
- Residents can submit a payment proof for **one or multiple charges simultaneously** via `POST /societies/{id}/maintenance/payments/proof`, linking the uploaded document path to one or more charge IDs.
- After proof submission, charge status changes to `Submitted` and the admin is notified for approval.

### 2. Admin Payment Management
- `SUAdmin` can view the society-wide payment grid (apartments × months) showing `Pending`, `Submitted`, and `Paid` status per cell.
- Admin can view the uploaded proof document in a full-screen zoom popup (zoom in/out, 100%–400%) within the grid, before approving or marking as paid.
- `SUAdmin` can mark a charge as `Paid` via `POST /societies/{id}/maintenance/charges/{id}/mark-paid` with payment method, transaction reference, receipt URL, and date.
- `SUAdmin` can approve a submitted proof via `POST /societies/{id}/maintenance/charges/{id}/approve`.
- `SUAdmin` can add penalty charges per apartment for late payment via `POST /societies/{id}/maintenance/charges/penalty`.

### 3. Payment History
- Residents can view their full payment history with: due date, amount, status, overdue indicator, and payment date.
- Overdue identification uses the society's configured `MaintenanceOverdueThresholdDays` setting.
- ⚠️ **Gap:** A `ReceiptUrl` field exists on the charge model but **no receipt generation service** is implemented. Residents cannot currently download a formal receipt; only the uploaded proof document is available.

---

## Future / Planned — Automated Payment Gateway Integration

> The following features require integration with an external payment gateway (e.g., Razorpay, PhonePe, PayU, or Stripe). This is a significant infrastructure addition and is planned for a future release.

### Phase 2: Payment Gateway Integration

> 🔜 **Payment method setup** — Residents can save a payment method (UPI ID, credit card, debit card, net banking) for automated deductions. Payment details must be stored via a PCI-compliant tokenisation service; raw card details must never be stored in OurHome's database.

> 🔜 **Automated recurring deduction** — A timer-triggered Azure Function runs before each charge's due date. It deducts the charge amount from the resident's saved payment method and marks the charge as `Paid` on success. On failure, it retries (up to a configurable number of attempts) and then marks the charge as `PaymentFailed`, triggering a notification.

> 🔜 **Payment reminders** — Push and SMS notifications sent to residents a configurable number of days before a charge is due (e.g., 7 days and 1 day before due date).

> 🔜 **Resident control over recurring setup** — Residents can enable or disable automatic payment for their apartment, choose which charges to auto-pay, and update or remove saved payment methods.

> 🔜 **Frequency selection** — When setting up autopay, residents can choose to pay monthly, quarterly, or annually (aligned with the society's maintenance schedule frequency).

> 🔜 **Receipt generation** — On successful payment (whether manual or automated), a formal PDF receipt is generated and stored in Blob Storage. The `ReceiptUrl` field on the charge is populated with the download link.

> 🔜 **Admin controls** — SUAdmin can view all residents' payment setup statuses; disable autopay for a resident if required (e.g., dispute resolution); generate reports on payment gateway success/failure rates.

---

## Acceptance Criteria (Current Phase)
- Residents can upload payment proof for one or multiple pending charges at once.
- Admin receives a notification when proof is submitted.
- Admin can view the proof document and approve or manually mark as paid.
- Charges are shown as `Overdue` based on the society's overdue threshold setting.
- Penalty charges can be added by admin per apartment.

## Acceptance Criteria (Future Phase)
- No raw payment credentials are stored by OurHome.
- Automated deductions run on schedule; failed deductions notify the resident.
- Residents receive a formal PDF receipt for every successful payment.
- Residents can enable/disable autopay at any time.
