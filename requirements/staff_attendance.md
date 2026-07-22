# Staff Attendance Management

## Overview
This module tracks attendance for society staff — security guards, housekeeping, gardeners, plumbers, and other on-payroll or on-contract personnel — as distinct from resident and visitor tracking. It gives `SUAdmin` a roster and shift structure, and a simple daily check-in/check-out record that today is kept (if at all) in a physical register at the gate.

> ✅ **Implemented.** The `Staff` entity, roster/attendance endpoints, and web + mobile UI (staff list, attendance marking, reports) are live.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Manage staff roster (add/edit/deactivate/reactivate/permanently delete), create/update/delete shifts, mark or correct attendance, view attendance reports |
| `SUSecurity` | Mark check-in/check-out for staff at the gate, view today's roster and who is currently on duty |
| `SUUser` | Read-only access to the staff roster — sees each staff member's name and phone number only; no add/edit/deactivate, check-in/out, on-duty status, or attendance reports |

---

## Features

### 1. Staff Roster
- `SUAdmin` can add a staff member with:
  - **Name**, **Phone**, **Photo**
  - **Category** — `Security`, `Housekeeping`, `Gardener`, `Plumber`, `Electrician`, `Other`
  - **Assigned Shift** — reference to a defined shift (see below)
  - **Employment Type** — `OnPayroll` or `Contractor` (contractor optionally linked to a vendor from Vendor & Operational Expense Management)
- `SUAdmin` can deactivate a staff member when they leave; historical attendance records are retained.
- `SUAdmin` can reactivate a previously deactivated staff member, restoring their visibility in check-in/check-out and on-duty views.
- `SUAdmin` can permanently delete a staff member (hard delete, distinct from deactivate) — this removes the roster entry entirely rather than just hiding it; historical attendance records already written are not retroactively deleted.

### 2. Shift Management
- `SUAdmin` defines named shifts with a start and end time (e.g., "Morning Security", "Night Security", "Housekeeping Day").
- `SUAdmin` can update a shift's name, times, and grace period at any time.
- `SUAdmin` can delete a shift, but only if no currently-active staff member is still assigned to it — deleting an in-use shift is rejected (`SHIFT_IN_USE`) so no staff member is left silently pointing at a shift that no longer exists. Reassign or deactivate the affected staff first.
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
| `POST` | `/api/societies/{id}/staff/{id}/reactivate` | SUAdmin | Reactivate a previously deactivated staff member |
| `DELETE` | `/api/societies/{id}/staff/{id}` | SUAdmin | Permanently delete a staff member (hard delete) |
| `GET` | `/api/societies/{id}/staff` | SUAdmin, SUSecurity, SUUser | List staff roster (SUUser sees a read-only view — name and phone only, no on-duty status or actions) |
| `POST` | `/api/societies/{id}/staff/{id}/check-in` | SUAdmin, SUSecurity | Mark check-in |
| `POST` | `/api/societies/{id}/staff/{id}/check-out` | SUAdmin, SUSecurity | Mark check-out |
| `GET` | `/api/societies/{id}/staff/on-duty` | SUAdmin, SUSecurity | Currently checked-in staff |
| `GET` | `/api/societies/{id}/staff/{id}/attendance` | SUAdmin | Attendance history for one staff member |
| `GET` | `/api/societies/{id}/staff/attendance/report` | SUAdmin | Aggregate attendance report, filterable by category/date range |
| `POST` | `/api/societies/{id}/shifts` | SUAdmin | Create a shift |
| `PUT` | `/api/societies/{id}/shifts/{id}` | SUAdmin | Update a shift's name, times, and grace period |
| `DELETE` | `/api/societies/{id}/shifts/{id}` | SUAdmin | Delete a shift (rejected with `SHIFT_IN_USE` if any active staff member is still assigned to it) |
| `GET` | `/api/societies/{id}/shifts` | SUAdmin, SUSecurity | List shifts |

---

## Acceptance Criteria
- A staff member cannot be checked in twice without a prior check-out on the same day.
- A day with no check-in by end of shift is recorded as `Absent` unless an exception is logged.
- Attendance reports correctly aggregate present/absent/late counts over a selected date range.
- `SUSecurity` can see who is currently on duty in real time.
- `SUUser` can view the staff roster (name and phone number for each staff member) but cannot add, edit, deactivate, check in/out, or view on-duty status or attendance reports — every mutating/attendance endpoint stays SUAdmin/SUSecurity-only.
- `SUAdmin` can reactivate a deactivated staff member, and can permanently delete any staff member regardless of active/inactive state.
- `SUAdmin` can create, update, and delete shifts; deleting a shift still assigned to an active staff member is rejected.

---

## Future / Planned
> 🔜 **Staff self check-in via QR/geofence** — let staff with their own login mark attendance themselves at the gate, rather than relying solely on `SUSecurity`.

> 🔜 **Leave requests** — allow staff (or their supervising contractor/vendor) to request planned leave in advance, reducing false `Absent` marks.

> 🔜 **Payroll export** — CSV export of monthly attendance suitable for handing to a payroll process or contractor invoice reconciliation.
