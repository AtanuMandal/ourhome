# Maintenance Fee Management

## Overview
`SUAdmin` configures maintenance fee schedules that automatically generate recurring charges for all apartments. Residents view and pay their charges by uploading proof; admins review and approve payments. An overdue threshold (1–90 days) controls when charges are flagged as late. A society-wide financial grid gives admins a month-by-month payment status view across all apartments.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create/inactivate/delete schedules; view grid; approve payments; mark paid; add penalties |
| `SUUser` | View own charges; upload payment proof |

---

## Fee Schedule Configuration

### Creating a Schedule
`SUAdmin` creates a fee schedule with:

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | e.g., "Monthly Society Maintenance" |
| Description | No | |
| Frequency | Yes | `Monthly`, `Quarterly`, or `Yearly` |
| Pricing Type | Yes | `Fixed` (per apartment) or `PerSqFt` |
| Rate / Amount | Yes | Fixed: flat amount. PerSqFt: rate per square foot |
| Area Basis | If PerSqFt | `CarpetArea`, `BuiltUpArea`, or `SuperBuiltUpArea` |
| Start Month + Year | Yes | First month from which charges are generated |
| End Month + Year | Yes | Last month for which charges are generated |
| Due Day | Yes | Day of the month when the charge is due (e.g., 10 = 10th of each month) |
| Apartment ID | No | Leave blank for society-wide; specify one apartment ID for apartment-specific |

**Business rules:**
- There must be **only one active schedule per society** at any given time. An inactive schedule before its effective date is treated as active for this purpose.
- On creation, the system retroactively generates all monthly (or quarterly/yearly) charges from `StartMonth/Year` to `EndMonth/Year` for all applicable apartments.
- When using `PerSqFt`, the charge for each apartment is: `rate × apartment.SelectedArea`. Apartments without the selected area type are skipped or flagged.

### Inactivating a Schedule
- `SUAdmin` cannot edit the rate, frequency, or start date of an existing schedule.
- `SUAdmin` can inactivate a schedule from a specific future month and year with a mandatory reason.
- All charges from the inactivation month onward are voided (soft-deleted).
- `PUT /api/societies/{id}/maintenance/schedules/{id}` with `inactiveFromMonth`, `inactiveFromYear`, `reason`.

### Deleting a Schedule
- A schedule can only be deleted when it is in **inactive** status and at least one other active schedule exists.
- Deleting removes all future charges permanently.
- `DELETE /api/societies/{id}/maintenance/schedules/{id}` with `reason`.

### Reactivating a Schedule
- If a schedule is reactivated, charges are re-posted based on existing logic (rate × apartments, start from effective month).

---

## Charge Generation

- Charges are automatically generated when a schedule is created.
- Charges represent a single month's (or quarter's or year's) fee for a specific apartment.
- Each charge has: `ScheduleId`, `ApartmentId`, `SocietyId`, `DueDate`, `Amount`, `Status`, `IsOverdue`.
- `IsOverdue` is true when: `Status != Paid` AND `DateTime.UtcNow > DueDate + Society.MaintenanceOverdueThresholdDays`.
- **Grid mirroring:** All charges for a society and financial year are also mirrored into a dedicated Cosmos container (the "grid view table") for efficient admin grid reads. Any mutation on charges (create, inactivate, pay, approve) must update both the charges container and the grid view container.

---

## Resident Payment Flow

### View Charges
- `GET /api/societies/{id}/apartments/{id}/maintenance/charges?year=&month=` — resident views their own charges with status and overdue flag.

### Upload Proof
- `POST /api/societies/{id}/maintenance/payments/proof/upload` — uploads a receipt image or PDF to Azure Blob Storage. Returns a URL.

### Submit Proof
- `POST /api/societies/{id}/maintenance/payments/proof` — links the uploaded URL to one or more pending charge IDs simultaneously.
- All specified charges transition from `Pending` (or `Overdue`) to `Submitted`.
- Admin is notified to review the proof.
- ⚠️ **Gap:** Admin push notification on proof submission must be confirmed in the domain event handler (`SubmitMaintenancePaymentProofCommand`).

---

## Admin Controls

### View All Charges
- `GET /api/societies/{id}/maintenance/charges` — society-wide charges with filters: `apartmentId`, `year`, `month`, `status`.

### Financial Year Grid
- `GET /api/societies/{id}/maintenance/grid` — a 2D grid where:
  - **Y-axis:** Apartments (showing owner name)
  - **X-axis:** Months within a date range
  - **Each cell:** Charge status for that apartment + month (`Pending`, `Submitted`, `Paid`, `Overdue`, no charge)
- **Grid filters:** `status` (pending / submitted / paid), `apartmentId`, `block`, `floor`, `fromMonth/Year`, `toMonth/Year`
- **Grid header summary:** For each month column, show total paid amount, total submitted amount, and total pending amount.
- Admin can click a cell to view the uploaded proof document in a popup and then approve or mark as paid.

### Approve Payment
- `POST /api/societies/{id}/maintenance/charges/{id}/approve` — admin approves submitted proof; charge status → `Paid`.

### Mark as Paid (Manual)
- `POST /api/societies/{id}/maintenance/charges/{id}/mark-paid` — admin directly marks a charge as paid with:
  - Payment method (Cash, NEFT, UPI, Cheque, etc.)
  - Transaction reference number
  - Receipt URL (optional)
  - Payment date

### Penalty Charges
- `POST /api/societies/{id}/maintenance/charges/penalty` — admin adds a one-time penalty charge for a specific apartment with an amount and reason.

### Overdue Threshold Setting
- Configured via `PUT /api/societies/{id}` (`MaintenanceOverdueThresholdDays`).
- Valid range: 1–90 days.
- Controls when a `Pending` charge transitions to `Overdue` display state.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/maintenance/schedules` | SUAdmin | Create fee schedule |
| `GET` | `/api/societies/{id}/maintenance/schedules` | SUAdmin | List schedules |
| `PUT` | `/api/societies/{id}/maintenance/schedules/{id}` | SUAdmin | Inactivate schedule |
| `DELETE` | `/api/societies/{id}/maintenance/schedules/{id}` | SUAdmin | Delete inactive schedule |
| `GET` | `/api/societies/{id}/apartments/{id}/maintenance/charges` | SUUser, SUAdmin | Resident charge history |
| `GET` | `/api/societies/{id}/maintenance/charges` | SUAdmin | Society-wide charges |
| `GET` | `/api/societies/{id}/maintenance/grid` | SUAdmin | Financial year grid |
| `POST` | `/api/societies/{id}/maintenance/payments/proof/upload` | SUUser | Upload payment proof |
| `POST` | `/api/societies/{id}/maintenance/payments/proof` | SUUser | Submit proof for charges |
| `POST` | `/api/societies/{id}/maintenance/charges/{id}/approve` | SUAdmin | Approve submitted proof |
| `POST` | `/api/societies/{id}/maintenance/charges/{id}/mark-paid` | SUAdmin | Manually mark as paid |
| `POST` | `/api/societies/{id}/maintenance/charges/penalty` | SUAdmin | Add penalty charge |

---

## Acceptance Criteria
- Only one active schedule per society at any time; creation is blocked if an active schedule already exists.
- `PerSqFt` charges multiply the rate by the correct apartment area type.
- Inactivating a schedule from month M voids all charges from month M onward.
- Extending a schedule's end date adds only the incremental new months.
- Grid reads from the mirrored container so that admin grid loads are fast regardless of charge count.
- Resident sees charges as `Overdue` after the society's configured threshold days.
- Admin proof popup shows the uploaded document before approval.
- Penalty charges appear in the resident's charge list and in the admin grid.

---

## Future / Planned

> 🔜 **Admin notification on proof submission** — verify and complete the domain event handler that sends a push notification to `SUAdmin` when a resident submits payment proof.

> 🔜 **Receipt PDF generation** — on marking a charge as paid or approving proof, generate a PDF receipt and populate the `ReceiptUrl` field so residents can download a formal receipt.

> 🔜 **Automated payment gateway integration** — see `recurring_fee_payment.md` for the planned automated deduction and payment gateway phase.
