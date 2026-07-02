# Society Onboarding

## Overview
`HQAdmin` onboards new societies into the platform. Onboarding creates the society record, provisions a first `SUAdmin` account, and sets the foundation for apartments, residents, maintenance fees, and amenities to be configured by the society admin.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `HQAdmin` | Create societies; view and update all society records |
| `HQUser` | View society list and details (read-only) |
| `SUAdmin` | Update their own society's settings after onboarding |

---

## Society Creation

`HQAdmin` creates a society with:

| Field | Required | Notes |
|-------|----------|-------|
| Society Name | Yes | Display name |
| Address | Yes | Street, city, state, pin code |
| Contact Email | Yes | Primary admin contact |
| Contact Phone | Yes | Primary admin contact |
| Total Blocks / Buildings | Yes | Number of blocks in the society |
| Total Apartments | Yes | Estimated total apartment count |
| Initial Admin — Full Name | Yes | First `SUAdmin` account name |
| Initial Admin — Email | Yes | First `SUAdmin` login email |
| Initial Admin — Phone | Yes | OTP delivery for first login |

- The society and first `SUAdmin` account are created simultaneously in a single request.
- The first admin receives an OTP via SMS/email to verify their account before first login.

---

## Society Settings (Updatable by SUAdmin)

After onboarding, `SUAdmin` can update:

- **Maintenance Overdue Threshold Days** — number of days after a charge's due date before it is flagged as overdue (1–90 days). Controls red highlighting and overdue notifications.
- **Society Committees** — named committees (e.g., "Maintenance Committee", "Sports Committee") with member assignments for display purposes.
- **Society User Role Titles** — custom role titles for society members (e.g., "Treasurer", "Secretary", "Chairman").

---

## Society Lifecycle

- Societies are **immediately active** upon creation — there is no draft or pending status.
- ⚠️ **Gap:** No **draft → verify → publish** lifecycle is implemented. The requirement describes a "verify and publish" step but the current system activates the society at creation.
- `GET /api/societies` — `HQAdmin`/`HQUser` can list all societies with name, contact, apartment count.
- `GET /api/societies/{id}` — full society details.
- `PUT /api/societies/{id}` — update settings (overdue threshold, committees, role titles).

---

## Post-Onboarding Configuration Steps

After the society is created, `SUAdmin` performs the following in order:

1. **Add apartments** — see `add_apartments.md` for individual and bulk CSV import.
2. **Configure maintenance fee schedule** — see `add_maintanence.md`.
3. **Add amenities** — configure bookable amenities (clubhouse, gym, etc.) via the amenity module.
4. **Configure security access** — register `SUSecurity` staff users.
5. **Invite residents** — generate invite links or directly create `SUUser` accounts.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies` | HQAdmin | Create new society + first admin |
| `GET` | `/api/societies` | HQAdmin, HQUser | List all societies |
| `GET` | `/api/societies/{id}` | HQAdmin, HQUser, SUAdmin | Get society details |
| `PUT` | `/api/societies/{id}` | SUAdmin, HQAdmin | Update society settings |

---

## Acceptance Criteria
- Society creation and first admin account are atomic — both are created or neither is.
- The first admin receives an OTP immediately on creation.
- `SUAdmin` can update overdue threshold, committees, and role titles.
- `HQUser` has read-only access to the society list and details.

---

## Future / Planned

> 🔜 **Society draft/publish lifecycle** — add an `IsPublished` flag and a `POST /societies/{id}/publish` endpoint so `HQAdmin` can review all configuration before making the society live to residents.

> 🔜 **Guided onboarding wizard** — a single API call (or sequential wizard) that accepts maintenance fee structure, amenity list, and security staff details at society creation time, instead of requiring separate calls for each.

> 🔜 **Multiple initial admin accounts** — allow specifying more than one admin at creation time; currently only one initial admin can be set.
