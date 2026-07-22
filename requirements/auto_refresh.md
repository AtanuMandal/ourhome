# Auto-Refresh (Delta Sync) Requirements

## Overview

Several screens already auto-refresh on a timer today — e.g. `visitor-list.component.ts`
polls every 10s via `interval(10_000)`, and mobile's `useVisitors.ts` / `useMaintenance.ts`
set `refetchInterval: 10_000`. Every one of these ticks currently re-runs the **full**
paginated/filtered query and re-fetches the **entire** visible list, even though in the
overwhelming majority of ticks nothing (or one or two rows) actually changed.

This plan replaces "full re-fetch on a timer" with **delta sync**: each auto-refresh tick
asks the backend for only the records **created or updated in the last 10 minutes**, and the
client **merges** that small delta into the dataset it already has, instead of replacing the
whole dataset. The polling cadence (10–30s, screen-dependent) does not change — what shrinks
is the size of every response.

This applies uniformly **backend + web + mobile**, across every list screen in the app, not
just the two that already poll today.

---

## Goals

1. **Minimize auto-refresh traffic volume.** Every auto-refresh request/response carries only
   recently-changed records, never the full list.
2. **One consistent pattern app-wide.** A single backend contract addition and a single
   client-side merge utility, reused by every screen instead of one-off polling logic per
   feature (which is how `visitor-list` and `useVisitors`/`useMaintenance` currently do it,
   each slightly differently).
3. **No stale gaps.** As long as a screen keeps polling at its normal cadence, no
   create/update is ever missed, even across occasional dropped ticks (background app,
   flaky network), provided the gap stays under 10 minutes.
4. **No security regression.** Delta responses are subject to the exact same tenancy scoping
   and role-based field masking as full responses — there is no "lighter" unauthenticated or
   less-filtered path.

## Non-Goals

- **No push/real-time transport.** This is still polling (HTTP GET on a timer), not
  WebSockets/SignalR/SSE. That remains a separate, larger initiative if ever pursued.
- **No offline sync / conflict resolution.** Clients are read-only consumers here; there is no
  local edit queue to reconcile. `UpdatedAt`-based last-write-wins is sufficient.
- **No change to polling cadence — hard constraint.** This plan changes *what is fetched and
  how it's applied to the dataset*, never *how often*. Every existing auto-refresh interval
  keeps its exact current value:

  | Screen | Current interval | This plan |
  |---|---|---|
  | Web `visitor-list.component.ts` | `interval(10_000)` — 10s | stays 10s |
  | Mobile `useVisitors.ts` | `refetchInterval: 10_000` — 10s | stays 10s |
  | Mobile `useMaintenance.ts` | `refetchInterval: 10_000` — 10s | stays 10s |
  | Mobile `SosTriggerCard.tsx` / `useSos.ts` | `POLL_INTERVAL_MS` = 10s, gated off once the alert leaves active status | unchanged — this polls a single alert record, not a list, and is not a delta-sync candidate |

  If a screen that does not currently auto-refresh adopts auto-refresh later, choosing its
  interval is a product/UX decision made at that time — this document does not set or imply a
  value for it, and implementers must not use this rollout as an opportunity to retune any
  *existing* interval up or down.
- **Dashboard aggregate endpoints are out of scope** (see §"Excluded: aggregates").

---

## Design Decision: fixed trailing 10-minute window, not "since last poll"

The delta query always asks for `UpdatedAt >= now - 10 minutes` — **not** "since my last
successful poll." This is a deliberate simplification:

- **Self-healing.** If a client misses ticks (app backgrounded, tab throttled, network blip),
  the very next tick still catches everything from the last 10 minutes with no state to
  reconcile. There is no "last successful sync timestamp" to persist, drift, or get wrong
  across app restarts.
- **No clock-skew bookkeeping.** The client never has to trust its own clock relative to the
  server's for a moving "since" cursor — it just asks for a fixed, server-defined window.

**Correctness invariant this relies on:** the poll interval must stay well under 10 minutes.
Every screen's existing/planned auto-refresh interval (10–30s) already satisfies this with
enormous margin, so any single change is picked up by many consecutive deltas before it could
ever "age out" of the window unseen. This invariant must hold for any future screen that
adopts auto-refresh — it is not safe to raise a poll interval to 10 minutes and rely solely on
delta sync to catch everything.

**Consequence:** delta sync only replaces refresh-while-open. Two cases still require a full
fetch, not a delta:

| Trigger | Behavior |
|---|---|
| Initial screen load | Full paginated/filtered fetch (unchanged today) |
| Filter/search/sort change, page navigation | Full paginated/filtered fetch (unchanged today) |
| Periodic auto-refresh tick while screen stays open/foregrounded | **Delta fetch + merge** |
| Screen re-focused / app foregrounded after being away **> 10 minutes** | Full fetch (delta would have a gap) |
| Screen re-focused / app foregrounded after being away **≤ 10 minutes** | Delta fetch is safe, but a full fetch is also acceptable if simpler to implement per screen |

---

## Backend Contract

### New optional query parameter: `updatedSince`

Every list/query endpoint that a screen auto-refreshes gains an optional `updatedSince`
(ISO-8601 UTC timestamp) parameter, e.g.:

```
GET /societies/{societyId}/visitors?updatedSince=2026-07-22T09:15:00Z
GET /societies/{societyId}/notices?updatedSince=2026-07-22T09:15:00Z
GET /societies/{societyId}/maintenance/charges?updatedSince=2026-07-22T09:15:00Z
```

Behavior:

- **`updatedSince` absent** → today's behavior, unchanged: normal paginated, filtered fetch.
- **`updatedSince` present** → the handler filters to `UpdatedAt >= updatedSince` (this alone
  covers both *created* and *updated* records, since `BaseEntity` sets `UpdatedAt = CreatedAt`
  at creation — see `backend/src/ApartmentManagement.Domain/Entities/BaseEntity.cs`). The
  response reuses the **same Response DTO shape** as the full list, so the client merge logic
  never has to special-case a "delta" shape.
- **Server-side clamp, not client-trusted.** Regardless of what timestamp the client sends,
  the handler clamps it to `max(requestedSince, UtcNow.AddMinutes(-10))`. A client cannot
  request a wider window than 10 minutes — this is what actually enforces "last 10 minutes
  only," not client-side discipline alone.
- **Same scoping, same masking, same authorization.** The delta query path applies identical
  `SocietyId`/`ApartmentId` partition scoping and identical role-based field masking (e.g.
  contact masking — see `requirements/UserAndAccess.md`) as the non-delta path. It must be
  implemented as a filter added to the existing query handler, not a separate lighter-weight
  handler, to avoid the two paths drifting apart.
- **Unpaginated (or capped) response.** A 10-minute window is expected to contain a handful of
  rows even on busy lists, so the delta response is not expected to need paging. Implementers
  should still cap it (e.g. same `pageSize` ceiling as the full endpoint) as a defensive limit,
  not as a UX pagination flow.

### Repository-level filtering

Current list handlers generally call a `GetAllAsync(societyId)` repository method that pulls
the **entire partition** from Cosmos DB and filters/paginates in memory (see e.g.
`GetVisitorsBySocietyQueryHandler` in
`backend/src/ApartmentManagement.Application/Features/Visitor/VisitorModule.cs`). For the
delta path specifically, push the `UpdatedAt >= @since` filter into the Cosmos SQL query
itself (`ExecuteQueryAsync` in `CosmosDbRepository.cs` already supports parameterized
`QueryDefinition`s) rather than fetching the full partition and filtering in memory. This
keeps the backend's own Cosmos RU cost proportional to the delta, not the full dataset —
complementary to, but distinct from, the client-facing traffic goal.

### Modules in scope

Any module backing a list screen that adopts auto-refresh needs this parameter added to its
query handler(s). Initial rollout targets the screens that already poll or are planned to:

- Visitors (`VisitorModule.cs`) — already polls today
- Maintenance charges (`MaintenanceQueries.cs`) — already polls today
- Notices, Complaints/Service Requests, Polls, AGM Sessions, SOS Alerts, Staff/Attendance,
  Residents, Vendor Payments, HQ Societies/Users — added as each screen adopts auto-refresh

### Excluded: aggregate/summary endpoints

Dashboard-style endpoints that return **computed aggregates** (counts, sums, "upcoming
charges" rollups — see `useDashboard`/`DashboardScreen`) are not "a list of records with an
id and an UpdatedAt" and can't be merged by id. They are **out of scope** for delta sync; if
they need auto-refresh, they keep doing a full (already lightweight) re-fetch.

---

## Client Contract: merge, don't replace

### Shared merge semantics (web + mobile, implemented once per stack)

A single utility function, used by every auto-refreshing list, replaces each screen's
one-off polling logic:

```
mergeById<T extends { id: string }>(
  existing: T[],
  delta: T[],
  stillVisible?: (item: T) => boolean,
): T[]
```

- Records in `delta` are **upserted** into `existing` by `id` (update in place if the id is
  already present, insert if new).
- If the screen has an active client-side filter (e.g. "Pending only"), pass `stillVisible` —
  after merge, any record that no longer satisfies it is **removed from the displayed list**
  (its data isn't discarded from the response, just not shown), because the backend still
  returns it in the delta (its `UpdatedAt` changed, e.g. a visitor's status flipped from
  `Pending` to `CheckedIn`), even though it no longer matches the current view.
- Sort order is re-applied after merge (same comparator the initial fetch used), not assumed
  to already be correct.

### Hard deletes (explicit gap)

`UpdatedAt >= since` only ever returns *existing* records — it cannot represent "this record
was hard-deleted." Today's domain model overwhelmingly uses soft state changes (e.g.
`IsActive`, status enums) rather than hard deletes, which this pattern already handles
correctly (a deactivated record still has a bumped `UpdatedAt` and is merged in, then dropped
by `stillVisible` if the view filters out inactive records). Any endpoint that *does* support a
true hard delete is **not safe to delta-sync as-is**: either avoid hard-deleting entities on
screens that use auto-refresh, or extend the delta response with an explicit tombstone list
(`deletedIds: string[]`) before enabling auto-refresh for that screen. This must be checked
per module during rollout, not assumed.

### Web (Angular)

- Keep `interval(10_000)` exactly as-is (see `visitor-list.component.ts`) — only what the
  timer callback *does* changes: instead of re-running the full filtered/paginated fetch, it
  calls the service method with `updatedSince` set to `10 minutes ago (UTC)`, then merges the
  result into the existing signal-held array via `mergeById`. The `10_000` literal itself is
  not touched.
- On navigation to the screen (or filter/search change), keep doing the existing full fetch —
  unchanged.

### Mobile (React Native / TanStack Query)

- Keep each screen's `refetchInterval: 10_000` value exactly as-is — only what happens on that
  interval changes: instead of TanStack Query's normal refetch-and-replace, it calls the delta
  endpoint and merges the result into the query cache via
  `queryClient.setQueryData(key, (old) => mergeById(old, delta, stillVisible))`. The `10_000`
  literal itself is not touched.
- `useInfiniteList.ts`'s existing `refetchInterval` option (used by `useVisitors.ts`,
  `useMaintenance.ts`) is the natural place to swap in delta-fetch-and-merge behavior without
  changing each screen's call site or its interval value.

---

## Testing Requirements

- **Backend:** unit tests per adopted module verifying (a) `updatedSince` filters correctly
  against `UpdatedAt`, (b) a client-supplied `updatedSince` older than 10 minutes is clamped
  server-side and does not return older records, (c) role-based masking/scoping on the delta
  path produces identical output to the non-delta path for the same underlying data.
- **Web/mobile:** unit tests for the shared `mergeById` utility — upsert of new records, update
  of existing records by id, removal via `stillVisible`, and stable sort order after merge.
- Do not change existing full-fetch test coverage; delta sync is additive.

---

## Rollout Phases

1. **Phase 0 — shared merge utility.** Implement `mergeById` once for web (`shared/utils` or
   equivalent) and once for mobile (`src/shared/utils`), with unit tests. No screen wiring yet.
2. **Phase 1 — backend `updatedSince` support**, starting with Visitors and Maintenance (the
   two modules that already poll and stand to gain the most immediately), then extending to
   other modules as their screens adopt auto-refresh.
3. **Phase 2 — web adoption.** Start with `visitor-list.component.ts` (already polling; swap
   its full re-fetch for delta+merge with no behavior change visible to the user) and
   `maintenance-*` screens, then roll out to additional screens as each backend module lands.
4. **Phase 3 — mobile adoption.** Same order: `useVisitors.ts`, `useMaintenance.ts` first via
   `useInfiniteList.ts`'s `refetchInterval` hook point, then additional screens.
5. **Phase 4 — cleanup.** Once a screen's delta path is verified, remove its old full-refetch-
   on-timer code path entirely (no dual-path left behind).

Each phase must pass the standard three-stack verification (backend `dotnet test`, Angular
`ng test`, mobile `jest` + `tsc --noEmit`) before moving to the next.
