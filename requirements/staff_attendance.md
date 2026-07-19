# Staff Attendance Management

## Overview
This module tracks attendance for society staff — security guards, housekeeping, gardeners, plumbers, and other on-payroll or on-contract personnel — as distinct from resident and visitor tracking. It gives `SUAdmin` a roster and shift structure, and a simple daily check-in/check-out record that today is kept (if at all) in a physical register at the gate.

> ✅ **Implemented.** The `Staff` entity, roster/attendance endpoints, and web + mobile UI (staff list, attendance marking, reports) are live.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Manage staff roster (add/edit/deactivate), define shifts, mark or correct attendance, view attendance reports |
| `SUSecurity` | Mark check-in/check-out for staff at the gate, view today's roster and who is currently on duty |
| `SUUser` | No access |

---

## Features

### 1. Staff Roster
- `SUAdmin` can add a staff member with:
  - **Name**, **Phone**, **Photo**
  - **Category** — `Security`, `Housekeeping`, `Gardener`, `Plumber`, `Electrician`, `Other`
  - **Assigned Shift** — reference to a defined shift (see below)
  - **Employment Type** — `OnPayroll` or `Contractor` (contractor optionally linked to a vendor from Vendor & Operational Expense Management)
- `SUAdmin` can deactivate a staff member when they leave; historical attendance records are retained.

### 2. Shift Management
- `SUAdmin` defines named shifts with a start and end time (e.g., "Morning Security", "Night Security", "Housekeeping Day").
- Each staff member is assigned to one shift at a time; shift reassignment is logged with an effective date.

### 3. Attendance Marking
- Check-in and check-out are recorded with a timestamp, marked by `SUSecurity` (for gate/security staff) or by `SUAdmin` on behalf of any staff category.
- A staff member cannot be checked in twice without an intervening check-out for the same day.
- Attendance for a given day defaults to `Absent` if no check-in is recorded by the end of that staff member's shift window, unless `SUAdmin` marks an explicit leave/exception (e.g., approved leave, holiday).
- Check in status should be 

### 4. Today's Roster View
- `SUSecurity` sees a live view of which staff are currently checked in, matching the "who's on the premises" visibility the gate already has for visitors.

### 5. Attendance Reports
- `SUAdmin` can view daily and monthly attendance summaries per staff member: days present, absent, late arrivals (checked in after shift start), for reference during payroll or contractor review.
- Reports are filterable by category and by date range.

### 6. Notifications
- `SUAdmin` is notified if a staff member has not checked in within a configurable grace period (e.g., 30 minutes) after their shift start time.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/staff` | SUAdmin | Add a staff member |
| `PUT` | `/api/societies/{id}/staff/{id}` | SUAdmin | Update staff details / shift assignment |
| `POST` | `/api/societies/{id}/staff/{id}/deactivate` | SUAdmin | Deactivate a staff member |
| `GET` | `/api/societies/{id}/staff` | SUAdmin, SUSecurity | List staff roster |
| `POST` | `/api/societies/{id}/staff/{id}/check-in` | SUAdmin, SUSecurity | Mark check-in |
| `POST` | `/api/societies/{id}/staff/{id}/check-out` | SUAdmin, SUSecurity | Mark check-out |
| `GET` | `/api/societies/{id}/staff/on-duty` | SUAdmin, SUSecurity | Currently checked-in staff |
| `GET` | `/api/societies/{id}/staff/{id}/attendance` | SUAdmin | Attendance history for one staff member |
| `GET` | `/api/societies/{id}/staff/attendance/report` | SUAdmin | Aggregate attendance report, filterable by category/date range |

---

## Acceptance Criteria
- A staff member cannot be checked in twice without a prior check-out on the same day.
- A day with no check-in by end of shift is recorded as `Absent` unless an exception is logged.
- Attendance reports correctly aggregate present/absent/late counts over a selected date range.
- `SUSecurity` can see who is currently on duty in real time.

---

## Future / Planned
> 🔜 **Staff self check-in via QR/geofence** — let staff with their own login mark attendance themselves at the gate, rather than relying solely on `SUSecurity`.

> 🔜 **Leave requests** — allow staff (or their supervising contractor/vendor) to request planned leave in advance, reducing false `Absent` marks.

> 🔜 **Payroll export** — CSV export of monthly attendance suitable for handing to a payroll process or contractor invoice reconciliation.
