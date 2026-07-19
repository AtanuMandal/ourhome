# Amenity Booking

## Overview
The amenity booking module allows residents to book society amenities (clubhouse, gym, swimming pool, community hall, etc.) for specific time slots. Admins configure amenity details and approve or reject booking requests. The system enforces slot overlap prevention and configurable operating hours.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create/update amenities, approve/reject bookings, view all bookings, cancel any booking (remarks required, shown to the resident) |
| `SUUser` | Browse amenities, book slots, view own bookings, cancel own pending/approved bookings |
| `SUSecurity` | View bookings (read-only) |

---

## Features

### 1. Amenity Configuration (Admin)
- `SUAdmin` can create an amenity with:
  - **Name** (required) — e.g., "Clubhouse", "Swimming Pool"
  - **Description**
  - **Capacity** — maximum number of occupants
  - **Rules** — free-text rules for usage
  - **Booking Slot Duration** — minutes per bookable slot (e.g., 60 min)
  - **Operating Hours** — `openTime` and `closeTime` per day
  - **Advance Booking Days** — how many days in advance a resident can book
- ⚠️ **Gap:** `UpdateAmenityCommand` is implemented in the application layer but **no `PUT /amenities/{id}` HTTP endpoint** is exposed. Admins cannot update amenity settings via the API.

### 2. Amenity Listing
- Residents can browse all amenities in their society with capacity, rules, and operating hours.
- `GET /api/societies/{id}/amenities` — returns all amenities.
- `GET /api/societies/{id}/amenities/{id}/availability?date=YYYY-MM-DD` — returns available and booked slots for a specific date.

### 3. Booking System
- Residents can book an amenity for a specific `startTime` / `endTime`.
- Booking times are **society wall-clock time** (`YYYY-MM-DDTHH:mm`, no UTC conversion) — the backend compares the time of day against the amenity's operating hours.
- The booker is stamped server-side from the JWT; the apartment falls back to the JWT claim when the client omits it.
- The system enforces **slot overlap prevention** — two bookings for the same amenity cannot overlap (conflicts return HTTP 409).
- Booking is created with status `Pending`.
- A push notification is sent to the booking resident confirming the pending booking.
- **Cancel booking** — `POST /amenity-bookings/{id}/cancel`: the booking owner can cancel their own pending/approved booking; `SUAdmin` can cancel any booking but **must supply remarks**, which are stored on the booking (`cancellationRemarks`, `cancelledByUserId`), shown to the resident in their booking list, and pushed as a notification.
- ⚠️ **Gap:** **Reschedule booking** — no `PATCH` endpoint exists for modifying a booking's time; cancel and re-book instead.

### 4. Admin Approval / Rejection
- `SUAdmin` can approve or reject pending booking requests via `POST /amenity-bookings/{id}/approve` and `/reject` (optional `adminNotes` in the body, shown to the resident).
- A "Booking Approved" / "Booking Rejected" push notification is sent to the booking resident on decision.
- **Bookings list** — `GET /amenity-bookings`: admins receive every booking in the society (to approve/reject/cancel); residents receive their own.

### 5. Availability Calendar
- `GET /api/societies/{id}/amenities/{id}/availability?date=` returns available slots for a specific date.
- ⚠️ **Gap:** Only single-date slot lookup is available. A **week or month calendar view** (date range availability) is not supported.

### 6. Notifications
- Booking creation sends a push notification to the booking resident with the booking summary.
- Approval and rejection each send a push notification to the booking resident.
- Admin cancellation of a resident's booking sends a push notification carrying the cancellation remarks.

### 7. Admin Usage Reports
- ⚠️ **Gap:** No reporting endpoint for amenity utilisation, peak booking times, or most-booked amenities.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/amenities` | SUAdmin | Create amenity |
| `GET` | `/api/societies/{id}/amenities` | Authenticated | List amenities |
| `GET` | `/api/societies/{id}/amenities/{id}/availability` | Authenticated | Available slots for a date |
| `POST` | `/api/societies/{id}/amenity-bookings` | Authenticated | Book an amenity (booker stamped from JWT) |
| `GET` | `/api/societies/{id}/amenity-bookings` | Authenticated | List bookings — all for admins, own for residents |
| `POST` | `/api/societies/{id}/amenity-bookings/{id}/approve` | SUAdmin | Approve a pending booking (optional adminNotes) |
| `POST` | `/api/societies/{id}/amenity-bookings/{id}/reject` | SUAdmin | Reject a pending booking (optional adminNotes) |
| `POST` | `/api/societies/{id}/amenity-bookings/{id}/cancel` | Owner or SUAdmin | Cancel a booking (remarks required when admin cancels another resident's booking) |
| ~~`PUT`~~ | ~~`/api/societies/{id}/amenities/{id}`~~ | — | ⚠️ Not exposed — update amenity missing |

---

## Acceptance Criteria
- Residents cannot double-book overlapping slots for the same amenity.
- Admin can control amenity rules, capacity, and operating hours.
- Resident receives a notification on booking creation, approval, rejection, and admin cancellation.
- Only the booking resident or an admin can cancel a booking; an admin cancelling another resident's booking must provide remarks that are visible to that resident.
- Booking times are interpreted as society wall-clock time against the amenity's operating hours.

---

## Future / Planned

> 🔜 **Update Amenity endpoint** — `PUT /societies/{id}/amenities/{id}` to update capacity, operating hours, rules, and booking duration.

> 🔜 **Reschedule booking** — `PATCH /societies/{id}/amenity-bookings/{id}` to change a booking's slot without cancel + re-book; notify affected parties.

> 🔜 **Date-range availability calendar** — extend the availability endpoint to accept a `fromDate` and `toDate` range for weekly/monthly calendar rendering.

> 🔜 **Amenity usage reports** — admin endpoint for utilisation rate, most-booked slots, and peak times.
