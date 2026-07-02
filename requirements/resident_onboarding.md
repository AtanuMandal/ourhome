# Resident Onboarding

## Overview
This document details the resident lifecycle — how residents are added to the system, how they verify their identity, how household composition changes (ownership/tenancy transfer, adding family members), and what notifications support the onboarding journey.

> **Note:** This document is a companion to `onboarding.md` (which covers the full flow) and `UserAndAccess.md` (which covers roles, access rules, and invite mechanics). Cross-reference those documents for context.

---

## Resident Types

| Type | Who Creates | Notes |
|------|-------------|-------|
| `Owner` | SUAdmin or via invite link | Primary flat owner; can add family members |
| `Tenant` | SUAdmin or via invite link + approval | Active tenant; can add co-occupants |
| `FamilyMember` | Owner (via invite) | Added by owner; no admin approval needed once owner confirms |
| `CoOccupant` | Tenant (via invite) | Added by tenant; no admin approval for the add itself |

---

## Adding New Residents

### Admin-Created Residents
- `SUAdmin` creates a resident with: full name, email, phone, role, resident type, apartment.
- Apartment is linked immediately — no approval step for admin-created accounts.
- An OTP is sent to the resident's phone for account activation.

### Self-Registered Residents (Invite Link)
1. `SUAdmin` generates an invite link scoped to the society.
2. Resident registers: name, email, phone, password, **confirm password** (required).
3. After registration the resident is taken to the **login page** (not password reset).
4. Resident logs in, browses the apartment list, and selects their apartment with their resident type.
5. `SUAdmin` approves or denies the apartment join request.
6. On approval, the resident gains full access to apartment-specific features.

### Resident-to-Resident Invite
- An existing `SUUser` (owner) can generate an invite link for another resident (e.g., new tenant).
- `SUAdmin` must still approve the join request.

---

## Household Composition Changes

### Ownership Transfer
- Transfers the apartment owner to a new person.
- Old owner and all family members linked to that owner are **unlinked** from the apartment.
- Ownership history entry is created: previous owner, from date, to date.
- New owner is created (or linked if existing user).
- `POST /api/societies/{id}/apartments/{id}/transfer-ownership`

### Tenancy Transfer
- Transfers the apartment tenant to a new person.
- Old tenant and all co-occupants are **unlinked**.
- Tenancy history entry is created: previous tenant, from date, to date.
- `POST /api/societies/{id}/apartments/{id}/transfer-tenancy`

### Add Family Member (Owner)
- `Owner` can add a `FamilyMember` via an invite link.
- Family member is linked to the owner's apartment automatically.
- `POST /api/societies/{id}/apartments/{id}/add-household-member` with `residentType = FamilyMember`

### Add Co-Occupant (Tenant)
- `Tenant` can add a `CoOccupant` via an invite link.
- `POST /api/societies/{id}/apartments/{id}/add-household-member` with `residentType = CoOccupant`

### Remove Resident from Apartment
- `SUAdmin` can unlink a resident from an apartment.
- If the resident has no remaining apartment links, their account remains active but apartment-less.
- `DELETE /api/societies/{id}/users/{id}/apartments/{apartmentId}`

---

## Resident History Tracking
- All ownership changes are stored with from/to timestamps.
- All tenancy changes are stored with from/to timestamps.
- History is never deleted — it is a permanent audit trail.
- `GET /api/societies/{id}/apartments/{id}/resident-history` returns the full history.

---

## Verification Process
- OTP via SMS is sent automatically when a resident account is created (admin-created or self-registered).
- The user must verify via `POST /api/societies/{id}/users/{id}/verify-otp` before full access is granted.
- Apartment join requests from self-registered users are separately approved by `SUAdmin`.

---

## Notifications

| Trigger | Recipient | Channel | Status |
|---------|-----------|---------|--------|
| Account created (OTP) | New resident | SMS | ✅ Implemented |
| Apartment join request submitted | SUAdmin | — | ⚠️ Not implemented |
| Apartment join approved | Resident | Push | ⚠️ Not confirmed |
| Apartment join denied | Resident | Push | ⚠️ Not confirmed |
| Resident moved out (transfer) | Old resident | — | ⚠️ Not implemented |
| Onboarding reminder | Incomplete registrant | SMS/Push | ⚠️ Not implemented |

---

## Bulk Resident Import
- ⚠️ **Gap:** No `POST /societies/{id}/users/import-csv` endpoint exists. Resident bulk creation from a spreadsheet is not implemented. Each resident must be added individually or via invite links.

---

## Acceptance Criteria
- Confirm Password field is required on self-registration.
- After self-registration, user lands on login page (not password reset).
- Admin-created residents are linked to their apartment immediately.
- Self-registered residents must receive admin approval before apartment access.
- Ownership and tenancy history is never deleted.
- All owners and tenants of an apartment receive all notifications for that apartment.

---

## Future / Planned

> 🔜 **Bulk resident CSV import** — batch creation of `SUUser` accounts from a spreadsheet with apartment pre-assignment.

> 🔜 **Admin notification on join request** — push notification to `SUAdmin` when a pending apartment join request is submitted.

> 🔜 **Approval/denial notification to resident** — confirm that domain event handlers fire push notifications to residents when their join request is approved or denied.

> 🔜 **Onboarding completion reminder** — scheduled SMS or push to residents who have not completed apartment association after 3 days.
