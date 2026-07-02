# Adding Apartments to a Society

## Overview
`SUAdmin` can add individual apartments or bulk-import them from a CSV file. Each apartment stores physical attributes (area, rooms, parking), its occupancy status, and links to its residents (owner, tenant, family members). Apartment identity is unique within a society by the combination of apartment number + block name + floor number.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create, update, delete apartments; import via CSV; change status |
| `SUUser` | View their linked apartment details via "My Apartment" |
| `SUSecurity` | View apartment and resident directory |

---

## Apartment Fields

| Field | Required | Notes |
|-------|----------|-------|
| Apartment Number | Yes | e.g., "101", "A-204" |
| Block / Building Name | Yes | e.g., "A", "Tower 1" |
| Floor Number | Yes | Integer |
| Number of Rooms | Yes | Bedrooms count |
| Parking Slots | No | Number of allocated parking spaces |
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

---

## Acceptance Criteria
- Apartment number + block + floor is unique per society; duplicates are rejected.
- CSV import processes each row independently — partial success is allowed.
- Status changes are immediate and reflected in the apartment list.
- Apartment cannot be deleted while it has active residents.
- Resident history is never deleted — only superseded by new entries.

---

## Future / Planned

> 🔜 **Server-side apartment list filters** — add `block`, `floor`, and `status` query parameters to `GET /societies/{id}/apartments` so large societies can filter apartments server-side instead of loading all and filtering on the client.
