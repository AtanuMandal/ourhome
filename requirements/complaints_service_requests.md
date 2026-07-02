# Complaints and Service Requests

## Overview
The complaints module allows residents to raise complaints about issues within the society and service requests for repairs or assistance. `SUAdmin` manages the lifecycle of each complaint — assigning, progressing, resolving, and closing — while residents can track status and submit post-resolution feedback.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | View all complaints, assign, update status, resolve, close, reject |
| `SUUser` | Raise complaints, view their own complaints, submit feedback after resolution |
| `SUSecurity` | View complaints (read-only) |

---

## Features

### 1. Raise a Complaint
- Any authenticated resident (`SUUser`) can submit a complaint with:
  - **Title** (required)
  - **Description** (required)
  - **Category** — one of: `Maintenance`, `Security`, `Noise`, `Cleanliness`, `Infrastructure`, `General`
  - **Priority** — `Low`, `Medium`, `High`
  - **Attachment URLs** — photos or documents uploaded separately via file upload
- Complaint is created with status `Open`.
- The resident can view all their own complaints and their current status.

### 2. Complaint Status Lifecycle

```
Open → InProgress → Resolved → Closed
     ↘              ↗
       Rejected
```

- `Open` — newly submitted, awaiting admin attention.
- `InProgress` — admin has acknowledged and is working on it; an assignee can be set.
- `Resolved` — admin has resolved the complaint; resident can provide feedback.
- `Closed` — admin closes after resolution confirmation.
- `Rejected` — admin rejects with a reason.

### 3. Assignment and Status Management
- `SUAdmin` can assign a complaint to a responsible person (name or user ID).
- Status transitions: `Open → InProgress`, `InProgress → Resolved`, `Resolved → Closed`, any → `Rejected`.
- Each status change stores the reason and timestamp.

### 4. Complaint Listing and Filters
- `SUAdmin` can list all society complaints with filters: status, category.
- `SUUser` sees only their own complaints.
- ⚠️ **Gap:** No `apartmentId` filter in the list endpoint; `GetComplaintsByApartmentQuery` exists in the application layer but is not exposed via the HTTP function.

### 5. Notifications
- ⚠️ **Gap:** Status change notifications (push/email to the resident) are handled via domain events; confirm the event handler correctly fires `SendPushNotificationAsync` on each complaint status update. This is a critical UX requirement: residents must be notified when their complaint moves to `InProgress`, `Resolved`, or `Rejected`.

### 6. Feedback and Ratings
- After a complaint reaches `Resolved` status, the resident can submit:
  - **Rating** — numeric score (e.g., 1–5 stars)
  - **Comment** — free-text feedback on the resolution quality
- `AddComplaintFeedbackCommand` is implemented in the application layer.
- ⚠️ **Gap:** **No HTTP endpoint is exposed** for feedback submission. `ComplaintFunctions.cs` has no route for `AddComplaintFeedbackCommand`. Residents currently cannot submit feedback via the API.

### 7. Resolution Time Tracking
- Timestamps are stored for `CreatedAt` and each status change.
- ⚠️ **Gap:** No dedicated `ResolvedAt` field or resolution-duration calculation; resolution time must be derived by diffing timestamps manually. No admin report endpoint for average resolution times.

### 8. Service Requests
- Service requests follow the same complaint flow with a `ServiceRequest` category or via the Local Service Providers module (see `local_service_providers.md`).
- Residents can specify a **preferred date/time** for service when raising a request.
- ⚠️ **Gap:** The complaints model has no `PreferredDateTime` field; preferred time slots are only partially available in the separate service provider module.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/complaints` | SUUser | Raise complaint |
| `GET` | `/api/societies/{id}/complaints` | Authenticated | List complaints (filtered by role) |
| `GET` | `/api/societies/{id}/complaints/{id}` | Authenticated | Get complaint detail |
| `POST` | `/api/societies/{id}/complaints/{id}/resolve` | SUAdmin | Update complaint status |
| ~~`POST`~~ | ~~`/api/societies/{id}/complaints/{id}/feedback`~~ | — | ⚠️ Not exposed — feedback endpoint missing |

---

## Acceptance Criteria
- Residents can raise complaints with category and priority.
- Admins can assign and progress complaints through the status lifecycle.
- Residents see only their own complaints; admins see all.
- Status change triggers a notification to the resident.
- Feedback can be submitted only after the complaint is resolved.

---

## Future / Planned

> 🔜 **Feedback endpoint** — `POST /societies/{id}/complaints/{id}/feedback` with `{ rating, comment }` to expose `AddComplaintFeedbackCommand` via HTTP.

> 🔜 **Apartment filter** — `?apartmentId=` query parameter on the complaints list endpoint, exposing the existing `GetComplaintsByApartmentQuery`.

> 🔜 **Status change notifications** — verify and complete push + email notification delivery when complaint status changes (via the domain event / outbox pattern).

> 🔜 **Resolution time reports** — admin endpoint returning average resolution time, open count by category, and complaint volume trends.

> 🔜 **Preferred time slots on service requests** — add `PreferredDateTime` field to the complaint/request model for maintenance and repair service requests.
