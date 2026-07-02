# Gamification

## Overview
The gamification module drives community engagement through inter-apartment competitions, point rewards, and leaderboards. Residents earn points for participation and winning competitions; points can be redeemed for benefits such as maintenance fee discounts or premium amenity access.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create and manage competitions; award points to users; view leaderboards and reports |
| `SUUser` | Browse and join competitions; view own points and leaderboard |

---

## Features

### 1. Competitions and Challenges
- `SUAdmin` can create a competition with:
  - **Title** and **Description**
  - **Start Date** and **End Date**
  - **Prize** description (free text)
  - **Max Participants** — cap on number of registrants
- Residents can register for a competition via `POST /societies/{id}/competitions/{id}/join`.
- The system enforces the `MaxParticipants` limit — registration is rejected when the cap is reached.
- ⚠️ **Gap:** **No `GET /societies/{id}/competitions` endpoint** — residents cannot browse available/upcoming competitions. No listing endpoint exists.
- ⚠️ **Gap:** **No score update endpoint** — `UpdateScoreRequest` DTO exists in `ApplicationDtos.cs` but no HTTP function exposes it. Competition scores cannot be updated after registration via the API.

### 2. Leaderboard
- `GET /api/societies/{id}/competitions/{id}/leaderboard` — returns ranked participants with scores.
- Leaderboard is sorted by score descending.

### 3. Points and Rewards System
- `GET /api/societies/{id}/users/{id}/points` — returns a user's total points and transaction history.
- `POST /api/societies/{id}/users/{id}/points` — admin awards points with a reason.
- ⚠️ **Gap:** **Point redemption** is not implemented. The requirement states points can be redeemed for benefits (maintenance fee discounts, premium amenity access). No `RedeemPoints` command or endpoint exists.

### 4. Event Management
- ⚠️ **Gap:** The requirement distinguishes "competitions/challenges" from "events" (e.g., cultural evenings, society AGMs, sports days). There is **no `Event` entity or endpoint**; competitions serve as the only vehicle. A separate event management capability (with RSVP, registration, event announcements) is not implemented.

### 5. Community Engagement
- ⚠️ **Gap:** No mechanism to publish or broadcast competition results to all residents.
- ⚠️ **Gap:** No social sharing or community feed for competition updates.

### 6. Notifications
- ⚠️ **Gap:** No notifications are sent for upcoming competitions, registration confirmations, or competition results. `GamificationFunctions.cs` has no notification calls.

### 7. Admin Reports
- ⚠️ **Gap:** No admin reporting endpoint for participation rates, most active apartments, or community engagement metrics.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/competitions` | SUAdmin | Create competition |
| `POST` | `/api/societies/{id}/competitions/{id}/join` | SUUser | Register for competition |
| `GET` | `/api/societies/{id}/competitions/{id}/leaderboard` | Authenticated | Ranked leaderboard |
| `GET` | `/api/societies/{id}/users/{id}/points` | Authenticated | User points + history |
| `POST` | `/api/societies/{id}/users/{id}/points` | SUAdmin | Award points |
| ~~`GET`~~ | ~~`/api/societies/{id}/competitions`~~ | — | ⚠️ Not implemented — competition listing missing |
| ~~`PATCH`~~ | ~~`/api/societies/{id}/competitions/{id}/scores/{userId}`~~ | — | ⚠️ Not implemented — score update missing |
| ~~`POST`~~ | ~~`/api/societies/{id}/users/{id}/points/redeem`~~ | — | ⚠️ Not implemented — redemption missing |

---

## Acceptance Criteria
- Admins can create competitions with max participant limits.
- Max participant limit is enforced on join.
- Leaderboard is ranked and reflects awarded points.
- Admin can award points with a reason to any resident.

---

## Future / Planned

> 🔜 **List Competitions endpoint** — `GET /societies/{id}/competitions` with filters for upcoming, active, and past competitions.

> 🔜 **Score update endpoint** — `PATCH /societies/{id}/competitions/{id}/scores/{userId}` to record a participant's competition score.

> 🔜 **Point redemption** — `POST /societies/{id}/users/{id}/points/redeem` with a `benefit` type (e.g., maintenance discount, amenity credit); deduct points and record the redemption.

> 🔜 **Event management** — separate `Event` entity and endpoints (`POST`, `GET`, `RSVP`) for society events that are not competitions (e.g., AGM, cultural programs, sports days).

> 🔜 **Notifications** — notify all residents when a new competition is created; notify participants of results when a competition ends.

> 🔜 **Results broadcast** — `POST /societies/{id}/competitions/{id}/publish-results` to send results push notification to all registered participants.

> 🔜 **Admin engagement reports** — participation rate per apartment, total points awarded, leaderboard trends.
