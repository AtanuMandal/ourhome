# Local Service Providers

## Overview
The local service providers module creates an in-society marketplace connecting residents with pre-approved local vendors (plumbers, electricians, cab services, grocery stores, etc.). Residents browse providers, submit service requests with preferred time slots, and rate completed services. `SUAdmin` approves provider registrations and monitors requests.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Approve/reject provider registrations; monitor all requests |
| `SUUser` | Browse providers; submit service requests; rate after completion |
| Service Providers | Register; view service requests; accept or decline requests |

---

## Features

### 1. Service Provider Registration
- External service providers self-register with:
  - **Name**, **Contact** (phone, email)
  - **Service Types** — list of services offered (e.g., plumbing, electrical)
  - **Description** — overview of the business
  - **Pricing information** — ⚠️ **Gap:** No pricing field on `RegisterServiceProviderCommand`; requirement states providers specify pricing.
- After registration, the provider is in `Pending` state until an admin approves.

### 2. Admin Approval of Providers
- `SUAdmin` can approve or reject pending provider registrations.
- `ApproveServiceProviderCommand` and `RejectServiceProviderCommand` exist in the application layer.
- ⚠️ **Gap:** **No HTTP endpoints are exposed** for admin approval or rejection. `ServiceProviderFunctions.cs` has no corresponding Azure Functions for these commands. Providers remain `Pending` indefinitely.

### 3. Resident Features — Browse Providers
- `GET /api/societies/{id}/service-providers` — list all approved providers for the society.
- ⚠️ **Gap:** No `GET /service-providers/{id}` endpoint to view a single provider's details, reviews, and rating.

### 4. Resident Features — Service Requests
- Residents can submit a service request with:
  - **Service Type**
  - **Description** of the issue or work needed
  - **Preferred Date/Time** — desired slot for the service
  - **Provider** — optionally target a specific provider
- `POST /api/societies/{id}/service-requests` — creates the request.
- `GET /api/societies/{id}/service-requests` — lists service requests.
- ⚠️ **Gap:** No `GET /service-requests/{id}` to view a single request's status.

### 5. Provider Accept / Decline
- ⚠️ **Gap:** Providers cannot accept or decline service requests via the API. No command or endpoint exists for this workflow. Once a request is submitted, there is no provider-side action.

### 6. Ratings and Reviews
- After a service is completed, residents can submit:
  - **Rating** (numeric, e.g., 1–5 stars)
  - **Review Comment**
- `AddReviewRequest` DTO and `ServiceProviderRequestDto.Rating/ReviewComment` fields exist in the data model.
- ⚠️ **Gap:** **No HTTP endpoint** for submitting a review. The data model supports it but the API layer does not expose it.

### 7. Notifications
- ⚠️ **Gap:** No push or email notification is sent to a provider when a new service request is posted.
- ⚠️ **Gap:** No notification is sent to the resident when a provider accepts or declines their request.

### 8. Admin Monitoring and Reports
- ⚠️ **Gap:** No admin reporting endpoint for service request volume, provider response rates, or average resolution times.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/service-providers` | Public / Provider | Register as service provider |
| `GET` | `/api/societies/{id}/service-providers` | Authenticated | List approved providers |
| `POST` | `/api/societies/{id}/service-requests` | SUUser | Submit service request |
| `GET` | `/api/societies/{id}/service-requests` | Authenticated | List service requests |
| ~~`GET`~~ | ~~`/api/service-providers/{id}`~~ | — | ⚠️ Not implemented — single provider view missing |
| ~~`GET`~~ | ~~`/api/service-requests/{id}`~~ | — | ⚠️ Not implemented — single request view missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/service-providers/{id}/approve`~~ | — | ⚠️ Not exposed — admin approval missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/service-providers/{id}/reject`~~ | — | ⚠️ Not exposed — admin rejection missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/service-requests/{id}/accept`~~ | — | ⚠️ Not implemented — provider accept missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/service-requests/{id}/decline`~~ | — | ⚠️ Not implemented — provider decline missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/service-requests/{id}/review`~~ | — | ⚠️ Not implemented — rating/review missing |

---

## Acceptance Criteria
- Providers must be admin-approved before becoming visible to residents.
- Residents see only approved providers.
- Service request captures preferred date/time.
- Providers are notified of new requests.
- Residents are notified when a provider accepts.
- Rating can only be submitted after service completion.

---

## Future / Planned

> 🔜 **Admin approve/reject provider endpoints** — `POST /societies/{id}/service-providers/{id}/approve` and `/reject`; expose the existing application layer commands.

> 🔜 **Provider accept/decline** — `POST /service-requests/{id}/accept` and `/decline` for providers to respond to requests; notify the resident on response.

> 🔜 **Provider and request detail views** — `GET /service-providers/{id}` and `GET /service-requests/{id}`.

> 🔜 **Ratings and reviews endpoint** — `POST /societies/{id}/service-requests/{id}/review` with `{ rating, comment }`; update provider's aggregate rating.

> 🔜 **Provider pricing field** — add pricing information to the provider registration model.

> 🔜 **Notifications** — notify provider on new request; notify resident on provider response (accept/decline).

> 🔜 **Admin reports** — request volume by service type, response rate, average completion time.
