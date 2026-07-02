# User and Access Management

## Overview
This module defines the role hierarchy, user lifecycle management, apartment assignment, self-registration flows, and access control policies for OurHome. It covers how users are created by admins, how residents self-register via invite links, and how apartment ownership and tenancy changes are tracked.

---

## Role Hierarchy

| Category | Role | Description |
|----------|------|-------------|
| **HQ** (Head Quarters) | `HQAdmin` | Platform admin — creates societies, manages platform-level settings |
| **HQ** | `HQUser` | Platform viewer — read-only access to society list and platform data |
| **SU** (Society Users) | `SUAdmin` | Housing Officer — manages all aspects of their society (residents, fees, complaints, visitors) |
| **SU** | `SUUser` | Regular resident within a society — can view notices, pay fees, raise complaints, manage visitors for their apartment |
| **SU** | `SUSecurity` | Security staff — manages visitor access at the gate, can view the resident directory |

---

## Resident Types (for SUUser)

| Resident Type | Description |
|---------------|-------------|
| `Owner` | Apartment owner; can add family members and approve tenant requests |
| `Tenant` | Active tenant; can add co-occupants |
| `FamilyMember` | Added by the owner; lives in the apartment |
| `CoOccupant` | Added by the tenant; lives in the apartment |

---

## User Creation by Admin

- `SUAdmin` can create `SUUser` and `SUSecurity` users directly.
- Required fields: full name, email, phone, role, resident type, apartment (for residents).
- On creation, the user receives an OTP via SMS/email to verify their account before first login.
- `SUAdmin` can update user name and phone.
- `SUAdmin` can activate or deactivate a user account (`POST /societies/{id}/users/{id}/activate` / `deactivate`).
- Each user has a profile section where they can update their own name, phone, and change their password.

---

## Self-Registration via Invite Link

1. `SUAdmin` generates a **society-specific encrypted invite link** via the admin panel.
2. A new user navigates to the link and completes a registration form (name, email, phone, password + confirm password).
   - After registration, the user is directed to the **login page** — not to a password reset page.
   - Confirm Password is required during self-registration.
3. After logging in, the user sees all apartments in the society and selects the one they belong to, specifying their resident type.
4. `SUAdmin` reviews and **approves or denies** the apartment join request.
5. On approval, the resident is linked to the apartment and can fully access the platform.

### Resident-to-Resident Invite
- `SUUser` (owner) can generate a **secure invite link** for another person and send it via email/SMS.
- The invited person self-registers using the link, which pre-fills the apartment association.
- `SUAdmin` must approve or deny this join request too.

---

## Apartment Membership

- A user can belong to **multiple apartments** within the same society (e.g., owns two flats).
- A user can exist across **multiple societies** — they choose which society to log into at login.
- All notifications and push alerts are sent to all owners/tenants linked to an apartment.
- `SUAdmin` can remove a resident from an apartment via `RemoveResidentApartment`.
- Admin-assigned apartment links go through the `AssignUserApartment` command.

---

## Change of Hands (Apartment Transfer)

### Ownership Transfer
- The current owner or `SUAdmin` can transfer ownership to a new person.
- The previous owner is unlinked from the apartment; any family members linked to the owner are also removed.
- History of all past owners and their tenure dates is maintained.

### Tenancy Transfer
- The current tenant or `SUAdmin` can transfer tenancy to a new person.
- The previous tenant and their co-occupants are unlinked.
- Tenancy history (past tenants with from/to dates) is maintained.

### Household Members
- **Owner** can add family members (`ResidentType = FamilyMember`) to their apartment.
- **Tenant** can add co-occupants (`ResidentType = CoOccupant`) to their apartment.

---

## Access Control Rules

- After self-registration, users **cannot** add an apartment to their name until the admin approves — no self-linking before approval.
- `SUUser` **cannot** see admin actions in the Apartments section.
- `SUUser` viewing the Residents page sees **only other residents' names** — phone numbers and email addresses are **masked/hidden**.
  - ⚠️ **Gap:** Phone and email masking for `SUUser` is a documented requirement but **not yet implemented** in `GetUsersBySocietyQuery`. `UserResponse` returns full contact details to all callers.
- `SUSecurity` can view the resident directory (names and apartment) but has limited access to financial and administrative features.
- `HQAdmin` and `HQUser` do not have access to individual society-level features (notices, complaints, maintenance, visitors).

---

## Password Management

- `ChangePasswordCommand` — residents and admins can change their own password.
- Password reset: `POST /auth/password-reset/request` (sends OTP) → `POST /auth/password-reset/confirm` (verifies OTP and sets new password).
- `SUAdmin` can reset another user's password via the user management panel.

---

## Multi-Society Behaviour

- A single email address can be registered across multiple societies with different roles.
- At login, if the user belongs to multiple societies, they must select which society to log into.
- If a user has only one society, the selection step is skipped automatically.
- If a user has only one apartment and one role within a society, those selections are skipped.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/users` | SUAdmin | Create user |
| `GET` | `/api/societies/{id}/users` | SUAdmin, SUSecurity | List users |
| `GET` | `/api/societies/{id}/users/{id}` | Authenticated | Get user profile |
| `PUT` | `/api/societies/{id}/users/{id}` | SUAdmin, Self | Update name and phone |
| `POST` | `/api/societies/{id}/users/{id}/deactivate` | SUAdmin | Deactivate user |
| `POST` | `/api/societies/{id}/users/{id}/activate` | SUAdmin | Activate user |
| `POST` | `/api/societies/{id}/users/{id}/assign-role` | SUAdmin | Change user role |
| `POST` | `/api/societies/{id}/users/{id}/change-password` | Self | Change own password |
| `POST` | `/api/societies/{id}/users/invite-link` | SUAdmin, SUUser | Generate invite link |
| `POST` | `/api/societies/{id}/auth/register` | Public | Self-register via invite link |
| `POST` | `/api/societies/{id}/users/{id}/request-apartment-join` | SUUser | Request apartment association |
| `POST` | `/api/societies/{id}/users/{id}/approve-apartment-join` | SUAdmin | Approve apartment join |
| `POST` | `/api/societies/{id}/users/{id}/deny-apartment-join` | SUAdmin | Deny apartment join |
| `POST` | `/api/societies/{id}/apartments/{id}/transfer-ownership` | SUAdmin, Owner | Transfer apartment ownership |
| `POST` | `/api/societies/{id}/apartments/{id}/transfer-tenancy` | SUAdmin, Tenant | Transfer apartment tenancy |
| `POST` | `/api/societies/{id}/apartments/{id}/add-household-member` | Owner, Tenant | Add family member or co-occupant |
| `DELETE` | `/api/societies/{id}/users/{id}/apartments/{apartmentId}` | SUAdmin | Remove resident from apartment |
| `GET` | `/api/societies/{id}/apartments/{id}/resident-history` | SUAdmin | Ownership and tenancy history |

---

## Acceptance Criteria
- Self-registered users land on the login page (not password reset) after completing registration.
- Confirm Password is required on the registration form.
- Apartment join requests require admin approval before the resident gains access.
- `SUUser` cannot see admin apartment actions (assign owner, set status, etc.).
- Phone and email of other residents are masked when viewed by `SUUser`.
- Multiple society memberships are handled at login — user selects society before proceeding.
- All notifications (approval, rejection, updates) are delivered to all linked owners and tenants of an apartment.

---

## Future / Planned

> 🔜 **Phone and email masking** — enforce contact detail masking in `GetUsersBySocietyQuery` when the caller's role is `SUUser`; return `null` or masked strings for other residents' phone and email.

> 🔜 **Bulk resident CSV import** — `POST /societies/{id}/users/import-csv` for batch-creating resident accounts (similar to the existing apartment CSV import); currently only apartments support bulk import.

> 🔜 **Notification to admin on new join request** — send a push notification to `SUAdmin` when a resident submits an apartment join request awaiting approval.

> 🔜 **Onboarding reminders** — a scheduled job that sends a reminder to users who have registered but not yet been linked to an apartment after N days.
