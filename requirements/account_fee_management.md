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
- **Society Committees** — named committees (e.g., "Managing Committee", "Sports Committee"). Each member is picked from a dropdown of existing registered users (not free-text email) plus a free-text role title (e.g., "President", "Secretary", "Treasurer"). A user can hold at most one committee role society-wide — assigning an already-assigned user is rejected (`USER_ALREADY_ON_COMMITTEE`). See `new requirements/society-structure` for the full behaviour, including the resident-facing read-only "Contact Us" page that displays this committee list and the society's contact info to every role.
- **Society User Role Titles** — custom role titles for society members (e.g., "Treasurer", "Secretary", "Chairman") — set as part of the committee member's role title above.
- **Branding — Sidenav/Drawer Logo and Main-Content Background Image** — `SUAdmin` (or `HQAdmin`, managing any society) can upload two independent images for their society:
  - **Logo** — shown at the top of the sidenav (web) / drawer (mobile), replacing the default "OurHome" wordmark/logo asset.
  - **Background image** — rendered behind the **main content area** — the right-hand side page/screen area where routed pages render (web: `mat-sidenav-content`; mobile: behind the drawer navigator's screens) — not the sidenav/drawer navigation panel itself. Rendered at **70% opacity** so page content stays fully legible on top of it. The opacity is applied to a dedicated background layer, never to the container itself — foreground content is never faded.
  - Each image is uploaded independently via its own endpoint (below) and immediately replaces whichever one was previously set. A separate **remove** action (below) explicitly clears the image and reverts to the default branding without requiring a replacement upload.
  - **Default behavior:** if a society has never uploaded a logo/background image, `logoUrl`/`sidenavBackgroundUrl` on the society response are `null`, and every client (web, mobile) falls back to its own built-in default branding — the static logo asset and no background layer at all.
  - Both images are stored in publicly-readable blob containers (`society-logos`, `society-backgrounds`) — like visitor images and profile pictures, they render via plain `<img>`/CSS `background-image` (web) and native `Image` views (mobile), neither of which can attach a JWT header the way an authenticated API request would.

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
| `GET` | `/api/societies/{id}` | HQAdmin, HQUser, SUAdmin | Get society details (includes `logoUrl`/`sidenavBackgroundUrl`, both nullable) |
| `PUT` | `/api/societies/{id}` | SUAdmin, HQAdmin | Update society settings |
| `POST` | `/api/societies/{id}/logo` | SUAdmin, HQAdmin | Upload the sidenav/drawer logo (multipart, field `file`) — replaces any previously uploaded logo |
| `POST` | `/api/societies/{id}/background-image` | SUAdmin, HQAdmin | Upload the main-content-area background image (multipart, field `file`, rendered client-side at 70% opacity) — replaces any previous one |
| `DELETE` | `/api/societies/{id}/logo` | SUAdmin, HQAdmin | Remove the uploaded logo and revert to the default wordmark/logo asset (`logoUrl` becomes `null`) |
| `DELETE` | `/api/societies/{id}/background-image` | SUAdmin, HQAdmin | Remove the uploaded background image and revert to no background layer (`sidenavBackgroundUrl` becomes `null`) |

---

## Acceptance Criteria
- Society creation and first admin account are atomic — both are created or neither is.
- The first admin receives an OTP immediately on creation.
- `SUAdmin` can update overdue threshold, committees, and role titles.
- `HQUser` has read-only access to the society list and details.
- `SUAdmin`/`HQAdmin` can upload a sidenav/drawer logo and a separate sidenav/drawer background image; each upload replaces whatever was previously set for that image.
- `SUAdmin`/`HQAdmin` can also remove an uploaded logo or background image independently, reverting that field to `null` (default branding) without needing to upload a replacement.
- A society with no uploaded logo/background image returns `null` for both fields, and every client (web, mobile) renders its own default branding — never a broken image.
- The background image renders behind the main content area (not the sidenav/drawer) at 70% opacity on both web and mobile, applied only to a dedicated background layer — page content remains fully opaque.

---

## Future / Planned

> 🔜 **Society draft/publish lifecycle** — add an `IsPublished` flag and a `POST /societies/{id}/publish` endpoint so `HQAdmin` can review all configuration before making the society live to residents.

> 🔜 **Guided onboarding wizard** — a single API call (or sequential wizard) that accepts maintenance fee structure, amenity list, and security staff details at society creation time, instead of requiring separate calls for each.

> 🔜 **Multiple initial admin accounts** — allow specifying more than one admin at creation time; currently only one initial admin can be set.
