# Notice Board

## Overview
The notice board module allows `SUAdmin` to post notices and announcements visible to all residents of a society. It serves as the primary broadcast channel for maintenance alerts, event announcements, rule changes, and general communication. Residents receive push notifications when new notices are published and can track what they have and have not read.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create, update, archive, and delete notices; target specific apartments |
| `SUUser` | View notices, mark as read/unread |
| `SUSecurity` | View notices |
| `HQAdmin` / `HQUser` | No access to society-level notices |

---

## Features

### 1. Create and Post Notices
- `SUAdmin` can create a notice with the following fields:
  - **Title** (required)
  - **Content / Description** (required, rich text or plain text)
  - **Category** — one of: `General`, `Maintenance`, `Event`, `Security`, `Finance`, `Emergency`
  - **Publish At** — scheduled future publish time (optional; defaults to immediate)
  - **Expires At** — date/time after which the notice is no longer shown in the active list
  - **Target Apartments** — optional list of apartment IDs; if empty, the notice is society-wide
- A notice is immediately visible (or visible from `PublishAt`) to all residents of the targeted apartments (or all apartments if no targeting is set).
- ⚠️ **Gap:** No HTTP `PUT /notices/{id}` endpoint is exposed for updating an existing notice; the command handler exists in the application layer but has no corresponding Azure Function.
- ⚠️ **Gap:** No HTTP `DELETE /notices/{id}` endpoint is exposed for deleting a notice.

### 2. View Notices
- Residents can view the list of active (not expired, not archived) notices for their society.
- Each notice in the list includes: title, category, publish date, read/unread indicator.
- Individual notice view includes the full content and `IsReadByCurrentUser` flag.
- ⚠️ **Gap:** The list endpoint does not accept `category` or `fromDate`/`toDate` query parameters at the HTTP function layer; filtering by category or date is not currently possible via the API even though the query handler supports a category parameter.

### 3. Read / Unread Tracking
- Each resident's read state is tracked per notice (not just globally).
- `PATCH /societies/{id}/notices/{id}/read` — mark a notice as read or unread.
- The notice list shows an unread count / indicator per resident.
- Read state is stored per `userId + noticeId` in Cosmos DB.

### 4. Audience Targeting
- Notices can be targeted to specific apartments using the `targetApartmentIds` field.
- Society-wide notices (no target) are visible to all apartments.
- `IsReadByCurrentUser` respects the targeting — only residents of targeted apartments see those notices.

### 5. Notifications
- When a notice is published, a **push notification** is sent to all targeted residents (or all society residents for society-wide notices).
- Push notification includes notice title and a deep link to the notice detail.
- ⚠️ **Gap:** Notification delivery on notice creation is handled via domain events; confirm that the outbox/event handler correctly fires `SendPushNotificationAsync` on notice publish.

### 6. Archive Notices
- Notices with a past `ExpiresAt` date are automatically excluded from the active list.
- ⚠️ **Gap:** There is no background timer/function that explicitly sets `IsArchived = true` on expired notices; the active list filter excludes them implicitly. A dedicated "archived notices" endpoint does not exist.
- ⚠️ **Gap:** Residents cannot currently browse archived / expired notices.

### 7. Attachments
- ⚠️ **Gap:** The `CreateNoticeCommand` and `NoticeResponse` do not include an `AttachmentUrls` field. The requirement to attach files (e.g., PDFs, images) to notices is **not implemented**.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/notices` | SUAdmin | Create notice |
| `GET` | `/api/societies/{id}/notices` | Authenticated | List active notices |
| `GET` | `/api/societies/{id}/notices/{id}` | Authenticated | Get single notice |
| `PATCH` | `/api/societies/{id}/notices/{id}/read` | Authenticated | Mark read/unread |
| ~~`PUT`~~ | ~~`/api/societies/{id}/notices/{id}`~~ | — | ⚠️ Not exposed — update endpoint missing |
| ~~`DELETE`~~ | ~~`/api/societies/{id}/notices/{id}`~~ | — | ⚠️ Not exposed — delete endpoint missing |

---

## Acceptance Criteria
- Society-wide notices are visible to all residents; targeted notices only to the specified apartments.
- `IsReadByCurrentUser` is accurate per logged-in resident.
- Expired notices do not appear in the active list.
- Push notification is sent on notice publish.

---

## Future / Planned

> 🔜 **Update Notice endpoint** — `PUT /societies/{id}/notices/{id}` to edit title, content, category, expiry of an existing notice.

> 🔜 **Delete Notice endpoint** — `DELETE /societies/{id}/notices/{id}` to remove a notice and untrack all read states.

> 🔜 **Category and date filter** — pass `category`, `fromDate`, `toDate` query parameters through the list endpoint.

> 🔜 **Archived notices browsing** — a separate `GET /societies/{id}/notices/archived` endpoint for residents to browse past notices.

> 🔜 **Attachments** — support file URLs on notices (e.g., PDF circulars, images); requires an upload endpoint and `AttachmentUrls` field on the notice DTO.

> 🔜 **Auto-archive job** — a timer-triggered Azure Function that marks notices with past `ExpiresAt` as `IsArchived = true` daily.
