# SOS Emergency Alerts

## Overview
This module gives a resident a single, unmistakable way to raise an emergency — a fire, a medical incident, a security threat, or anything else that cannot wait for a normal complaint ticket — and get it in front of the security desk and society admin immediately. Today the platform has no equivalent of a panic button; residents would have to call the gate directly, with no system record of what happened or how fast anyone responded.

> 🆕 **New module.** No `SosAlert` entity, endpoint, or UI exists in the codebase yet. This document specifies the requirement to build against.

---

## Roles and Access

| Role | Can Do |
|------|--------|
| `SUUser` | Trigger an SOS alert for their own apartment, view the status of their own alert, mark their own alert as a false alarm/stand-down |
| `SUSecurity` | Receive alerts in real time, acknowledge, respond, mark resolved |
| `SUAdmin` | Receive alerts, view all alerts and history, configure escalation rules, view response-time reporting |

---

## Features

### 1. SOS Trigger
- A prominent, one-tap SOS control is available to `SUUser` from the home screen of the app (mobile and web).
- On trigger, the resident selects a **Category** — `Fire`, `Medical`, `Security/Intrusion`, `Other` — with an optional free-text note.
- The alert automatically attaches the resident's apartment, name, and a server timestamp — the resident does not need to type their location.

### 2. Real-Time Alerting
- The moment an alert is triggered, a push notification (with distinct, high-priority styling/sound from a normal notification) is sent to every on-duty `SUSecurity` account and to `SUAdmin`.
- The notification includes the resident's name, apartment, category, and any note.

### 3. Acknowledgement & Response Workflow
- An alert moves through a lifecycle: `Triggered` → `Acknowledged` → `Resolved` (or `FalseAlarm`).
- The first responder to acknowledge is recorded (who, and when), so it's clear someone has taken ownership of the alert.
- Only `SUSecurity` or `SUAdmin` can move an alert to `Resolved`; the triggering resident can independently mark it `FalseAlarm` to stand responders down if it was raised in error.

### 4. Escalation
- If an alert is not acknowledged within a configurable window (default 2 minutes), it escalates — re-notifying all security staff and additionally notifying `SUAdmin` if they were not already alerted for that category.
- Escalation repeats at increasing intervals until acknowledged.

### 5. History & Reporting
- `SUAdmin` can view a full history of past SOS alerts: category, apartment, time to acknowledge, time to resolve, and outcome.
- Aggregate reporting shows response-time trends and the false-alarm rate, to help the society tune escalation timing and staff readiness.

### 6. Notifications to the Household
- Other residents linked to the same apartment (co-owner, family members) are notified when one of their household triggers an SOS, so they're aware even if they didn't trigger it themselves.

---

## API Endpoints (Planned)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/societies/{id}/sos-alerts` | SUUser | Trigger an SOS alert |
| `GET` | `/api/societies/{id}/sos-alerts` | SUAdmin, SUSecurity | List alerts (active + history) |
| `GET` | `/api/societies/{id}/sos-alerts/{id}` | Authenticated (own alert), SUAdmin, SUSecurity | Alert detail and status |
| `POST` | `/api/societies/{id}/sos-alerts/{id}/acknowledge` | SUSecurity, SUAdmin | Acknowledge an active alert |
| `POST` | `/api/societies/{id}/sos-alerts/{id}/resolve` | SUSecurity, SUAdmin | Mark an alert resolved |
| `POST` | `/api/societies/{id}/sos-alerts/{id}/false-alarm` | SUUser (own alert) | Stand down an alert raised in error |
| `GET` | `/api/societies/{id}/sos-alerts/report` | SUAdmin | Response-time and false-alarm reporting |

---

## Acceptance Criteria
- Triggering an SOS alert notifies all on-duty security and admin accounts within seconds, with correct apartment and category attached.
- An alert not acknowledged within the configured window escalates automatically.
- Status transitions (`Triggered` → `Acknowledged` → `Resolved`/`FalseAlarm`) are timestamped and attributable to a specific user.
- A resident can only trigger or stand down alerts for their own apartment.

---

## Future / Planned
> 🔜 **Direct call-out integration** — one-tap dial to the local emergency number alongside the in-app alert, for categories like `Fire` and `Medical`.

> 🔜 **Location pinpointing beyond apartment** — for societies with common areas or large campuses, capture device GPS in addition to the registered apartment.

> 🔜 **Silent/duress mode** — allow triggering an alert without an audible confirmation on the resident's own device, for situations where drawing attention would be dangerous.
