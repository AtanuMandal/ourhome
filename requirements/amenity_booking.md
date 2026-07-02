# Amenity Booking

## Overview
The amenity booking module allows residents to book society amenities (clubhouse, gym, swimming pool, community hall, etc.) for specific time slots. Admins configure amenity details and approve or reject booking requests. The system enforces slot overlap prevention and configurable operating hours.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create/update amenities, approve/reject bookings, view all bookings |
| `SUUser` | Browse amenities, book slots, view own bookings |
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
- The system enforces **slot overlap prevention** — two bookings for the same amenity cannot overlap.
- Booking is created with status `Pending`.
- A push notification is sent to the booking resident confirming the pending booking.
- ⚠️ **Gap:** **Cancel and reschedule booking** — no `DELETE` or `PATCH` endpoint exists for cancelling or modifying a booking. This is a documented requirement.

### 4. Admin Approval / Rejection
- `SUAdmin` can approve or reject pending booking requests.
- ⚠️ **Gap:** **No HTTP endpoint is exposed** for admin approval or rejection of bookings. `ApproveRejectBookingRequest` DTO exists in `ApplicationDtos.cs` but there is no corresponding Azure Function. Bookings remain in `Pending` status indefinitely.

### 5. Availability Calendar
- `GET /api/societies/{id}/amenities/{id}/availability?date=` returns available slots for a specific date.
- ⚠️ **Gap:** Only single-date slot lookup is available. A **week or month calendar view** (date range availability) is not supported.

### 6. Notifications
- Booking creation sends a push notification to the booking resident with the booking summary.
- ⚠️ **Gap:** No notification is sent when an admin **approves or rejects** a booking (no approval flow exposed yet).
- ⚠️ **Gap:** No cancellation notification is sent.

### 7. Admin Usage Reports
- ⚠️ **Gap:** No reporting endpoint for amenity utilisation, peak booking times, or most-booked amenities.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/amenities` | SUAdmin | Create amenity |
| `GET` | `/api/societies/{id}/amenities` | Authenticated | List amenities |
| `GET` | `/api/societies/{id}/amenities/{id}/availability` | Authenticated | Available slots for a date |
| `POST` | `/api/societies/{id}/amenity-bookings` | SUUser | Book an amenity |
| ~~`PUT`~~ | ~~`/api/societies/{id}/amenities/{id}`~~ | — | ⚠️ Not exposed — update amenity missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/amenity-bookings/{id}/approve`~~ | — | ⚠️ Not exposed — approval missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/amenity-bookings/{id}/reject`~~ | — | ⚠️ Not exposed — rejection missing |
| ~~`DELETE`~~ | ~~`/api/societies/{id}/amenity-bookings/{id}`~~ | — | ⚠️ Not exposed — cancel booking missing |

---

## Acceptance Criteria
- Residents cannot double-book overlapping slots for the same amenity.
- Admin can control amenity rules, capacity, and operating hours.
- Resident receives a notification on booking creation.
- Only the booking resident or an admin can cancel a booking.

---

## Future / Planned

> 🔜 **Update Amenity endpoint** — `PUT /societies/{id}/amenities/{id}` to update capacity, operating hours, rules, and booking duration.

> 🔜 **Admin approve/reject booking** — `POST /societies/{id}/amenity-bookings/{id}/approve` and `/reject` endpoints; send push notification to the resident on decision.

> 🔜 **Cancel / reschedule booking** — `DELETE /societies/{id}/amenity-bookings/{id}` (cancel) and `PATCH /societies/{id}/amenity-bookings/{id}` (reschedule); notify affected parties.

> 🔜 **Date-range availability calendar** — extend the availability endpoint to accept a `fromDate` and `toDate` range for weekly/monthly calendar rendering.

> 🔜 **Amenity usage reports** — admin endpoint for utilisation rate, most-booked slots, and peak times.
