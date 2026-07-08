# Polls & AGM E-Voting

## Overview
This module lets `SUAdmin` raise a question to the community and collect structured resident input — from a quick one-tap poll ("should we repaint the gate this month?") to a formal e-voting resolution tied to an Annual General Meeting (AGM). It gives societies a digital paper trail for decisions that today are settled by a show of hands, a WhatsApp thread, or a physical ballot at the AGM.

> 🆕 **New module.** Nothing described below exists in the codebase yet — no `Poll` entity, no voting endpoints, no UI. This document is the specification to build against, written in the same shape as the platform's other feature requirements.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUAdmin` | Create/close polls, configure voting rules and eligibility, view live tally and final results, publish results |
| `SUUser` | View open and past polls, cast a vote while a poll is open, view results (subject to the poll's visibility setting) |
| `SUSecurity` | View published results only — no voting rights |
| `HQAdmin` / `HQUser` | No access to society-level polls |

---

## Features

### 1. Poll Creation
- `SUAdmin` can create a poll with:
  - **Title** and **Description** — the question or resolution being put to residents
  - **Poll Type** — `SingleChoice` or `MultipleChoice`
  - **Options** — 2 or more selectable answers
  - **Voting Window** — `opensAt` / `closesAt`
  - **Target Audience** - `FullSocity`(all socity apartments) or `PerBlock`(only the specific block residents ) or `MultipleBlock`(one or multiple block residents as target)
  - **Eligibility Unit** — `PerApartment` (one vote per apartment, cast by the owner) or `PerResident` (one vote per registered user)
  - **Anonymity** — `Anonymous` (choice not linked to identity in results) or `Identified` (who-voted-for-what is retained for audit)
  - **Linked Notice** — optional reference to a Notice Board announcement (e.g. the AGM notice), so the poll can be surfaced from that notice
  - **Quorum Threshold** — optional minimum participation percentage required for the result to count as valid (relevant for AGM resolutions)

### 2. Voting
- An eligible resident/apartment can cast exactly one vote per poll while it is open.
- The system rejects a second vote from the same eligible unit (`ALREADY_VOTED`).
- A resident may change their vote before the poll closes if the poll is configured to allow it (`AllowVoteChange`); the earlier vote is overwritten, not duplicated.
- Attempting to vote outside the `opensAt`/`closesAt` window is rejected.

### 3. Live Tally & Results
- While a poll is open, `SUAdmin` can view a running tally (vote counts per option, participation so far vs. eligible count).
- Once a poll closes, results are locked and visible to residents according to the poll's visibility setting (`immediately`, `afterClose`, or `adminOnly` until manually published).
- If a quorum threshold was set and not met, the result is marked `NoQuorum` rather than `Passed`/`Failed`.

### 4. AGM Support
- A poll can be flagged as an **AGM Resolution**, which enables the quorum threshold and identified-voting audit trail expected for formal society decisions.
- Multiple resolutions can be grouped under a single AGM session so residents see them as one voting ballot rather than separate unrelated polls.

### 5. Notifications
- Residents are notified by push when a new poll opens, with a reminder ahead of `closesAt` for anyone who has not yet voted.
- Residents (and admins) are notified when results are published.

### 6. Audit Trail
- Every vote is timestamped and recorded against the eligible unit (apartment or resident) that cast it, regardless of the poll's anonymity setting.
- For `Anonymous` polls, the identity-to-choice link is retained internally for dispute resolution but is not exposed via any resident-facing API or UI — only the aggregate tally is.

---

## API Endpoints (Planned)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/polls` | SUAdmin | Create a poll |
| `GET` | `/api/societies/{id}/polls` | Authenticated | List open/past polls |
| `GET` | `/api/societies/{id}/polls/{id}` | Authenticated | Poll detail, including live/final tally per visibility rules |
| `POST` | `/api/societies/{id}/polls/{id}/vote` | SUUser | Cast or change a vote |
| `POST` | `/api/societies/{id}/polls/{id}/close` | SUAdmin | Close voting early and lock results |
| `POST` | `/api/societies/{id}/polls/{id}/publish-results` | SUAdmin | Publish results to residents (for `adminOnly` visibility polls) |

---

## Acceptance Criteria
- An eligible apartment/resident cannot vote more than once on the same poll.
- Votes cast outside the voting window are rejected.
- Quorum, if configured, is evaluated correctly against the eligible count at close time.
- Anonymous poll results never expose which resident chose which option through any API response.
- Residents receive a notification when a poll opens and when results are published.
- Follow the UI standard of the existing application

---

## Future / Planned
> 🔜 **Comments/objections on AGM resolutions** — allow a resident to attach a short note to their vote for the record, visible only to `SUAdmin`.

> 🔜 **PDF minutes export** — generate a downloadable summary of an AGM session's resolutions and results for official society records.
