# Onboarding — Apartments and Residents

## Overview
After a society is created by `HQAdmin`, the `SUAdmin` completes the onboarding by adding apartments and residents. This document covers both the apartment onboarding flow and the resident onboarding flow. See `account_fee_management.md` for society creation and `UserAndAccess.md` for the full user management lifecycle.

---

## Part 1: Apartment Onboarding

### Add Individual Apartments
`SUAdmin` can add each apartment individually with:
- Apartment Number
- Block / Building Name
- Floor Number
- Number of Rooms
- Parking Slots (optional)
- Carpet Area, Built-Up Area, Super Built-Up Area (sq ft, optional — needed for per-sq-ft maintenance fee calculation)

See `add_apartments.md` for the complete field list, status management, and API details.

### Bulk CSV Import
- `SUAdmin` can upload a CSV file to bulk-import multiple apartments in a single operation.
- `POST /api/societies/{id}/apartments/import-csv`
- Valid rows are created; invalid rows (e.g., duplicate apartment number) are reported without aborting the whole import.

### Edit and Delete Apartments
- Update apartment details (area, room count, parking) at any time.
- Delete an apartment only when it has no active residents.

### Apartment Status
- Mark apartments as `Vacant`, `Occupied`, or `UnderMaintenance`.
- Status is maintained automatically after resident assignments and can also be set manually by `SUAdmin`.

---

## Part 2: Resident Onboarding

### Add New Residents (Admin-Created)
`SUAdmin` can directly create a resident account with:
- Full Name, Email, Phone
- Role: `SUUser` (resident) or `SUSecurity`
- Resident Type: `Owner`, `Tenant`, `FamilyMember`, `CoOccupant`
- Apartment (required for `SUUser`; links immediately without an approval step)

On creation, the user receives an OTP via SMS to activate their account.

### Self-Registration via Invite Link
1. `SUAdmin` generates a society-specific encrypted invite link.
2. New resident registers using the link (name, email, phone, password, confirm password).
3. After registration, the resident logs in and requests to join their apartment.
4. `SUAdmin` approves or denies the join request.

See `UserAndAccess.md` for the complete invite flow, resident-to-resident invites, and multi-society handling.

### Bulk Resident Import
- ⚠️ **Gap:** A **bulk resident CSV import** endpoint is not yet implemented. Only apartments support CSV bulk import. Residents must be added individually or via invite links.
- Planned: `POST /api/societies/{id}/users/import-csv` to batch-create `SUUser` accounts from a spreadsheet.

### Edit and Remove Residents
- `SUAdmin` can update a resident's name and phone.
- `SUAdmin` can deactivate or reactivate a resident account.
- `SUAdmin` can unlink a resident from an apartment (`RemoveResidentApartment`).

### Resident Roles and Permissions
- `Owner` — can add family members; receives all apartment notifications; can initiate apartment transfer.
- `Tenant` — can add co-occupants; receives all apartment notifications.
- `FamilyMember` — added by owner; receives apartment notifications.
- `CoOccupant` — added by tenant; receives apartment notifications.

### Verification Process
- OTP via SMS/email is required for account activation.
- Apartment join requests (self-registration flow) require `SUAdmin` approval.

### Notifications
- Resident receives an OTP SMS on account creation.
- ⚠️ **Gap:** No separate "welcome" or "you have been added" notification is sent beyond the OTP SMS.
- ⚠️ **Gap:** Admins are not push-notified when a new self-registered user submits an apartment join request; the admin must check the pending requests list manually.
- ⚠️ **Gap:** No automated reminder is sent to users who registered but have not yet completed apartment association after N days.

### Change of Hands
- **Ownership transfer** — previous owner and their family members are unlinked; full ownership history is maintained.
- **Tenancy transfer** — previous tenant and co-occupants are unlinked; full tenancy history is maintained.
- History is viewable via `GET /api/societies/{id}/apartments/{id}/resident-history`.

---

## Acceptance Criteria
- Apartments with duplicate number + block + floor are rejected with a validation error.
- CSV import processes valid rows even if some rows fail.
- Resident accounts created by admin are immediately linked to the apartment without an approval step.
- Self-registered residents must wait for admin approval before accessing apartment-specific features.
- Ownership and tenancy history is never deleted — it is maintained indefinitely.

---

## Future / Planned

> 🔜 **Bulk resident CSV import** — `POST /societies/{id}/users/import-csv` for batch-creating resident accounts.

> 🔜 **Admin notification on join request** — push notification to `SUAdmin` when a self-registered user requests apartment association.

> 🔜 **Onboarding reminder** — scheduled SMS/push reminder to residents who have registered but not yet completed apartment association after 3+ days.
