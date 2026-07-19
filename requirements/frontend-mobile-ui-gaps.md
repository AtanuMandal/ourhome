# Frontend (Web PWA) vs Mobile App — UI Functionality Gap Analysis

> **Update 2026-07-16 (second pass):** Sections 1 and 3.1 have been implemented on mobile.
> Closed: Society Settings, My Apartment, Rewards, Services, apartment administration
> (detail/form/status/delete/household/transfer/history), resident administration
> (create, activate/deactivate, join-request approve/deny, invite link), maintenance admin
> (approve proof / mark paid), vendor charge actions (mark paid / activate / inactivate / delete),
> amenity create form, real QR pass image + native share + email/SMS share, visitor date-range
> and resident-name filters, CSV export via share sheet, and 10-second silent auto-refresh.
> Still open (deliberately): gate QR **camera scanning** (`expo-barcode-scanner` is listed as
> Future/Planned in tech_requirements.md), the unauthenticated public pass page (browser link
> by design), apartment CSV bulk import, maintenance schedule CRUD/charge register/penalties,
> and the vendor directory/schedule management forms (web-only bulk-admin surfaces).

> **Update 2026-07-19 (third pass):** Gate QR **camera scanning is now implemented on mobile**
> (`VisitorScanScreen`, expo-camera `CameraView` barcode scan — scan → verify → auto check-in),
> closing the largest §3.1 gap. Also closed in this pass: resident-registered visitor passes are
> **pre-approved** on mobile (matching web), visitor **photo thumbnails** in the mobile list and
> **photo on the pass screen** (tap-to-zoom), the **public pass link** included in the mobile
> native share message, mobile **complaint creation** sends apartment/user (multi-apartment aware),
> **amenity booking** works on both platforms (wall-clock times) with an approve/reject/cancel
> flow incl. admin cancellation remarks, and clubbed maintenance proof review on mobile.
> Still open: public pass page (by design), apartment CSV import, maintenance schedule
> CRUD/charge register/penalties on mobile, vendor directory/schedule management forms.

**Date:** 2026-07-16
**Method:** Verified against source, not documentation — every feature folder, route (`app.routes.ts` vs `AppDrawer.tsx`/`AuthStack.tsx`), navigation menu (web sidenav/bottom-nav in `app.component.ts`/`bottom-nav.component.ts` vs `CustomDrawer.tsx`), and every interactive affordance (`(click)`/`(ngSubmit)` handlers on web, `onPress`/`onChange` handlers on mobile) was enumerated and compared per feature.

Legend: **[W]** = exists on Web only · **[M]** = exists on Mobile only · **[≈]** = present on both but differs in detail.

---

## 1. Features entirely missing from the Mobile app

These have no screen, hook, or navigation entry on mobile at all.

| # | Feature | What Web has (evidence) |
|---|---------|-------------------------|
| 1 | **Society settings** (`/society`) | SUAdmin edits society profile (name/address/contact), manages **society users** (add/remove), **committees** (add/remove committees & members), and society-level settings incl. `visitorOverstayThresholdHours` and `maxUsersPerApartment` (`society-detail.component.ts`). Mobile only has the **Committee** subset (`CommitteeScreen`) and a read-only **Contact Us** — no society profile/settings editing anywhere. |
| 2 | **My Apartment** (`/my-apartment`) | Residents view their apartment(s), **send direct invite links** to add household members (`sendInviteLink(apartmentId)`), and **submit apartment join requests** (`submitJoinRequest()`). No mobile equivalent (only the dashboard invitation *accept/deny* card exists on both). |
| 3 | **Rewards / Gamification** (`/rewards`) | Leaderboard page + points page (`gamification/leaderboard.component.ts`, `points.component.ts`). Absent on mobile. |
| 4 | **Services** (`/services`) | Service-provider directory (`provider-list`), provider create/edit form (`provider-form`), and service-request form (`request-form`). Absent on mobile. |
| 5 | **Apartment management** (beyond a list) | Web: apartment **detail** page (residents, status change *Available/UnderMaintenance*, **delete**), **create/edit form**, **CSV bulk import** (`uploadCsv`), **household-member management**, **resident history**, **transfer resident**. Mobile `ApartmentListScreen` is a read-only searchable list (label + resident count + status chip). |
| 6 | **Maintenance administration** | Web admin views: schedule create/edit/**delete**, charge register (generate charges), settlement details, **approve payment proof**, **mark paid**, year/month **admin grid**, **penalty creation** (`prefillPenalty`/`createPenalty`), proof preview dialog, plus a maintenance dashboard. Mobile `MaintenanceScreen` covers the **resident** flow only (view charges by status, select charges, upload proof image/document, submit). |
| 7 | **Vendor payments management** | Web: vendor directory CRUD with **picture/contract document uploads**, payment schedules + schedule windows, one-time charges, charge **activate/inactivate/delete**, payment popup with **receipt upload** and **mark paid** (`vendor-payments-admin`, `vendor-payments-grid`). Mobile `VendorPaymentListScreen` is a **read-only list** (vendor, amount, type, status, due date) — no actions at all. |
| 8 | **Amenity administration** | Web has `amenity-form.component.ts` (admin creates/edits amenities). Mobile has only list + booking. |
| 9 | **Resident/User administration** (beyond list+delete) | Web: **create/edit resident** (`resident-form`), **resident profile** page (add/remove apartment, resend OTP, activate/deactivate, save info), **approve/deny apartment-join requests** on the list, **send invite link** dialog. Mobile `ResidentListScreen` supports search + **delete** only. |
| 10 | **Public visitor pass page** (`/visitor-pass/:passCode`, no login) | Renders the real QR image + pass details for a shared link. Mobile has no unauthenticated pass view (arguably web-only by design since the link opens in a browser — but the app can't deep-link it either). |

## 2. Features entirely missing from the Web frontend

| # | Feature | What Mobile has (evidence) |
|---|---------|----------------------------|
| 1 | **Push notifications + actionable deep links** | `NotificationProvider` + `notificationRouter.ts`: notification **actions** approve/deny a visitor directly from the notification, and taps deep-link to Visitor/Maintenance/Notice/Complaint detail. Web has no web-push; it relies on the visitor list's 10-second polling. |
| 2 | **Biometric re-login** | `auth/biometric.ts` + `AuthProvider` (fingerprint/face unlock). No web equivalent. |
| 3 | **Login-method preference persistence** | Mobile stores whether the user last used phone-OTP or email login (`loginPreference.ts`) and reopens that method. Web login has the same two methods + switch links but does not persist the choice. |

## 3. Per-feature detail differences (both have the feature, behavior differs)

### 3.1 Visitors [≈] — largest detail gap
Parity: register (with photo, pre-approval, company/purpose autocomplete), default landing view (single `default-view` call), search + status filter, approve/deny (host-only approve), check-out, overstay red flag, pass-verify-doubles-as-check-in, visitor photo zoom.

Web-only details:
- ~~**QR camera scan at the gate**~~ — ✅ closed 2026-07-19: mobile now has `VisitorScanScreen` (expo-camera barcode scan) reachable from the gate row; scanning verifies the pass and checks the visitor in as one step. Manual pass-code entry remains as fallback.
- **CSV export** of the visitor log (`exportCsv`).
- **Filters:** resident-name filter, from/to **date range**, and a **record-count selector** (10/25/50/100, persisted in localStorage). Mobile has search + status only, recent count fixed at 10.
- **Post-registration pass actions:** web shows the real **QR image**, **Copy pass link**, and a **Share via email/SMS dialog** (`copyPassLink`, `submitShare`). Mobile navigates to `VisitorPassScreen` which renders a **placeholder “QR” box** (`qrPlaceholder` style, first 8 chars of the id) — not a scannable code — and has **no share/copy** affordance.
- 10-second silent **auto-refresh** with per-row ease-in highlight. Mobile refreshes via pull-to-refresh / query invalidation only.

Mobile-only details: approve/deny **from a push notification**; deep link into visitor detail.

### 3.2 Dashboard [≈]
Parity: greeting, role-based quick actions, SOS trigger card (residents), apartment-invitation accept/deny card, admin “Financial Outlook (7d)” inflow/outflow cards.
- **[W]** “Recent Complaints” and “Latest Notices” **lists** with links to detail.
- **[M]** “Today's Summary” **counter tiles** (Visitors Today / Unread Notices / Pending Complaints). Web shows lists instead of counters; mobile shows counters instead of lists.

### 3.3 Financial reports [≈]
- **[W]** Four tabs: dashboard, **cash flow** (parameterized form), **apartment ledger**, society ledger; **Excel and PDF export** for both ledgers (exceljs); separate **personal statement** route (`/financial-report/my-statement`) and society-summary route.
- **[M]** Two tabs only: society **Summary** and society **Ledger** (admin). No cash-flow report, **no personal/apartment statement** (drawer item is even labeled “My Statement” for residents but the screen shows society summary gated by tenant check), no exports.

### 3.4 Navigation / menus [≈]
- Web SUUser sidenav: My Apartment, Apartments, Residents, Society Finances, Rewards, Services — none of these exist in the mobile SUUser drawer.
- Reverse: mobile SUUser drawer exposes a read-only **SOS Alerts** entry; the web SUUser sidenav has **no SOS Alerts link** (route is reachable but undiscoverable).
- Web SUAdmin sidenav has Rewards, Services, **Society** (full settings); mobile SUAdmin drawer has only the Committee subset.
- Security and HQ menus match 1:1.
- Web additionally has a **bottom nav** (5 role-specific items) alongside the sidenav; mobile is drawer-only.
- Apartment selector for multi-apartment users exists on both (web sidenav dropdown, mobile drawer radio list).

### 3.5 Notices [≈]
Parity: list with unread badge + mark-read, detail, create/edit, category, publish/expiry, read-receipts report toggle, linked-poll navigation.
- Minute: web uses native `datetime-local` pickers for publish/expiry; mobile uses **free-text** `YYYY-MM-DDTHH:MM` inputs (error-prone; needs a date-time picker component). Same free-text date pattern on mobile Amenity booking start/end.

### 3.6 SOS [≈]
Parity: trigger card (category selection, confirm, false-alarm, dismiss), alert list acknowledge/resolve, report screen.
- **[M]** status filter buttons on the alert list (web list has no status filter).

### 3.7 Staff, Polls & AGM, Complaints, HQ, Profile — near parity
- **Staff:** parity (list, check-in/out, deactivate, create/edit form with category/employment-type/shift, attendance report).
- **Polls/AGM:** parity (list/create/vote/close/publish, AGM sessions with per-resolution voting, create-poll-from-session).
- **Complaints:** parity (list, create with category+priority, detail, resolve).
- **HQ:** parity (society list/create/edit incl. theme picker/report, activate/deactivate; HQ user create/activate/deactivate). Both apps honor the HQAdmin-only caps.
- **Profile:** parity (edit info, change password, profile picture upload, logout).
- **Auth:** parity (email+password, phone OTP with multi-account selection, forgot-password OTP reset, invite-token registration) — plus the mobile-only items in section 2.

### 3.8 Platform-level [≈]
- **[W]** PWA: service worker caching, installable app, network-first `/api/*` strategy.
- **[W]** All file **exports** (CSV/Excel/PDF) are web-only across the product (visitors, ledgers).
- **[M]** Pull-to-refresh everywhere; infinite-scroll pagination (web fetches fixed pages of up to 100).
- Society **theming** (6 themes incl. Slate Dark) exists on both (web `theme.service.ts`, mobile `themeStore`/`useThemeColors`); neither has a user-level dark-mode toggle.

---

## 4. Suggested implementation priority (mobile)

1. **Visitor gate QR scanning** — wire up the existing unused `CameraCapture.tsx`; highest security-user impact.
2. **Real QR pass rendering + native Share** on `VisitorPassScreen` (react-native `Share` API; backend already returns the base64 QR).
3. **My Apartment + household invite link** — residents currently cannot invite family from mobile at all.
4. **Society settings for SUAdmin** (profile, society users, overstay threshold, apartment cap) — currently web-only administration.
5. **Resident administration** (create/edit/profile/approve-join/invite) for SUAdmin.
6. **Maintenance admin** (approve proof, mark paid at minimum) and **vendor payment actions** (mark paid + receipt).
7. **Personal financial statement tab** + cash-flow view.
8. **Services & Rewards** feature ports.
9. Quality-of-life: date-time pickers to replace free-text date inputs (notices, amenity booking); visitor date filters + CSV share-sheet export.

## 5. Suggested implementation priority (web)

1. **Web push notifications** (or keep polling but add visitor-approval action emails) to match mobile's actionable notifications.
2. **SOS Alerts sidenav entry for residents** (route already accessible; menu link missing).
3. Optional: persist the login-method choice like mobile does.
