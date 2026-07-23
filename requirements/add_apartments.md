# Adding Apartments to a Society

## Overview
`SUAdmin` can add individual apartments or bulk-import them from a CSV file. Each apartment stores physical attributes (area, rooms, parking), its occupancy status, and links to its residents (owner, tenant, family members). Apartment identity is unique within a society by the combination of apartment number + block name + floor number.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create, update, delete apartments; import via CSV; change status; download the apartment directory report (all apartments — owner/tenant/other occupants, area, parking + car numbers, maintenance pending) |
| `SUUser` | View their linked apartment details via "My Apartment"; set the car number for each of their apartment's parking slots |
| `SUSecurity` | View apartment and resident directory |

---

## Apartment Fields

| Field | Required | Notes |
|-------|----------|-------|
| Apartment Number | Yes | e.g., "101", "A-204" |
| Block / Building Name | Yes | e.g., "A", "Tower 1" |
| Floor Number | Yes | Integer |
| Number of Rooms | Yes | Bedrooms count |
| Parking Slots | No | Slot identifiers allocated to the apartment (e.g., "P1", "P2") — see "Parking Car Numbers" below for the per-slot car number a resident can set |
| Carpet Area (sq ft) | No | Used for per-sq-ft maintenance fee calculation |
| Built-Up Area (sq ft) | No | Used for per-sq-ft maintenance fee calculation |
| Super Built-Up Area (sq ft) | No | Used for per-sq-ft maintenance fee calculation |
| Initial Owner/Resident Details | No | Name, email, phone of first resident (optional at creation) |

**Uniqueness rule:** The combination of `ApartmentNumber + BlockName + FloorNumber` must be unique within a society. Duplicate submissions are rejected with a validation error.

---

## Individual Apartment Management

### Create Apartment
- `POST /api/societies/{id}/apartments`
- If an initial resident is provided, a user account is created and the apartment is linked.

### Update Apartment
- `PUT /api/societies/{id}/apartments/{id}` — update area, room count, parking slots, block name.

### Delete Apartment
- `DELETE /api/societies/{id}/apartments/{id}` — only possible if the apartment has no active residents.

### List Apartments
- `GET /api/societies/{id}/apartments` — paginated list of apartments with their current status and linked owner/tenant names.
- Results are ordered by **floor number descending, then apartment number ascending** — enforced authoritatively by the query handler; web and mobile both redundantly re-apply the same ordering client-side after any local search/filtering.
- ⚠️ **Gap:** No `block`, `floor`, or `status` filter query parameters are accepted at the HTTP function layer. `ListApartments` returns all apartments without server-side filtering by these attributes. Filtering is done client-side on the frontend.

### Get Single Apartment
- `GET /api/societies/{id}/apartments/{id}` — returns full apartment details including all linked residents.

---

## Apartment Status

- `PUT /api/societies/{id}/apartments/{id}/status` — change apartment occupancy status.
- Allowed statuses:
  - `Vacant` — no current residents
  - `Occupied` — has one or more active residents
  - `UnderMaintenance` — temporarily unavailable (e.g., renovation)

---

## Bulk CSV Import

- `POST /api/societies/{id}/apartments/import-csv` — upload a CSV file to bulk-create apartments.
- CSV must include headers: `ApartmentNumber`, `BlockName`, `FloorNumber`, `NumberOfRooms`, `ParkingSlots`, `CarpetArea`, `BuiltUpArea`, `SuperBuiltUpArea`.
- Rows that fail validation (e.g., duplicate apartment) are reported in the import response; valid rows are created.

---

## Parking Car Numbers

- A resident of the apartment (owner, tenant, family member, or co-occupant) — or a society admin — can set the car number for each of the apartment's parking slots from **My Apartment** (web and mobile).
- If the apartment has multiple parking slots, one text box is shown per slot, labeled with the slot id (e.g., "Car no. — Slot P1"), so each slot's car can be recorded independently.
- Leaving a slot's box blank clears that slot's car number; there's no requirement to fill every slot.
- Editing an apartment's parking slots (`PUT /api/societies/{id}/apartments/{id}`) automatically drops the car number for any slot that was removed, so a stale entry never points at a slot that no longer exists.
- `PUT /api/societies/{id}/apartments/{id}/parking` — the resident/admin-facing endpoint. Unlike the general apartment update endpoint, this only ever touches car numbers — it never resizes the slot list itself.

---

## Apartment Directory Report

- `SUAdmin` can download a single CSV covering every apartment in the society, with one row per apartment: apartment/block/floor, carpet/built-up/super built-up area, owner name/email/phone, tenant name/email/phone (when the apartment has a tenant), other occupants, each parking slot with its car number, and the maintenance amount pending as of today (sum of non-cancelled charges minus paid charges).
- `GET /api/societies/{id}/apartments/directory-report` — streams the CSV directly (same pattern as the visitor log export); the endpoint is `SUAdmin`/`HQAdmin`-only.
- Web: a "Download Report" button on the apartment list downloads the file directly. Mobile: a "Download Apartment Report" link writes the CSV to the device and hands it to the OS share sheet, mirroring the visitor log export.

---

## Resident History

- `GET /api/societies/{id}/apartments/{id}/resident-history` — returns the complete ownership and tenancy history for the apartment.
- Each history entry includes: resident name, resident type (Owner/Tenant), from date, to date.
- History is maintained through all ownership and tenancy transfers (see `UserAndAccess.md`).

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/apartments` | SUAdmin | Create apartment |
| `GET` | `/api/societies/{id}/apartments` | Authenticated | List apartments |
| `GET` | `/api/societies/{id}/apartments/{id}` | Authenticated | Get apartment details |
| `PUT` | `/api/societies/{id}/apartments/{id}` | SUAdmin | Update apartment details |
| `DELETE` | `/api/societies/{id}/apartments/{id}` | SUAdmin | Delete apartment |
| `PUT` | `/api/societies/{id}/apartments/{id}/status` | SUAdmin | Change occupancy status |
| `POST` | `/api/societies/{id}/apartments/import-csv` | SUAdmin | Bulk import from CSV |
| `GET` | `/api/societies/{id}/apartments/{id}/resident-history` | SUAdmin | Ownership and tenancy history |
| `PUT` | `/api/societies/{id}/apartments/{id}/parking` | Resident of the apartment, or SUAdmin | Set the car number for each parking slot |
| `GET` | `/api/societies/{id}/apartments/directory-report` | SUAdmin, HQAdmin | Download the all-apartments CSV (owner/tenant/other occupants, area, parking + car numbers, maintenance pending) |

---

## Acceptance Criteria
- Apartment number + block + floor is unique per society; duplicates are rejected.
- CSV import processes each row independently — partial success is allowed.
- Status changes are immediate and reflected in the apartment list.
- Apartment cannot be deleted while it has active residents.
- Resident history is never deleted — only superseded by new entries.
- Apartment list is sorted by floor descending, then apartment number ascending, on backend, web, and mobile.
- A resident of the apartment (or SUAdmin) can set a car number for each of the apartment's parking slots; slots with no car number are simply omitted, not rejected.
- Only a resident of the specific apartment (or SUAdmin/HQAdmin) may set its parking car numbers — an unrelated resident is forbidden.
- The apartment directory report includes every apartment in the society in one CSV, restricted to SUAdmin/HQAdmin.

---

## Future / Planned

> 🔜 **Server-side apartment list filters** — add `block`, `floor`, and `status` query parameters to `GET /societies/{id}/apartments` so large societies can filter apartments server-side instead of loading all and filtering on the client.
