# OurHome — Product Feature Catalog

*A cloud-hosted, multi-tenant platform for apartment and housing society management*

---

## 1. Product Overview

OurHome is a cloud-hosted, always-on platform that helps housing societies and apartment complexes run their day-to-day operations digitally — from resident onboarding and visitor entry to maintenance billing and society finances. It is delivered as a secure web application (installable as a Progressive Web App) alongside a native mobile companion app, so residents, committee members, and gate staff can all work from the device that suits them. Every society's data is kept completely separate and private from every other society on the platform, while the underlying infrastructure is built for reliability, automatic scaling, and fast recovery from disruption. The platform is designed to serve everyone from a single self-managed building to a multi-society management company overseeing many properties at once.

---

## 2. Product Goals

- Give every housing society a single digital system of record for residents, apartments, finances, and communication
- Replace manual, paper-based, or WhatsApp-driven society administration with structured, auditable workflows
- Provide residents with self-service access to their own dues, complaints, bookings, and visitor management
- Give society management (committees/admins) real-time visibility into finances, occupancy, and operational health
- Support secure, controlled entry of visitors, vendors, and service staff through a dedicated security/gate role
- Ensure every society's data remains private and isolated, even when hosted on shared infrastructure
- Offer a consistent experience across web and mobile, so residents are never blocked by which device they're using
- Build a foundation that can grow into a broader society services ecosystem (local vendors, rewards, community events)

---

## 3. User Roles

| Role | Who they are | What they can do | Access Scope |
|---|---|---|---|
| **HQAdmin** | Platform-level administrator (the company operating OurHome) | Onboards new societies, manages platform-wide configuration, has visibility across all societies | Cross-society (platform-wide) |
| **HQUser** | Platform-level viewer/support staff | Views platform data and society information for support and oversight purposes; cannot make changes | Cross-society, read-only |
| **SUAdmin** | Society officer / committee administrator (e.g., Secretary, Treasurer, President) | Manages their society's setup, residents, billing, vendors, amenities, complaints, and reporting | Single society, full management |
| **SUUser** | Resident / apartment owner or tenant | Self-service: views own dues and payment history, raises complaints, books amenities, manages visitors for their apartment, views notices | Single society, self-service (own apartment/data) |
| **SUSecurity** | Security desk / gate staff | Registers walk-in visitors, scans QR/pass codes for visitor check-in and check-out, views the resident and visitor directory in read-only mode | Single society, operational (gate) only — **cannot approve visitor requests** |

> **Note:** SUSecurity is a dedicated operational role for the security gate/reception desk. It is intentionally limited — it can register and check in/out visitors and look up who lives where, but it cannot make administrative decisions (like approving a visitor) or see financial data.

---

## 4. Core Business Modules

| Module | Primary Users | One-line Summary |
|---|---|---|
| Authentication & Access | All roles | Secure sign-in and role-based access to the platform |
| Society Onboarding & Setup | HQAdmin, SUAdmin | Bringing a new housing society onto the platform and configuring its basics |
| Society Structure (Committees & Contact Directory) | SUAdmin, SUUser | Defines the society's governing committee and a shared directory of important contacts |
| User & Access Management | SUAdmin, HQAdmin | Manages who has an account, what role they hold, and their profile details |
| Apartment Management | SUAdmin, SUUser | Maintains the master list of apartments/units and their attributes |
| Resident Lifecycle | SUAdmin, SUUser | Handles residents joining, moving in, moving out, and family member management |
| Amenities & Facility Booking | SUAdmin, SUUser | Lets residents reserve shared facilities (clubhouse, gym, courts, etc.) |
| Complaints & Service Requests | SUUser, SUAdmin | Lets residents log issues and track resolution by society staff |
| Notice Board & Communication | SUAdmin, SUUser | Society-wide announcements and communication |
| Visitor Management | SUUser, SUSecurity, SUAdmin | Controls entry of guests, delivery staff, and service providers |
| Emergency SOS Alerts | SUUser, SUSecurity, SUAdmin | One-tap panic button connecting a resident directly to security and admin |
| Staff Attendance & Workforce Management | SUAdmin, SUSecurity | Tracks the society's own security/housekeeping/maintenance staff roster and daily attendance |
| Maintenance Billing & Fee Collection | SUAdmin, SUUser | Generates and collects periodic maintenance fees from residents |
| Vendor & Operational Expense Management | SUAdmin | Tracks society vendors and operational spending |
| Financial Reporting & Transparency | SUAdmin, SUUser | A suite of reports giving visibility into society finances |
| Rewards & Gamification | SUUser, SUAdmin | Engagement features that reward positive resident participation |
| Polls & AGM E-Voting | SUAdmin, SUUser | Structured resident polling and formal AGM e-voting with audit trail |
| Local Service Provider Marketplace | SUUser, SUAdmin | Connects residents with vetted local service providers |
| Mobile Application | All roles | Native mobile companion experience to the web platform |

---

## 5. Detailed Feature Catalog

### 5.1 Authentication & Access

**Purpose:** Ensure only the right people, with the right role, can access a society's data.

**Roles & Access**

| Role | Access |
|---|---|
| HQAdmin | Full platform sign-in; manages platform-level access |
| HQUser | Sign-in with read-only platform visibility |
| SUAdmin | Sign-in scoped to their society, full management rights |
| SUUser | Sign-in scoped to their society, self-service rights |
| SUSecurity | Sign-in scoped to their society, operational-only rights |

**Business Capabilities**
- Sign in via phone + one-time code (default), email + one-time code, or traditional email/password
- The app remembers each user's preferred sign-in method so returning users land on it automatically
- Users who belong to more than one society, apartment, or role are asked to pick which context to enter
- Secure password reset / account recovery flow, verified by one-time code
- New residents join through a secure, society-specific invitation link and set up their own account
- Automatic sign-out after a session expires, protecting shared or gate-desk devices

**Business Rules**
- Access is never granted until identity is verified (one-time code or password) — there is no direct access without verification
- Every session is tied to exactly one society and one role — a person cannot silently act as a different society or role
- Society Admin accounts are not tied to a specific apartment; resident accounts are
- After completing self-registration, a new user lands on the sign-in page — not a password page — keeping the flow simple

**Planned Enhancements**
- "Stay signed in" convenience via long-lived sessions, so residents aren't logged out unexpectedly
- A personal login history so users can see recent sign-ins to their account
- Social login (sign in with Google/Microsoft) for faster onboarding
- An additional identity-verification step (multi-factor authentication) for high-privilege accounts such as SUAdmin and HQAdmin

---

### 5.2 Society Onboarding & Setup

**Purpose:** Bring a new housing society onto the platform and establish its foundational operating record.

**Roles & Access**

| Role | Access |
|---|---|
| HQAdmin | Creates societies; views and updates all society records |
| HQUser | Views the society list and details (read-only) |
| SUAdmin | Updates their own society's settings after onboarding |

**Business Capabilities**
- Platform admin registers a new society with its name, address, contact details, block/building count, and estimated total apartments, together with its first society administrator account, in a single step
- The first society administrator is verified with a one-time code before they can log in
- Society administrator can set an "overdue threshold" policy (1–90 days) that determines when unpaid maintenance is flagged as late
- Society administrator can define committees and assign named office-bearers, and set custom role titles for society members
- Platform admin/viewer can browse and inspect all onboarded societies at any time

**Business Rules**
- The society record and its first administrator account are created together — one cannot exist without the other
- A society is live immediately upon creation — there is currently no draft or pending status before it becomes visible to residents

**Planned Enhancements**
- A formal **draft → review → publish** lifecycle so a society can be fully configured and reviewed before it goes live to residents
- A guided, step-by-step onboarding wizard that bundles maintenance fee setup, amenities, and security staff into one session instead of several separate steps
- Support for naming **multiple initial administrators** at creation, rather than a single admin

---

### 5.3 Society Structure (Committees & Contact Directory)

**Purpose:** Give every resident a clear, shared picture of who runs the society and how to reach them.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Manages committee membership and contact information |
| SUUser, SUSecurity, HQAdmin, HQUser | View the committee list and contact directory (read-only) |

**Business Capabilities**
- Admin maintains named committees (e.g., Managing Committee, Sports Committee) and assigns office-bearer titles (President, Secretary, Treasurer) to existing registered users
- Every role can view a read-only "Contact Us" page showing the society office's contact details and the full committee roster
- The contact directory always mirrors the latest committee configuration — there is no separate data entry to keep in sync

**Business Rules**
- A person can hold **only one committee position, society-wide**, at a time — assigning someone already holding a role elsewhere is rejected
- Committee members must be selected from existing registered users, not entered as free text
- The Contact Us page has no edit controls — all edits happen through Society Settings

**Planned Enhancements**
- Term/tenure tracking for committee positions (start/end dates, history of past committees)
- Richer contact categorization (emergency, maintenance, vendor, administrative)

---

### 5.4 User & Access Management

**Purpose:** Control who has an account on the platform, what role they hold, and keep their profile information accurate.

**Roles & Access**

| Role | Access |
|---|---|
| HQAdmin | Manages platform-level user accounts |
| SUAdmin | Creates, updates, activates/deactivates, and removes users within their society, including designating security/gate staff |
| SUUser, SUSecurity | Manage their own profile only (name, phone, password) |

**Business Capabilities**
- Direct creation of resident and security-staff accounts by the admin, or invitation via a secure link for residents to self-register
- A searchable, role-grouped resident directory
- Activation, deactivation, and removal (soft delete) of user accounts
- A user can hold accounts across multiple apartments, and even across multiple societies, choosing which context to use at sign-in
- Formal transfer of apartment ownership or tenancy to a new person, with full history retained
- Self-service password change and profile updates

**Business Rules**
- Only SUAdmin (within a society) or HQAdmin (platform-wide) can assign or change a user's role
- A deactivated user immediately loses access to all society features
- A user account **cannot be removed** while still linked to an apartment, or while any of their linked apartments has unpaid dues for the current month or earlier
- Self-registered residents cannot access apartment-specific features until their apartment join request is approved

**Privacy Safeguard**
- A resident viewing another resident's record sees a **masked phone number and email** (e.g., `+91-98XXXXXX10`, `ra***@***.com`) — enough to confirm identity without exposing full contact details. A resident's own record, and admin/security views, are never masked, and directory search still works against the full values

**Planned Enhancements**
- Bulk resident import via spreadsheet upload, to onboard an entire building at once instead of one account at a time
- Automatic notification to admin whenever a new resident submits a join request
- Reminder notifications to residents who registered but haven't completed apartment association after a few days

---

### 5.5 Apartment Management

**Purpose:** Maintain an accurate, structured record of every physical unit in the society and its occupancy lifecycle.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates, updates, and deletes apartments; imports via spreadsheet; manages occupancy status |
| SUUser | Views their own linked apartment's details |
| SUSecurity | Views the apartment and resident directory |

**Business Capabilities**
- Add apartments individually, or bulk-import an entire society's units from a spreadsheet in one step
- Track apartment number, block/building, floor, room count, parking allocation, and multiple area measurements (carpet, built-up, super built-up) used for fee calculation
- Mark units as Vacant, Occupied, or Under Maintenance
- View the complete ownership and tenancy history of every apartment
- Guided workflows to transfer ownership or tenancy to a new person — the previous resident and their household members are automatically unlinked

**Business Rules**
- The combination of apartment number, block, and floor must be unique within a society — duplicates are rejected
- An apartment cannot be deleted while it still has active residents linked to it
- Ownership and tenancy history is never deleted — it is a permanent audit trail
- The apartment list is always ordered floor-descending, then apartment-number-ascending, consistently across web and mobile

**Planned Enhancements**
- Server-side search and filtering of the apartment list (by block, floor, or status), so large societies can find records quickly instead of loading and filtering the entire list in the browser

---

### 5.6 Resident Lifecycle

**Purpose:** Manage the journey of a resident from joining a society, through household changes, to moving out.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates residents directly, approves/denies join requests, manages transfers |
| SUUser | Self-registers, requests apartment association, invites family members/co-occupants |

**Business Capabilities**
- Admin can directly create a resident account with immediate apartment linking — no approval step needed
- New residents can instead self-register through a secure invite link, then request to join their apartment, subject to admin approval
- An existing owner can invite family members, and an existing tenant can invite co-occupants, directly
- Formal ownership and tenancy transfer workflows when residents move out and new ones move in
- Full resident history is preserved through every household or occupancy change

**Business Rules**
- Admin-created resident accounts are linked to their apartment immediately, without an approval step
- Self-registered residents must wait for admin approval on their apartment join request before gaining apartment-specific access
- When an owner or tenant is transferred out, their linked family members/co-occupants are also unlinked, and the change is recorded permanently in history

**Planned Enhancements**
- Automatic admin notification the moment a new join request is submitted (today it must be checked manually)
- Bulk resident import via spreadsheet, to batch-create accounts instead of one at a time or via individual invites
- A scheduled reminder to residents who've registered but not yet completed their apartment association after a few days

---

### 5.7 Amenities & Facility Booking

**Purpose:** Let residents reserve shared society facilities such as the clubhouse, gym, swimming pool, or community hall.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates and configures amenities; reviews, approves/rejects, and can cancel any booking |
| SUUser | Browses amenities, books slots, views and cancels own bookings |
| SUSecurity | Views bookings (read-only) |

**Business Capabilities**
- Admin sets up amenities with capacity, usage rules, bookable slot duration, operating hours, and how far in advance a booking can be made
- Residents browse available amenities and check slot availability for a chosen date
- Residents book a specific time slot; the system automatically prevents any double-booking of the same slot
- Admin reviews pending bookings and **approves or rejects** them, with optional notes shown to the resident
- Residents can **cancel their own** pending or approved booking; admin can **cancel any booking with mandatory remarks**, which are shown to the resident on their booking and delivered as a notification
- Residents see their own bookings with live status; admins see every booking across the society
- Booking resident receives a notification on booking creation, approval, rejection, and admin cancellation

**Business Rules**
- Two bookings for the same amenity can never overlap
- Booking times are interpreted in the society's local time against the amenity's operating hours
- An admin cancelling another resident's booking must state a reason — silent cancellation is not possible

**Known Gaps (documented requirements not yet available today)**
- Amenities, once created, **cannot currently be edited** — there is no way to update capacity, hours, or rules after setup
- Residents cannot **reschedule** a booking — the path today is cancel and re-book
- Availability can only be checked **one date at a time**, not across a week or month
- There is **no usage reporting** on amenities (utilization, peak times, most-booked)

**Planned Enhancements**
- Ability to update amenity settings (capacity, hours, rules, slot duration) after creation
- Reschedule of an existing booking without cancel + re-book, with notifications to affected parties
- A date-range calendar view of amenity availability instead of single-date lookups
- Usage reports showing amenity popularity and utilization over time

---

### 5.8 Complaints & Service Requests

**Purpose:** Give residents a structured way to raise issues and track resolution by society staff.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Views all complaints, assigns, updates status, resolves, closes, rejects |
| SUUser | Raises complaints, views own complaints, submits feedback after resolution |
| SUSecurity | Views complaints (read-only) |

**Business Capabilities**
- Residents submit a complaint with a title, description, category (Maintenance, Security, Noise, Cleanliness, Infrastructure, General), priority, and optional photos
- A complaint moves through a clear lifecycle: Open → In Progress → Resolved → Closed, or Rejected with a reason at any point
- Admin can assign a complaint to a responsible person and track every status change with a reason and timestamp
- Residents see only their own complaints; admins see all complaints across the society, filterable by status and category

**Business Rules**
- Resident feedback (rating and comment) can only be submitted once a complaint has reached Resolved status

**Known Gaps**
- The feedback/rating step exists in the system but is **not yet reachable by residents** — there is no way to actually submit it today
- There is no filter to view complaints by a specific apartment
- Notification delivery on every status change is not fully confirmed as reliable

**Planned Enhancements**
- Make the feedback/rating step usable so residents can rate resolution quality
- Add an apartment filter to the complaints list
- Guarantee notification delivery to residents on every status change (Open → In Progress → Resolved → Rejected)
- Resolution-time reporting — average time to close, open count by category, volume trends
- A "preferred date/time" field so residents can indicate availability for a repair visit

---

### 5.9 Notice Board & Communication

**Purpose:** Replace ad hoc, informal announcements with one official, trusted communication channel for the society.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates, targets, and manages notices |
| SUUser | Views notices, marks read/unread |
| SUSecurity | Views notices |
| HQAdmin / HQUser | No access to society-level notices |

**Business Capabilities**
- Admin publishes a notice with a title, content, category (General, Maintenance, Event, Security, Finance, Emergency), and optional scheduled publish and expiry dates
- Admin can **edit a published notice** (title, content, expiry) to correct mistakes without deleting and reposting
- Notices can be targeted to specific apartments, or published society-wide
- Residents see a live feed of active notices and receive a push notification the moment a new one is posted
- Per-resident read/unread tracking, so each resident's notice feed reflects what they've personally seen — not just a global read count
- Admin can pull a **read-receipts report** per notice — who has read it and who hasn't

**Business Rules**
- Notices past their expiry date automatically drop out of the active list

**Known Gaps**
- Admin **cannot currently delete** a notice
- There is no way to filter the notice list by category or date range
- There is no way for residents to browse expired/archived notices
- Notices cannot currently carry file or photo attachments (e.g., circulars, images)

**Planned Enhancements**
- Enable deleting a notice
- Add category and date-range filters to the notice list
- Provide a browsable archive of expired notices
- Support attachments (documents, images) on notices
- Automate daily archiving of expired notices instead of relying on the active-list filter alone

---

### 5.10 Visitor Management

**Purpose:** Digitize guest handling and give both security staff and residents clear control and visibility over who enters the premises.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Registers, denies, checks in/out, and lists all visitors — **cannot approve** a pending visitor |
| SUSecurity | Registers walk-in visitors, denies visitors, scans QR codes for check-in/out, views all visitors — **cannot approve** a pending visitor |
| SUUser | Pre-approves visitors for their own apartment; **approves or denies** a pending visitor hosted by their own apartment; views their own apartment's visitor history |

**Business Capabilities**
- Security staff register a walk-in visitor at the gate with name, phone, purpose, and photo; the request is sent to the host apartment for approval
- Residents can pre-approve an expected visitor ahead of time, choosing how long the pass stays valid (from 1 hour up to 72 hours, or with no expiry) — a resident-created pass is **approved immediately**, with no extra approval step
- Every visitor receives a numeric pass code and a QR code; security verifies at the gate by typing the code or **scanning the QR with the device camera — on both the web app and the mobile app** — and a valid pass checks the visitor in as a single step
- A public, no-login shareable link lets a visitor's pass be viewed or shared by email/SMS without exposing sensitive details, and hides itself once expired; on mobile the pass can also be shared through the phone's native share sheet (WhatsApp, SMS, etc.) with the same link included
- Residents receive a push notification with direct Approve/Deny actions when an unscheduled visitor arrives at the gate
- Visitors who leave without a recorded exit are **automatically checked out** once their pass validity has long lapsed, and anyone staying past the society's overstay threshold is visibly **flagged as overstaying** in the visitor list
- Full visitor history and CSV export for security review, with company/purpose suggestions drawn from past entries to speed up registration
- A dedicated view of everyone currently checked in, for real-time premises awareness
- Visitor photos appear throughout — list thumbnails, gate verification results, and the pass itself — and can be viewed full-screen with zoom, on both web and mobile

**Business Rules**
- **Only the host resident can approve a pending visitor.** Admins and security staff can deny a visitor request but are deliberately excluded from approving one — approval is a resident-only decision, by design, not a limitation
- A visitor pass that has passed its validity window cannot be used for check-in
- Residents only ever see their own apartment's visitor history, enforced regardless of what they might try to request
- The security visitor list silently refreshes every 10 seconds to reflect near-real-time status changes

**Planned Enhancements**
- Instant, push-based status updates for the security desk, replacing today's 10-second refresh cycle
- A printable physical visitor pass layout, in addition to the digital QR pass
- A pending-visitor count badge so residents can see at a glance how many requests are awaiting their action

---

### 5.11 Emergency SOS Alerts

**Purpose:** Give a resident a single, unmistakable way to raise an emergency — fire, medical, security threat, or anything that cannot wait for a normal complaint ticket — and get it in front of security and admin immediately, with a full response-time record.

**Roles & Access**

| Role | Access |
|---|---|
| SUUser | Triggers an SOS alert for their own apartment; can stand it down as a false alarm |
| SUSecurity | Receives alerts in real time; acknowledges and resolves |
| SUAdmin | Receives alerts; views full history and response-time reporting |

**Business Capabilities**
- A one-tap SOS control lets a resident raise an alert with a category (Fire, Medical, Security/Intrusion, Other) and an optional note
- The resident's apartment, name, and a server timestamp are attached automatically — nothing to type or locate manually
- Every on-duty security account and the society admin get an immediate, high-priority push notification with the resident's name, apartment, category, and note
- Other residents linked to the same apartment (co-owner, family members) are also notified that a household member triggered an alert
- An alert moves through a clear lifecycle: Triggered → Acknowledged → Resolved, or Triggered/Acknowledged → False Alarm
- The first responder to acknowledge is recorded by name and time, so ownership of the alert is always clear
- If an alert goes unacknowledged past a configurable window (default 2 minutes), it automatically escalates — re-notifying security and looping in admin if not already alerted
- Admin can review full alert history and response-time/false-alarm-rate reporting to tune staffing and escalation timing

**Business Rules**
- Only the triggering resident can mark their own alert a False Alarm; only SUSecurity/SUAdmin can mark an alert Resolved
- A resident can only trigger or stand down an alert for their own apartment
- Escalation repeats at increasing intervals until the alert is acknowledged
- Every society member can view the alert list for situational awareness — but only security/admin can act on an alert
- Standing down an already-stood-down alert never errors — the action is safely repeatable from a device showing a stale status

**Planned Enhancements**
- One-tap dial to the local emergency number alongside the in-app alert, for Fire/Medical categories
- Capturing device GPS location in addition to the registered apartment, for large campuses with common areas
- A silent/duress trigger mode that raises an alert without an audible confirmation on the resident's device

---

### 5.12 Staff Attendance & Workforce Management

**Purpose:** Track attendance for the society's own staff — security guards, housekeeping, gardeners, and contractors — replacing the paper register kept (if at all) at the gate today.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Manages the staff roster and shifts, marks or corrects attendance, views attendance reports |
| SUSecurity | Marks staff check-in/check-out at the gate, views today's roster and who is currently on duty |
| SUUser | No access |

**Business Capabilities**
- Admin maintains a staff roster with name, phone, photo, category (Security, Housekeeping, Gardener, Plumber, Electrician, Other), assigned shift, and employment type (on-payroll or contractor)
- Admin defines named shifts with start/end times (e.g., "Morning Security", "Night Security")
- Security or admin marks check-in and check-out with a timestamp; a staff member cannot be checked in twice without an intervening check-out
- A day with no check-in by the end of a staff member's shift is automatically recorded as Absent
- Security sees a live "who's currently on duty" view, mirroring the same visibility already available for visitors
- Admin views daily and monthly attendance summaries per staff member — present, absent, late-arrival counts — filterable by category and date range
- Admin is notified if a staff member hasn't checked in within a configurable grace period (default 30 minutes) after their shift start
- Deactivating a staff member who has left preserves their historical attendance record

**Business Rules**
- A staff member cannot be checked in twice on the same day without checking out first
- Attendance defaults to Absent when no check-in occurs by end of shift, unless an exception is logged

**Planned Enhancements**
- Staff self check-in via QR code or geofence, rather than relying solely on SUSecurity to mark it
- Advance leave requests from staff or their supervising contractor, to reduce false Absent marks
- CSV payroll export of monthly attendance for payroll or contractor invoice reconciliation

---

### 5.13 Maintenance Billing & Fee Collection

**Purpose:** Automate recurring maintenance billing and give both admins and residents a clear, month-by-month payment record.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates/inactivates/deletes fee schedules; reviews and approves payments; adds penalties; views the society-wide grid |
| SUUser | Views own charges; uploads payment proof |

**Business Capabilities**
- Admin defines a fee schedule, charged either as a **flat amount per apartment** or **per square foot** of the unit, on a monthly, quarterly, or yearly frequency
- Charges are generated automatically for every applicable apartment for the entire schedule period — no manual monthly entry required
- Residents view their charges and upload a payment proof (receipt image or PDF) against one or more charges at once — several months submitted together are treated as one **clubbed submission** reviewed as a group
- Admin reviews submitted proof in a full-screen zoom view before approving, can **deny a proof with a stated reason** (shown to the resident, singly or for a whole clubbed group at once), or can manually mark a charge as paid with payment method and reference
- Admin can levy one-off penalty charges (e.g., late fees) against a specific apartment
- A month-by-month grid gives admins a complete financial snapshot across every apartment at a glance, with totals for paid, submitted, and pending amounts per month

**Business Rules**
- **Only one fee schedule can be active for a society at a time**
- The overdue threshold (how many days after the due date a charge is flagged late) is configurable per society, from **1 to 90 days**
- Ending or inactivating a schedule from a chosen month voids future charges from that point onward, without altering billing history
- Extending a schedule's end date adds only the newly-added months' charges

**Known Gaps**
- Admin notification the moment a resident submits payment proof is not yet confirmed to be firing reliably
- Residents cannot currently download a formal PDF receipt — only the uploaded proof document is available
- Fee schedule creation, the charge register, and penalty creation remain web-only admin surfaces — mobile covers the resident payment flow plus proof review

**Planned Enhancements**
- Guaranteed admin notification the moment proof is submitted
- Auto-generated PDF receipts for residents upon approval or manual payment
- **Automated Payment Gateway (Phase 2):**
  - Residents securely save a payment method (UPI, card, net banking) for hands-off recurring payment
  - Automatic deduction of the due amount on or before the due date, with automatic retries on failure
  - Reminder notifications sent a few days and again one day before a charge is due
  - Residents can turn autopay on or off per apartment, and choose which charges to auto-pay
  - Choice of autopay frequency (monthly, quarterly, annually), aligned with the society's billing schedule
  - Admin visibility into every resident's autopay enrollment status, with the ability to disable it for a resident when needed (e.g., a dispute)
  - A formal PDF receipt automatically generated on every successful payment, manual or automated

---

### 5.14 Vendor & Operational Expense Management

**Purpose:** Bring the same rigor used for resident billing to the society's own outgoing vendor payments.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Manages vendor records, cost schedules, and payment tracking |

**Business Capabilities**
- Admin maintains a vendor directory (housekeeping, security agency, electrician, plumber, etc.) with contact details, service area, contract validity date, and uploaded photo/contract document
- Admin sets up recurring cost schedules per vendor (weekly through yearly), or logs one-off ad hoc charges for emergency or special work
- A month-by-month grid — mirroring the maintenance billing grid — shows total cost per vendor per month, with paid and outstanding totals, and overdue amounts highlighted
- Charges can be marked paid with payment reference and receipt, or inactivated/reactivated/deleted as circumstances change
- Vendors can be deactivated to prevent accidental use of an expired or retired vendor

**Business Rules**
- A vendor's cost schedule end date can never exceed that vendor's contract validity date
- A vendor can have multiple active cost schedules running at once
- Inactive charges are excluded from all grid totals

**Known Gaps**
- There is no single consolidated detail view for one vendor — only the full vendor list is available today
- The monthly/annual cost equivalent of a recurring schedule is not shown automatically — it must be worked out manually
- Uploaded vendor pictures and contracts have no in-app preview — only a "ready" confirmation is shown after upload, on both web and mobile

**Planned Enhancements**
- A single, consolidated detail view per vendor, showing profile, schedules, and recent charges together
- Automatic display of monthly and annual cost equivalents, so admins instantly see what a recurring contract costs per year
- Automated overdue-payment notifications to admin
- In-app document preview with zoom for vendor pictures/contracts, on both web and mobile

---

### 5.15 Financial Reporting & Transparency

**Purpose:** Give society management full financial visibility, and give residents enough transparency to trust that their fees are being used responsibly — without exposing any other resident's personal payment data.

**Roles & Access**

| Report | SUAdmin | SUUser |
|---|---|---|
| Financial Dashboard | Full society view | Own apartment summary only |
| Income / Collection Report | Society-wide | — |
| Outstanding Dues Report | Society-wide | — |
| Expense Report | All vendor costs | — |
| Monthly Profit & Loss Statement | Yes | — |
| Cash Flow Statement | Yes | — |
| Apartment Ledger | Any apartment | Own apartment only |
| Society-Wide Ledger | Yes | — |
| Penalty Report | Society-wide | — |
| Vendor Payment Due Report | Yes | — |
| Annual Financial Summary | Yes | — |
| Personal Payment Statement | — | Own apartment only |
| Society Financial Summary (Transparency Report) | Yes | Aggregated, anonymous |
| Annual Maintenance Statement | — | Own apartment only |

**Business Capabilities**
- **Financial Dashboard** — at-a-glance monthly income, expenses, net surplus/deficit, collection efficiency, top overdue apartments, and upcoming cash inflow/outflow for the next 7 days
- **Income / Collection Report** — detailed maintenance income over a selected period, filterable by block, apartment, and payment status, exportable to CSV/PDF
- **Outstanding Dues Report** — the "who owes what" view, sortable by amount owed, with a printable dues-notice format
- **Expense Report** — vendor spending over a period, groupable by vendor or month
- **Monthly Profit & Loss Statement** — a single month's income vs. expenses, formatted for committee review
- **Cash Flow Statement** — month-by-month cash in vs. cash out over up to a 24-month range, with a running balance if an opening balance is configured
- **Apartment Ledger** — a full running account statement for one apartment, formatted for emailing to a resident or presenting at a committee meeting
- **Society-Wide Ledger** — the same running-balance view as the apartment ledger, but combining every apartment and every vendor charge into one chronological record
- **Penalty Report** — all penalty charges issued, with collection status
- **Vendor Payment Due Report** — overdue and upcoming vendor payments, for cash-flow planning
- **Annual Financial Summary** — a full financial-year rollup, suitable for the Annual General Meeting
- **Personal Payment Statement** — a resident's own charges and payment status, downloadable as a PDF
- **Society Financial Summary (Transparency Report)** — a resident-facing, always-current view of society-level income, expenses, and surplus/deficit, with an expense breakdown by category
- **Annual Maintenance Statement** — a formatted yearly statement of a resident's own payments, useful for personal records or reimbursement

**Business Rules**
- The **Society Financial Summary never shows any individual apartment name, resident name, or individual payment amount** — only society-level totals and percentages, so it can be shared broadly without compromising any resident's financial privacy
- A resident can only ever view their own apartment's ledger and statements — attempting to view another apartment's data is blocked
- All reports are computed live from existing billing and vendor data — there is no separate, hand-maintained bookkeeping system to keep in sync
- If no data exists for a selected period, a report shows a clear "no data" message rather than an error

**Planned Enhancements**
- Configuration of a society **opening balance**, so cash-flow and annual reports reflect a true cumulative surplus rather than starting from zero
- Scheduled, automatic monthly email delivery of key reports (P&L, cash flow) to the committee
- Tracking of **non-maintenance income** (parking fees, hall rental, interest income), so reports reflect all society income, not just maintenance fees
- A simple **utility bill** tracking log (electricity, water, municipal tax) alongside vendor expenses
- **Budget vs. actual** reporting, comparing planned annual spend against real spend by category
- A **shareable, no-login public link** for the Society Financial Summary, so it can be circulated at AGMs or pasted into a notice without requiring residents to log in
- Automatic PDF receipt generation tied to every approved or manually marked payment

---

### 5.16 Rewards & Gamification

**Purpose:** Promote community engagement and make participation visible and rewarding.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates and manages competitions; awards points; views leaderboards and reports |
| SUUser | Browses and joins competitions; views own points and leaderboard |

**Business Capabilities**
- Admin creates competitions with a title, description, dates, prize, and a cap on the number of participants
- Residents register for a competition, subject to the participant cap being enforced automatically
- A ranked leaderboard shows standings for a competition
- Admin can award points to any resident with a stated reason; residents can see their personal point total and history

**Known Gaps**
- Residents currently have **no way to browse** the list of available competitions — there's no listing view
- Competition scores **cannot be updated** once registration is complete
- **Point redemption is not available** — points cannot yet be converted into a real benefit (e.g., a maintenance discount or amenity credit)
- There is no separate concept of a society "event" (AGM, cultural evening, sports day) distinct from a competition, and no RSVP capability
- No notifications are sent for new competitions, registration, or results
- No admin reporting exists on participation rates or engagement trends

**Planned Enhancements**
- A browsable listing of upcoming, active, and past competitions
- The ability to record and update participant scores as a competition progresses
- A points-redemption mechanism tied to real benefits (maintenance discount, amenity credit)
- A dedicated **event management** capability for society events (AGMs, cultural programs, sports days) with RSVP, separate from competitions
- Notifications when a new competition is created and when results are published
- Broadcasting of final competition results to all registered participants
- Engagement reporting — participation rate per apartment, total points awarded, leaderboard trends

---

### 5.17 Polls & AGM E-Voting

**Purpose:** Let the society raise a question to residents and collect structured input — from a quick one-tap poll to a formal e-voting resolution tied to an Annual General Meeting (AGM) — replacing a show of hands, a WhatsApp thread, or a physical ballot with a digital paper trail.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Creates and closes polls, configures voting rules and eligibility, views live tally, publishes results |
| SUUser | Views open and past polls, casts a vote while open, views results per the poll's visibility setting |
| SUSecurity | Views published results only — no voting rights |
| HQAdmin / HQUser | No access to society-level polls |

**Business Capabilities**
- Admin creates a poll with a title, description, poll type (single or multiple choice), and two or more answer options
- Admin sets a voting window (opens/closes), and can target the poll at the whole society, a single block, or a specific set of blocks
- Admin chooses the voting unit — one vote per apartment (cast by the owner) or one vote per registered resident
- Admin chooses anonymity — Anonymous (choice not linked to identity in any result) or Identified (who-voted-for-what retained for audit)
- A poll can optionally link back to a Notice Board announcement (e.g. the AGM notice), surfacing the poll directly from that notice
- An eligible resident/apartment casts exactly one vote per poll; a second attempt is rejected, unless the poll allows vote changes, in which case the earlier vote is replaced, not duplicated
- Admin sees a live running tally while a poll is open — vote counts per option against the eligible count
- Once closed, results are visible per the poll's visibility setting: immediately, only after close, or admin-only until manually published
- A poll can be flagged as a formal AGM Resolution, enabling a quorum threshold and an identified audit trail; multiple resolutions can be grouped under one AGM session so residents see them as a single combined ballot rather than several unrelated polls
- Residents get a push notification when a poll opens, a reminder ahead of close if they haven't voted, and a notification when results are published
- Every vote is timestamped and recorded against the voting unit, regardless of anonymity setting — for Anonymous polls, that identity-to-choice link is retained internally for dispute resolution but never exposed to residents through the app; only the aggregate tally is

**Business Rules**
- An eligible apartment/resident cannot vote more than once on the same poll
- Votes cast outside the voting window are rejected
- If a quorum threshold is configured and not met, the outcome is recorded as No Quorum rather than Passed/Failed
- A Single-Block poll requires exactly one target block; a Multiple-Block poll requires at least one

**Planned Enhancements**
- Allowing a resident to attach a short comment/objection to their vote on an AGM resolution, visible only to SUAdmin
- A downloadable PDF summary of an AGM session's resolutions and results, for official society records

---

### 5.18 Local Service Provider Marketplace

**Purpose:** Connect residents with vetted local service providers (plumbers, electricians, cab services, grocery stores, etc.) operating in or around the society.

**Roles & Access**

| Role | Access |
|---|---|
| SUAdmin | Approves/rejects provider registrations; monitors all requests |
| SUUser | Browses providers; submits service requests; rates completed services |
| Service Providers | Register; view service requests; accept or decline requests |

**Business Capabilities**
- External providers self-register with their business details and the services they offer, and stay in a pending state until approved
- Residents browse the directory of approved providers with category and contact context
- Residents submit a service request specifying the type of service, a description, and a preferred date/time, optionally targeting a specific provider

**Known Gaps**
- Admin **cannot yet approve or reject** a provider registration through the system — providers stay pending indefinitely today
- There is no field for a provider to list their **pricing**
- Providers **cannot accept or decline** a service request — once submitted, there's no provider-side response today
- There is no detail view for a single provider or a single request — only list views
- Residents **cannot yet submit a rating or review** after service completion, even though the data model supports it
- No notifications are sent to a provider on a new request, or to a resident when a provider responds
- No admin reporting exists on request volume, provider responsiveness, or resolution times

**Planned Enhancements**
- Enable admin approval/rejection of provider registrations
- Enable providers to accept or decline incoming service requests, with a notification to the resident on their response
- Add detail views for individual providers and individual requests
- Enable ratings and reviews after service completion, feeding into each provider's aggregate rating
- Add a pricing field to provider profiles
- Add notifications throughout the request lifecycle (provider on new request, resident on provider response)
- Add admin reporting on request volume by service type, response rate, and average completion time

---

### 5.19 Mobile Application

**Purpose:** Give every role a native companion app with the same functional depth as the web app, plus mobile-only capabilities that a browser can't offer.

**Roles & Access**

| Role | Access |
|---|---|
| All roles | Native mobile companion app mirroring their web permissions |

**Business Capabilities**
- Full feature parity with web for login, visitors, notices, complaints, amenities (including booking approval and cancellation), maintenance (including payment-proof submission and admin proof review), resident/apartment management, and financial reports (including the Society-Wide Ledger)
- Native biometric sign-in (Face ID / Touch ID / Fingerprint) after the first login, with a fallback to password
- Native push notifications, including actionable **Approve/Deny buttons directly on a visitor notification** — no need to open the app
- A **built-in QR scanner for gate check-in** — security staff scan a visitor's pass with the phone camera and a valid pass is verified and checked in in one step, no typing required
- Native camera capture for visitor photos, payment proof, and profile pictures, with automatic compression before upload
- Native share sheet for visitor passes — the pass details, code, and public link go out through WhatsApp, SMS, or any installed app
- An offline-aware experience: cached data is shown when offline with a clear banner, and actions requiring connectivity are clearly blocked rather than silently queued

**Known Gaps vs. Web**
- **No vendor document/photo preview on mobile** — vendor records are a view-only list, without the document preview available on web
- Web-only bulk-admin surfaces remain: apartment CSV import, maintenance schedule setup/charge register/penalties, vendor directory and schedule management forms, and society profile/settings editing

**Planned Enhancements**
- A home-screen widget / live-activity showing a countdown for an active visitor pass
- Offline queuing of actions like complaint submission and payment-proof upload, replaying automatically once back online
- Full screen-reader (accessibility) compliance across the app

---

## 6. Cross-Cutting Platform Capabilities

These capabilities aren't tied to a single module — they underpin the entire platform.

| Capability | What It Means for the Business |
|---|---|
| **Multi-tenant data isolation & privacy** | Every society's residents, finances, and records are kept completely separate from every other society's — even though all societies share the same underlying platform. Platform-level roles and society-level roles are kept distinct, enabling both central governance and local operations |
| **Document & evidence capture** | Photos and documents (payment proof, visitor photos, vendor contracts, receipts) are captured and stored securely wherever a business process needs evidence, viewable only by authorized users — never via a plain public link |
| **Automated recurring processes & notifications** | Routine jobs — generating monthly maintenance charges, flagging overdue payments, sending push notifications — run automatically in the background instead of requiring manual staff action |
| **Mobile + web feature parity** | The platform is designed so residents and staff get a consistent experience whether on a computer or a phone, with a small number of currently tracked gaps (called out per module above) on the roadmap to close |
| **Progressive, installable web experience** | The web app can be installed like a native app, works well on mobile browsers, and prompts users to update smoothly when a new version is available |
| **Platform reliability & trust** | See below |

**Platform Reliability & Trust — plain-language summary**

- **Traffic safeguards** — the platform is designed to protect itself from being overwhelmed during unexpected usage spikes, keeping the service responsive for everyone
- **Faster problem diagnosis** — when something goes wrong, the team can trace exactly where in the process it happened, rather than guessing
- **Automatic retry** — if a notification, email, or SMS fails to send on the first attempt due to a temporary hiccup, the system is designed to retry rather than silently lose it
- **Automated regression checks** — updates are tested against existing functionality before release, reducing the risk that a new feature breaks something that already worked
- **Proactive alerts** — the operations team can be alerted to potential issues automatically, often before residents would notice a problem themselves

---

## 7. Future Requirements Roadmap

This is the consolidated, cross-module view of everything on the platform's forward-looking roadmap — both features explicitly identified as future work and functional gaps found in day-to-day use that represent capability not yet available today.

| Module | Planned Capability | Business Benefit |
|---|---|---|
| Authentication & Access | "Stay signed in" (long-lived sessions) | Residents aren't logged out unexpectedly during normal use |
| Authentication & Access | Login/session audit history | Users and admins can verify an account hasn't been accessed by someone else |
| Authentication & Access | Social login | Faster, friction-free account creation |
| Authentication & Access | Multi-factor authentication for high-privilege accounts | Extra protection for the accounts with the most access (SUAdmin/HQAdmin) |
| Society Onboarding & Setup | Draft → review → publish lifecycle for new societies | Lets a society be fully configured and reviewed before residents see it, avoiding a messy half-set-up launch |
| Society Onboarding & Setup | Guided onboarding wizard | Bundles fee, amenity, and staff setup into one session, reducing setup errors and time-to-live |
| Society Onboarding & Setup | Multiple initial administrators at creation | Reflects real-world committees, which rarely have just one admin from day one |
| Apartment Management | Server-side filters on the apartment list (block/floor/status) | Large societies can find specific units quickly instead of scrolling a full list |
| User & Access Management | Bulk resident import via spreadsheet | Onboards an entire building in one step instead of one account at a time |
| Resident Lifecycle | Admin notification on new join requests | Prevents join requests from sitting unnoticed |
| Resident Lifecycle | Onboarding completion reminders | Improves the rate of residents fully completing setup |
| Amenities & Facility Booking | Ability to update amenity settings after creation | Lets admins correct or evolve amenity details without recreating them |
| Amenities & Facility Booking | Reschedule booking | Residents can move a booking without cancel + re-book |
| Amenities & Facility Booking | Date-range calendar availability view | Residents can plan ahead instead of checking one day at a time |
| Amenities & Facility Booking | Usage reports | Helps management see which amenities are most/least used |
| Complaints & Service Requests | Feedback/rating on resolved complaints | Measures service quality and holds staff accountable |
| Complaints & Service Requests | Apartment-based filtering | Surfaces recurring issues tied to a specific unit |
| Complaints & Service Requests | Guaranteed status-change notifications | Residents are reliably informed as their issue progresses |
| Complaints & Service Requests | Resolution-time reporting | Gives management a clear service-level metric |
| Complaints & Service Requests | Preferred time-slot field | Reduces missed technician visits |
| Notice Board & Communication | Delete notice | Removes outdated or mistaken announcements |
| Notice Board & Communication | Category and date filters | Makes past notices easier to find |
| Notice Board & Communication | Archived notices browsing | Preserves history while keeping the active board focused |
| Notice Board & Communication | Attachments on notices | Supports richer communication (circulars, images, forms) |
| Notice Board & Communication | Automatic daily archiving of expired notices | Removes manual cleanup work |
| Visitor Management | Real-time push status updates for the security desk | Replaces 30-second polling with instant updates, so gate staff act faster |
| Visitor Management | Physical pass printing | Supports societies that want a printed pass alongside the digital one |
| Visitor Management | Pending-visitor count badge | Gives residents an at-a-glance view of requests awaiting their action |
| Maintenance Billing & Fee Collection | Admin notification on proof-of-payment submission | Speeds up payment verification instead of relying on manual checks |
| Maintenance Billing & Fee Collection | Auto-generated PDF receipts | Gives residents an official record without manual admin effort |
| Maintenance Billing & Fee Collection | Saved payment methods (Payment Gateway Phase 2) | Faster repeat payments for residents |
| Maintenance Billing & Fee Collection | Automated recurring deduction (Payment Gateway Phase 2) | Removes the need for residents to remember to pay each period |
| Maintenance Billing & Fee Collection | Payment due reminders (Payment Gateway Phase 2) | Reduces late payments |
| Maintenance Billing & Fee Collection | Resident autopay opt-in/out control (Payment Gateway Phase 2) | Keeps residents in control of their own payment method |
| Maintenance Billing & Fee Collection | Selectable autopay frequency (Payment Gateway Phase 2) | Supports monthly, quarterly, or annual preferences |
| Maintenance Billing & Fee Collection | Admin oversight of autopay enrollment (Payment Gateway Phase 2) | Gives management visibility into who is on autopay, with the ability to disable it for disputes |
| Vendor & Operational Expense Management | Single consolidated vendor detail view | Gives admins one place to see everything about a vendor |
| Vendor & Operational Expense Management | Automatic monthly/annual cost equivalents | Instantly shows the true yearly cost of a recurring contract |
| Vendor & Operational Expense Management | Overdue payment notifications | Prevents vendor payments from being missed |
| Vendor & Operational Expense Management | Document preview with zoom (web + mobile) | Lets admins review invoices/contracts without leaving the app |
| Financial Reporting & Transparency | Opening balance configuration | Ensures accurate historical financial carry-forward for newly onboarded societies |
| Financial Reporting & Transparency | Scheduled email delivery of key reports | Saves admins from manually generating and distributing reports each month |
| Financial Reporting & Transparency | Non-maintenance income tracking | Captures income like hall rentals or interest, not just maintenance fees |
| Financial Reporting & Transparency | Utility bill tracking | Gives a fuller, more accurate expense picture |
| Financial Reporting & Transparency | Budget vs. actual reporting | Lets committees measure spending discipline against a plan |
| Financial Reporting & Transparency | Shareable public summary link | Makes transparency reporting easy to circulate without requiring login |
| Financial Reporting & Transparency | Automatic receipt generation | Reduces manual admin work after each payment |
| Rewards & Gamification | Competition listing | Lets residents see what's currently available |
| Rewards & Gamification | Score updates during a competition | Keeps standings current as a competition progresses |
| Rewards & Gamification | Point redemption | Turns engagement into a tangible, motivating reward |
| Rewards & Gamification | Separate event management (AGMs, cultural events) with RSVP | Supports real community events distinct from competitions |
| Rewards & Gamification | Competition notifications | Drives awareness and participation |
| Rewards & Gamification | Results broadcast | Publicly recognizes winners, reinforcing engagement |
| Rewards & Gamification | Engagement reports | Shows leadership how participation trends over time |
| Local Service Provider Marketplace | Admin approve/reject provider listing | Ensures only vetted providers are shown to residents |
| Local Service Provider Marketplace | Provider accept/decline request | Lets providers manage their own workload |
| Local Service Provider Marketplace | Provider and request detail views | Gives residents and admins full context, not just list rows |
| Local Service Provider Marketplace | Ratings and reviews | Builds resident trust in listed providers |
| Local Service Provider Marketplace | Provider pricing field | Lets residents compare cost upfront |
| Local Service Provider Marketplace | Notifications through the request lifecycle | Keeps both sides informed without manual follow-up |
| Local Service Provider Marketplace | Admin reports on marketplace activity | Gives management visibility into adoption and provider performance |
| Mobile Application | Live-activity/widget for visitor pass countdown | Keeps residents informed of an expected guest without opening the app |
| Mobile Application | Offline mutation queuing (complaints, payment proof) | Lets residents keep working without connectivity, syncing automatically once back online |
| Mobile Application | Full accessibility compliance | Ensures the app is usable by residents with disabilities |
| Platform Reliability (Cross-Cutting) | Traffic safeguards fallback | Keeps the platform responsive during unexpected usage spikes |
| Platform Reliability (Cross-Cutting) | Faster issue diagnosis | Reduces the time to find and fix a problem when it occurs |
| Platform Reliability (Cross-Cutting) | Automatic retry for notifications/email/SMS | Prevents a temporary hiccup from silently dropping a message |
| Platform Reliability (Cross-Cutting) | Automated regression testing | Catches problems before they reach residents, prior to each release |
| Platform Reliability (Cross-Cutting) | Proactive health alerts | Lets the operations team fix issues before residents notice them |

---

## 8. Business Value Summary

| Value Area | What It Enables |
|---|---|
| **Operational efficiency** | Society staff spend less time on manual bookkeeping, spreadsheets, and paper trails |
| **Financial transparency** | Residents trust the numbers because reporting is consistent, timely, and privacy-respecting |
| **Resident self-service** | Residents resolve routine needs (dues, complaints, bookings, visitors) without waiting on staff |
| **Security & accountability** | Every visitor, payment, and complaint has a clear, traceable record |
| **Scalability across societies** | The same platform can serve a single building or a portfolio of many societies, without cross-contamination of data |
| **Community engagement** | Recognition, events, and a local services marketplace deepen resident participation beyond pure administration |
| **Anywhere access** | A consistent experience across web and mobile means no one is blocked by which device they have on hand |
| **Trust in the platform itself** | Reliability safeguards and proactive monitoring mean the system is available and accurate when residents and staff need it |

---

## 9. Suggested Positioning Summary

OurHome positions itself as the digital operating system for a housing society — replacing scattered spreadsheets, paper registers, and group chats with one secure, always-available platform for residents, committees, and gate staff alike. It combines day-to-day operational tools (visitor entry, complaints, notices, amenity bookings) with serious financial rigor (billing, vendor spend, and a full suite of transparent reporting), all wrapped in a mobile-first experience. As the roadmap closes today's gaps — approvals that complete instead of stalling, automated payments, and richer community features — OurHome moves from being a management utility toward being the trusted digital heart of the community it serves.
