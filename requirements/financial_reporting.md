# Financial Reporting

## Overview

This module provides income and expenditure reporting for both society administrators and residents. The goal is full financial transparency — `SUAdmin` can see every rupee coming into and going out of the society, while `SUUser` can track their own payments and see an anonymised society-level summary to verify that their maintenance fees are being used responsibly.

**Money IN** (income) flows from:
- Maintenance fee payments approved by `SUAdmin`
- Penalty charges collected

**Money OUT** (expenses) flows from:
- Vendor recurring cost schedules (see `add_vendor_payments.md`)
- Vendor one-time / ad-hoc payments

All reports derive from existing data already stored in Cosmos DB (maintenance charges, vendor costs). No new data entry is required; this module is purely a reporting and presentation layer.

---

## Roles and Access

| Report | SUAdmin | SUUser |
|--------|---------|--------|
| Financial Dashboard | ✅ Full society view | ✅ Own apartment summary only |
| Income / Collection Report | ✅ Society-wide, all apartments | ❌ |
| Outstanding Dues Report | ✅ Society-wide | ❌ |
| Expense Report | ✅ All vendor costs | ❌ |
| Monthly P&L Statement | ✅ | ❌ |
| Cash Flow Statement | ✅ Date range selectable | ❌ |
| Apartment Ledger | ✅ Any apartment | ✅ Own apartment only |
| Society Ledger (all apartments + vendor charges combined) | ✅ | ❌ |
| Penalty Report | ✅ Society-wide | ❌ |
| Vendor Payment Due Report | ✅ | ❌ |
| Annual Financial Summary | ✅ | ❌ |
| Society Financial Summary | ✅ | ✅ Aggregated, anonymous |
| Personal Payment Statement | ❌ (use Apartment Ledger) | ✅ Own apartment only |
| Annual Maintenance Statement | ❌ (use Apartment Ledger) | ✅ Own apartment only |

---

## SUAdmin Reports

---

### 1. Financial Dashboard

**Purpose:** At-a-glance view of the society's financial health for the current month and year.

**Accessible from:** A dedicated "Finance" section in the admin navigation or a widget on the main dashboard.

**Sections:**

#### This Month Summary
| Metric | Description |
|--------|-------------|
| Total Income (MTD) | Sum of all approved maintenance payments in the current calendar month |
| Total Expenses (MTD) | Sum of all vendor costs marked as paid in the current calendar month |
| Net Surplus / Deficit | Income MTD − Expenses MTD |
| Collection Efficiency | (Apartments with at least one paid charge this month) ÷ (Total apartments with a due charge this month) × 100% |
| Total Outstanding Dues | Sum of all pending + overdue charges across all apartments |
| Pending Vendor Payments | Sum of all vendor costs not yet marked paid and whose due date ≤ today |

#### Quick Action Panels
- **Top 5 Overdue Apartments** — apartment number, resident name, overdue amount, days overdue. Each row links to the apartment ledger.
- **Upcoming Vendor Payments (next 7 days)** — vendor name, amount, due date. Each row links to the vendor cost record.

#### Upcoming Cash Inflow / Outflow (implemented, both web and mobile dashboards)
- **Upcoming Cash Inflow (7 days)** — total and per-apartment breakdown of `Pending`/`Overdue` maintenance charges due within the next 7 days (`UpcomingChargeDto`: apartment, amount, due date, days until due).
- **Upcoming Cash Outflow (7 days)** — the existing Upcoming Vendor Payments total, now also surfaced as a headline card alongside inflow.
- Both totals (`UpcomingCashInflow`, `UpcomingCashOutflow`) are computed fields on the dashboard response so admins can see net expected cash movement for the week at a glance.

**Filters:** None (always reflects current month / running totals).

**API Endpoint:**
```
GET /api/societies/{id}/reports/financial-dashboard
```

---

### 2. Income / Collection Report

**Purpose:** Detailed view of all maintenance fee income received or expected over a selectable period.

**Filters:**
| Filter | Type | Notes |
|--------|------|-------|
| From Month / Year | Required | Defaults to current month |
| To Month / Year | Required | Defaults to current month |
| Block | Optional | Filter by apartment block |
| Apartment | Optional | Typeahead search |
| Payment Status | Optional | Pending, Submitted, Paid, Overdue, All |

**Report Columns:**

| Column | Description |
|--------|-------------|
| Apartment | Apartment number + block |
| Resident | Owner / tenant name |
| Charge Period | Month + Year |
| Amount Due | Charge amount (maintenance + any penalty on this charge) |
| Amount Paid | Approved payment amount (0 if not yet approved) |
| Payment Date | Date payment proof was submitted by resident |
| Approval Date | Date `SUAdmin` approved the payment |
| Payment Method | Cash / NEFT / UPI / Cheque (set at approval time) |
| Status | Pending / Submitted / Paid / Overdue |
| Days Overdue | Positive integer if status is Overdue, else blank |

**Summary Row (pinned at top):**
- Total Due across filtered set
- Total Collected
- Total Pending
- Total Overdue
- Collection % (Collected ÷ Due × 100)

**Grouping:** Can be toggled between flat list, grouped by month, or grouped by block.

**Export:** CSV, PDF.

**API Endpoint:**
```
GET /api/societies/{id}/reports/income
  ?fromMonth=&fromYear=&toMonth=&toYear=
  &apartmentId=&block=&status=
  &format=csv|pdf
```

---

### 3. Outstanding Dues Report

**Purpose:** Focused view of all apartments with unpaid or overdue charges — the "who owes what" report.

**Filters:**
| Filter | Type |
|--------|------|
| As of Date | Defaults to today |
| Block | Optional |
| Overdue Only | Toggle — show only charges past the overdue threshold |
| Min Amount | Optional numeric filter |

**Report Columns:**

| Column | Description |
|--------|-------------|
| Apartment | Number + block |
| Resident | Owner / tenant name |
| Phone | Resident phone (for follow-up) |
| Total Outstanding | Sum of all pending + overdue charges for this apartment |
| Oldest Unpaid Month | Earliest charge period still unpaid |
| Months Unpaid | Count of distinct unpaid charge months |
| Days Since Oldest Due | Days since the oldest unpaid charge's due date |
| Last Payment Date | Date of most recent approved payment |

**Sort:** Default by Total Outstanding descending. Sortable by any column.

**Summary:** Total outstanding amount; count of apartments with dues; count of apartments more than 30/60/90 days overdue.

**Export:** CSV, PDF. The PDF variant is formatted as a "Dues Notice List" suitable for printing or sharing at a committee meeting.

**API Endpoint:**
```
GET /api/societies/{id}/reports/outstanding-dues
  ?asOf=&block=&overdueOnly=true|false&minAmount=
  &format=csv|pdf
```

---

### 4. Expense Report

**Purpose:** All vendor costs (recurring + one-time) for a selected period, showing what has been paid and what is still due.

**Filters:**
| Filter | Type |
|--------|------|
| From Month / Year | Required |
| To Month / Year | Required |
| Vendor | Optional — typeahead |
| Business Type / Category | Optional |
| Payment Status | Paid / Unpaid / All |

**Report Columns:**

| Column | Description |
|--------|-------------|
| Vendor Name | |
| Business Type | e.g., Electrician, Plumber, Security |
| Cost Type | Recurring or One-Time |
| Charge Period | Month the cost applies to |
| Amount | |
| Due Date | Payment due date for that cost |
| Paid Date | Date `SUAdmin` marked it paid |
| Payment Reference | Receipt / transaction reference number |
| Status | Paid / Unpaid / Overdue |

**Summary Row:**
- Total Expenses in period
- Total Paid
- Total Unpaid
- Total Overdue (past due date, not yet paid)

**Grouping:** Toggleable — flat list, grouped by vendor, or grouped by month.

**Export:** CSV, PDF.

**API Endpoint:**
```
GET /api/societies/{id}/reports/expenses
  ?fromMonth=&fromYear=&toMonth=&toYear=
  &vendorId=&businessType=&status=
  &format=csv|pdf
```

---

### 5. Monthly Profit & Loss Statement

**Purpose:** A single-month income-versus-expense summary that shows whether the society ran a surplus or a deficit that month. Intended for committee review and sharing with residents.

**Inputs:** Month, Year (required).

**Structure:**

```
INCOME
  Maintenance fees collected         ₹ X,XX,XXX
  Penalty charges collected          ₹    X,XXX
  ─────────────────────────────────────────────
  Total Income                       ₹ X,XX,XXX

EXPENSES
  [Vendor Business Type 1]           ₹    X,XXX
  [Vendor Business Type 2]           ₹    X,XXX
  ...
  ─────────────────────────────────────────────
  Total Expenses                     ₹    X,XXX

NET SURPLUS / (DEFICIT)              ₹ X,XX,XXX

MEMO
  Total charges raised this month    ₹ X,XX,XXX
  Total outstanding / uncollected    ₹    X,XXX
  Collection efficiency              XX%
```

**Comparison column:** Previous month figures shown alongside for context.

**Export:** PDF only (formatted as a printable statement with society name and month header).

**API Endpoint:**
```
GET /api/societies/{id}/reports/profit-loss?month=&year=
  &format=pdf
```

---

### 6. Cash Flow Statement

**Purpose:** Month-by-month view of cash received versus cash paid out over a date range. Useful for planning upcoming expenses and understanding seasonal collection patterns.

**Inputs:** From Month/Year, To Month/Year (required). Maximum range: 24 months.

**Table Columns (one row per month):**

| Column | Description |
|--------|-------------|
| Month | |
| Cash In — Maintenance | Approved maintenance payments received |
| Cash In — Penalties | Penalty amounts collected |
| Total Cash In | Sum of all income |
| Cash Out — Vendors | Vendor costs marked as paid |
| Total Cash Out | Sum of all expenses |
| Net Cash | Cash In − Cash Out |
| Running Balance | Cumulative net (requires an opening balance — see note) |

> **Note:** The Running Balance column is only shown if `SUAdmin` has configured a Society Opening Balance figure via the society settings (`PUT /api/societies/{id}`). Without it, only net-per-month is shown.

**Chart:** A dual-bar chart (Cash In vs Cash Out per month) with a line overlay for Net Cash.

**Export:** CSV, PDF.

**API Endpoint:**
```
GET /api/societies/{id}/reports/cash-flow
  ?fromMonth=&fromYear=&toMonth=&toYear=
  &format=csv|pdf
```

---

### 7. Apartment Ledger

**Purpose:** Complete financial history for a single apartment — every charge raised, every payment submitted and approved, and every penalty. Formatted as a running account statement.

**Input:** Apartment ID (required). Optional date range filter.

**Columns:**

| Column | Description |
|--------|-------------|
| Date | Transaction date (charge raise date, payment date, or penalty date) |
| Description | e.g., "Maintenance — June 2025", "Penalty — Late payment", "Payment received" |
| Type | Charge / Payment / Penalty |
| Debit (₹) | Amount added to the balance (charges, penalties) |
| Credit (₹) | Amount reducing the balance (approved payments) |
| Balance (₹) | Running outstanding after this transaction |

**Header section:** Apartment number, block, floor, current resident name and type, total current outstanding.

**Export:** PDF. The PDF is formatted as an official "Account Statement" with society header — suitable for emailing to the resident or presenting at a committee meeting.

**API Endpoint (actual current route — differs from the `/reports/...` prefix used elsewhere in this document):**
```
GET /api/societies/{id}/financial-report/ledger?apartmentId=
```

---

### 7b. Society Ledger

**Purpose:** The same running-balance ledger as the Apartment Ledger, but aggregated across every apartment in the society plus all vendor charges — a single combined debit/credit view of all society-wide financial activity, chronologically ordered.

**Input:** Optional date range filter (`from`/`to`).

**Columns:** Same shape as the Apartment Ledger (Date, Description, Type, Debit, Credit, Balance), spanning all apartments' maintenance charges and all vendor charges instead of one apartment.

**Access:** `SUAdmin` / `HQAdmin` / `HQUser` only.

**Accessible from:** A "Society Ledger" tab on the Financial Report page (web) alongside Dashboard / Cash Flow / Apartment Ledger; a "Society Ledger" tab on the mobile Financial Report screen.

**API Endpoint:**
```
GET /api/societies/{id}/financial-report/society-ledger?from=&to=
```

---

### 8. Penalty Report

**Purpose:** All penalty charges issued in a period — who was penalised, for what, how much, and whether it has been collected.

**Filters:** Date range, apartment, status (collected / pending).

**Report Columns:**

| Column | Description |
|--------|-------------|
| Apartment | |
| Resident | |
| Penalty Amount | |
| Reason | Text reason entered by `SUAdmin` |
| Raised Date | |
| Related Charge Period | If the penalty is linked to a specific maintenance month |
| Status | Pending / Paid |
| Collected Date | Date the penalty was paid (if applicable) |

**Summary:** Total penalties raised, total collected, total outstanding.

**Export:** CSV, PDF.

**API Endpoint:**
```
GET /api/societies/{id}/reports/penalties
  ?fromMonth=&fromYear=&toMonth=&toYear=
  &apartmentId=&status=
  &format=csv|pdf
```

---

### 9. Vendor Payment Due Report

**Purpose:** A cash-planning tool showing all upcoming and overdue vendor payments so the committee knows what outflows to expect.

**Sections:**

#### Overdue Vendor Payments
- All vendor costs whose due date has passed but have not been marked paid.
- Columns: Vendor, Cost Type, Period, Amount, Due Date, Days Overdue.

#### Upcoming Payments (configurable horizon)
- Vendor costs due within the next 7 / 14 / 30 days (admin selects the window).
- Columns: Vendor, Cost Type, Period, Amount, Due Date, Days Until Due.

**Summary:** Total overdue amount; total upcoming amount within selected window.

**Export:** PDF (formatted as a payment schedule, suitable for committee approval).

**API Endpoint:**
```
GET /api/societies/{id}/reports/vendor-dues
  ?horizon=7|14|30
  &format=pdf
```

---

### 10. Annual Financial Summary

**Purpose:** Full-year income and expense rollup for the financial year — intended for the Annual General Meeting (AGM) and official society records.

**Input:** Financial Year (e.g., `2025-26`). The system uses April–March as the financial year for India; this should be configurable per society.

**Structure:**

- **Income section:** Monthly breakdown of maintenance collected + penalties. Total collected vs total due. Collection efficiency per month (bar chart).
- **Expense section:** Monthly breakdown of vendor costs paid. Top 5 expenses by vendor / category.
- **Net section:** Month-by-month surplus / deficit. Full-year net surplus / deficit.
- **Outstanding section:** Apartments with dues still unpaid as of year-end.
- **Comparative section (if prior year data exists):** Current year vs prior year totals.

**Export:** PDF only (multi-page formatted document with society name, financial year, and prepared date on the cover).

**API Endpoint:**
```
GET /api/societies/{id}/reports/annual-summary
  ?financialYear=2025-26
  &format=pdf
```

---

## SUUser Reports

---

### 11. Personal Payment Statement

**Purpose:** Residents can see all charges raised against their apartment and the status of each payment. The primary self-service financial view for a resident.

**Filters:** Year (required), Month (optional), Status (optional — Pending / Submitted / Paid / Overdue).

**Report Columns:**

| Column | Description |
|--------|-------------|
| Charge Period | Month + Year |
| Charge Type | Maintenance / Penalty |
| Amount | |
| Due Date | |
| Status | Pending / Submitted / Paid / Overdue |
| Submitted On | Date resident uploaded proof |
| Approved On | Date `SUAdmin` approved |
| Payment Method | Shown only for Paid entries |
| Receipt | Download link (if receipt PDF was generated) |

**Summary:** Total charged, total paid, total outstanding for the selected period.

**Export:** PDF (formatted as a "Payment Statement" with the resident's name and apartment).

**API Endpoint:**
```
GET /api/societies/{id}/apartments/{aptId}/reports/statement
  ?year=&month=&status=
  &format=pdf
```

---

### 12. Society Financial Summary (Transparency Report)

**Purpose:** Allows residents to see how the society's money is being managed without exposing any other resident's personal payment data. Promotes financial transparency and trust.

**No filters** — always reflects the current calendar month and the current financial year-to-date.

**Sections:**

#### This Month
| Metric | What Resident Sees |
|--------|-------------------|
| Total maintenance due across society | ₹ X,XX,XXX |
| Total maintenance collected | ₹ X,XX,XXX |
| Collection percentage | XX% of apartments have paid for [Month] |
| Total vendor expenses paid | ₹ X,XX,XXX |
| Net surplus / (deficit) | ₹ X,XXX |

#### This Financial Year (YTD)
| Metric | What Resident Sees |
|--------|-------------------|
| Total income collected (YTD) | ₹ X,XX,XXX |
| Total expenses paid (YTD) | ₹ X,XX,XXX |
| Net surplus / (deficit) YTD | ₹ X,XX,XXX |

#### Expense Breakdown (YTD)
- Pie or bar chart showing vendor expenses by business type (e.g., Security: 40%, Cleaning: 25%, Electrician: 20%, Other: 15%).
- No individual vendor names or amounts shown — only category percentages.

> **Privacy rules:** This report never shows individual apartment names, payment amounts, or resident names. Only society-level aggregates and percentages are displayed.

**API Endpoint:**
```
GET /api/societies/{id}/reports/society-summary
```

---

### 13. Annual Maintenance Statement

**Purpose:** A formatted annual statement of the resident's own maintenance payments for the calendar year or financial year — useful for tax records, employer reimbursement, or personal auditing.

**Input:** Year (calendar or financial year, selectable).

**Content:**
- Header: Society name, apartment number, resident name, year.
- Table: One row per charge — period, amount, paid date, payment method.
- Footer: Total charged, total paid, outstanding balance.

**Export:** PDF only (official-looking format with society details in header).

**API Endpoint:**
```
GET /api/societies/{id}/apartments/{aptId}/reports/annual-statement
  ?year=2025&yearType=calendar|financial
  &format=pdf
```

---

## API Endpoints Summary

| Method | Route | Auth | Report |
|--------|-------|------|--------|
| `GET` | `/api/societies/{id}/reports/financial-dashboard` | SUAdmin | Financial dashboard |
| `GET` | `/api/societies/{id}/reports/income` | SUAdmin | Income / collection report |
| `GET` | `/api/societies/{id}/reports/outstanding-dues` | SUAdmin | Outstanding dues |
| `GET` | `/api/societies/{id}/reports/expenses` | SUAdmin | Expense report |
| `GET` | `/api/societies/{id}/reports/profit-loss` | SUAdmin | Monthly P&L |
| `GET` | `/api/societies/{id}/reports/cash-flow` | SUAdmin | Cash flow statement |
| `GET` | `/api/societies/{id}/financial-report/ledger?apartmentId=` | SUAdmin | Apartment ledger (actual route uses `/financial-report/`, not `/reports/`) |
| `GET` | `/api/societies/{id}/financial-report/society-ledger` | SUAdmin | Society-wide ledger (all apartments + vendor charges) |
| `GET` | `/api/societies/{id}/reports/penalties` | SUAdmin | Penalty report |
| `GET` | `/api/societies/{id}/reports/vendor-dues` | SUAdmin | Vendor payment due report |
| `GET` | `/api/societies/{id}/reports/annual-summary` | SUAdmin | Annual financial summary |
| `GET` | `/api/societies/{id}/apartments/{aptId}/reports/statement` | SUUser (own apt) | Personal payment statement |
| `GET` | `/api/societies/{id}/reports/society-summary` | SUUser, SUAdmin | Society financial summary |
| `GET` | `/api/societies/{id}/apartments/{aptId}/reports/annual-statement` | SUUser (own apt) | Annual maintenance statement |

All export endpoints accept `?format=csv` or `?format=pdf` where applicable. PDF responses use `Content-Type: application/pdf` with `Content-Disposition: attachment`.

---

## Common Behaviours

- **Multi-tenancy:** Every report query is scoped to the `societyId` from the JWT. Cross-society data access is not possible.
- **Currency:** All amounts are displayed in Indian Rupees (₹). Numbers follow Indian formatting (e.g., ₹1,23,456).
- **Date range cap:** Cash Flow and Income/Expense reports are capped at a 24-month range per request to prevent unbounded Cosmos fan-out.
- **No new data stores:** All report data is derived from existing Cosmos containers (`maintenance-charges`, `vendor-costs`, `vendor-payments`). Reports are computed on-demand; no separate reporting database is required at this scale.
- **SUUser apartment scoping:** `SUUser` report endpoints automatically scope to the apartment linked to the requesting user's JWT. Attempting to request another apartment's data returns `403 Forbidden`.
- **Zero-data states:** If no data exists for a selected period, reports return an empty result set with a clear message rather than an error.

---

## Acceptance Criteria

- `SUAdmin` can open the Financial Dashboard and see this month's income, expenses, net, and collection efficiency without applying any filters.
- Income Report total for a selected month matches the sum of approved charge amounts visible in the maintenance grid for that month.
- Outstanding Dues Report lists every apartment that has at least one charge in `Pending` or `Overdue` status; no paid apartment appears on this list.
- Expense Report total for a selected vendor and month matches the total visible in the vendor cost grid for that vendor and month.
- Monthly P&L Total Income = sum of all maintenance payments approved in that month + penalties collected. Total Expenses = sum of all vendor costs marked paid in that month.
- Cash Flow Running Balance column is only visible when `SUAdmin` has configured a Society Opening Balance.
- Apartment Ledger Balance column starts at 0 and increases on every charge/penalty, decreases on every approved payment; final balance equals the apartment's current outstanding dues.
- `SUUser` personal statement shows only their own apartment's charges; requesting another apartment's data returns `403`.
- Society Financial Summary shows no individual apartment name, resident name, or individual payment amount.
- All PDF exports download without server error and display the society name and report period in the document header.
- Society Ledger's total entries equal the sum of every apartment's ledger entries plus every vendor charge, in one chronological running-balance view; only `SUAdmin`/`HQAdmin`/`HQUser` can access it.
- Dashboard Upcoming Cash Inflow and Upcoming Cash Outflow cards both reflect the same 7-day window and are present on both web and mobile.

---

## Future / Planned

> 🔜 **Opening Balance configuration** — `PUT /api/societies/{id}/settings` field `openingBalance` (₹) and `openingBalanceDate` so the Cash Flow Running Balance and Annual Summary can show a true cumulative surplus figure.

> 🔜 **Scheduled report delivery** — allow `SUAdmin` to configure a monthly email delivery of the P&L Statement and Cash Flow PDF to a list of committee email addresses (via ACS Email), triggered by the outbox timer function on the 1st of each month.

> 🔜 **Income categories beyond maintenance** — a mechanism for `SUAdmin` to record other income (parking fees, hall booking income, interest on FD) so the P&L reflects all society income, not just maintenance fees.

> 🔜 **Utility bill tracking** — a simple log for electricity, water, and municipal tax payments so those appear in the Expense Report alongside vendor costs.

> 🔜 **Budget vs Actual** — `SUAdmin` sets an annual budget per expense category; the Annual Summary and Financial Dashboard show actual spend vs budget with a variance column.

> 🔜 **Society Summary shareable link** — a read-only, token-protected public URL for the Society Financial Summary that `SUAdmin` can share at AGMs or paste into a notice, without requiring residents to log in.

> 🔜 **Receipt PDF auto-generation** — when `SUAdmin` approves a payment or marks a charge as paid, auto-generate a PDF receipt and populate `ReceiptUrl` so the Download link in the Personal Statement is always populated (currently tracked as a gap in `add_maintanence.md`).
