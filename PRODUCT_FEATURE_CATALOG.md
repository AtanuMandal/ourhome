# Product Feature Catalog

## 1. Product overview

**OurHome** is a multi-tenant apartment and housing society management platform for administrators and residents. It brings together housing operations, resident self-service, billing, communication, visitor handling, service coordination, and community engagement in a single Angular PWA backed by Azure-native services.

The product is designed to help societies replace disconnected spreadsheets, manual registers, paper notices, ad hoc payment follow-ups, and fragmented resident communication with a unified operational system.

## 2. Product goals

The application is built to support four core outcomes:

1. **Digitize housing society operations** such as apartment records, resident management, notices, complaints, visitors, and maintenance.
2. **Improve resident self-service** so users can complete common tasks without relying on manual office intervention.
3. **Increase financial visibility and control** across maintenance collections and vendor expense management.
4. **Strengthen community engagement** through rewards, competitions, and a shared communication layer.

## 3. Primary user roles

| Role | Description | Typical responsibilities |
|---|---|---|
| **HQAdmin** | Platform-level administrator | Onboard societies, manage platform-wide governance, review organizational data |
| **HQUser** | Platform-level viewer | Monitor societies and view information with limited write access |
| **SUAdmin** | Society administrator / housing officer | Manage society records, apartments, residents, operations, notices, maintenance, vendors, and services |
| **SUUser** | Resident user | Access resident self-service features such as complaints, amenities, visitors, maintenance, notices, services, and rewards |

## 4. Product experience summary

The product experience is centered around:

- **OTP-based authentication**
- **role-aware navigation**
- **admin and resident workflows in the same application**
- **mobile-friendly PWA access**
- **society-scoped multi-tenant data isolation**
- **document-backed financial workflows**
- **background processing for recurring charges and overdue follow-up**

## 5. Core product modules

| Module | Primary users | Summary |
|---|---|---|
| **Authentication & Access** | All users | Secure OTP login, verification, route protection, and role-aware access control |
| **Dashboard** | All logged-in users | Landing experience with shortcuts and recent activity |
| **Society Management** | Admin | View and manage society-level information |
| **Apartment Management** | Admin | Manage apartment inventory, occupancy, and resident assignment history |
| **Resident Management** | Admin | Maintain resident directory and profiles |
| **Amenities & Booking** | Admin, Residents | Manage amenities and allow booking workflows |
| **Complaints** | Admin, Residents | Capture and track resident issues |
| **Notice Board** | Admin, Residents | Publish and view society announcements |
| **Visitor Management** | Admin, Residents | Register and track visitors |
| **Maintenance Billing** | Admin, Residents | Configure maintenance schedules, generate charges, collect proof, and review payment status |
| **Vendor Payments** | Admin | Manage operational vendors, recurring costs, one-time costs, and vendor payment tracking |
| **Rewards & Gamification** | Admin, Residents | Show points and leaderboard-driven engagement features |
| **Services Marketplace** | Admin, Residents | List service providers and create service requests |

## 6. Detailed feature catalog

---

## 6.1 Authentication and access management

**Purpose**  
Provide a lightweight sign-in flow and enforce role-based access throughout the application.

**Primary users**  
All users

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **OTP login** | Users start authentication through a login screen and proceed to OTP verification rather than password-heavy flows. | Simplifies onboarding and reduces password-reset friction. |
| **OTP verification** | Users verify identity with a one-time code before receiving access to the application. | Adds a secure but user-friendly identity checkpoint. |
| **Protected routes** | Routes are guarded for guest-only, authenticated-only, and admin-only experiences. | Prevents unauthorized access and keeps workflows role-appropriate. |
| **Role-aware navigation** | Navigation items such as vendor payments and society administration appear only for administrators. | Reduces clutter for residents and reinforces operational boundaries. |
| **Session-based app shell** | Logged-in users access a persistent application shell with navigation and logout controls. | Creates a coherent platform experience across modules. |

---

## 6.2 Dashboard and daily workflow hub

**Purpose**  
Give users a practical starting point when they enter the system.

**Primary users**  
All logged-in users

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Personalized dashboard landing** | The dashboard acts as the default home route after sign-in. | Helps users orient quickly without searching for common tasks. |
| **Quick actions** | Users can jump directly into complaints, amenities, visitor registration, maintenance, services, and rewards. | Speeds up frequent actions and reduces navigation overhead. |
| **Recent complaints snapshot** | A compact recent-complaints section surfaces operational issues. | Improves visibility into unresolved or newly raised problems. |
| **Recent notices snapshot** | Recent announcements are visible directly on the dashboard. | Keeps residents and admins aligned on current updates. |

---

## 6.3 Society management

**Purpose**  
Maintain core society information in one place.

**Primary users**  
Admins

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Society details page** | Administrators can access a dedicated society details screen for society-level information. | Creates a central operational record for the society. |
| **Admin-restricted access** | Society management is limited to admin users. | Prevents accidental or unauthorized changes by residents. |

---

## 6.4 Apartment management

**Purpose**  
Track the physical unit inventory of the society and its resident assignment lifecycle.

**Primary users**  
Admins

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Apartment listing** | Administrators can browse the apartment inventory from a single list view. | Gives operations teams a clear view of unit records. |
| **Create apartment** | New apartment records can be added through a dedicated form. | Supports society setup and ongoing inventory expansion. |
| **Edit apartment** | Existing apartment records can be updated as conditions change. | Keeps apartment data current and reliable. |
| **Apartment detail page** | Each apartment has a dedicated detail view. | Centralizes unit-level information for follow-up workflows. |
| **Resident history** | Apartment-specific resident history can be reviewed. | Supports auditability for occupancy and ownership changes. |
| **Owner transfer** | Ownership can be transferred through a guided workflow. | Formalizes a sensitive administrative process. |
| **Tenant transfer** | Tenant assignment can be transferred independently of ownership. | Reflects real-world housing operations more accurately. |
| **Household member management** | Family members and co-occupants can be attached to an apartment. | Supports richer occupancy records beyond a single primary resident. |

---

## 6.5 Resident management

**Purpose**  
Maintain a searchable and structured resident directory for the society.

**Primary users**  
Admins

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Resident directory** | Admins can browse the resident list. | Simplifies day-to-day resident administration. |
| **Resident onboarding** | New residents can be added through a dedicated form. | Reduces manual entry and fragmented onboarding processes. |
| **Resident profile view** | Individual resident profiles can be opened from the list. | Gives admins a single place to review resident-level details. |

---

## 6.6 Amenities and facility booking

**Purpose**  
Support shared amenity management and structured booking.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Amenity catalog** | Users can browse available amenities. | Improves discoverability of common facilities. |
| **Amenity setup** | Admins can add amenities to the society catalog. | Enables structured facility administration. |
| **Amenity booking** | Residents can initiate a booking flow for a specific amenity. | Reduces manual scheduling and improves fairness in access. |

---

## 6.7 Complaint management

**Purpose**  
Provide a structured issue-reporting and follow-up process.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Raise complaint** | Residents and authorized users can submit issues through a form-based workflow. | Creates a standardized way to capture service problems. |
| **Complaint list** | Complaint records can be reviewed in a list view. | Helps users track open, ongoing, and resolved issues. |
| **Complaint detail view** | Each complaint can be opened in detail. | Supports operational follow-up and better case visibility. |

---

## 6.8 Notice board and community communication

**Purpose**  
Centralize society announcements and improve communication consistency.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Notice board** | Residents can browse published notices from a central notice screen. | Creates a single source of truth for society communication. |
| **Post notice** | Admins can publish new notices. | Replaces fragmented WhatsApp-style announcement dependency with a formal channel. |
| **Notice detail** | Individual notices can be opened for full content. | Supports detailed communication beyond short summaries. |

---

## 6.9 Visitor management

**Purpose**  
Digitize guest handling and improve traceability of visitor movement.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Visitor registration** | Visitors can be pre-registered through a dedicated form. | Improves arrival readiness and security coordination. |
| **Visitor list** | Visitor records can be reviewed from a list screen. | Gives operational visibility into visitor activity. |
| **Visitor checkout** | Active visitor records support checkout actions. | Improves auditability for visitor entry and exit. |

---

## 6.10 Maintenance billing and collections

**Purpose**  
Manage recurring maintenance obligations for apartments and give both residents and admins clear payment visibility.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Admin maintenance dashboard** | Admins access schedules, dues, charge review, and approval-oriented workflows from a single screen. | Centralizes maintenance finance operations. |
| **Resident maintenance dashboard** | Residents can review charges and submit payment proof. | Enables resident self-service and reduces office dependency. |
| **Schedule creation** | Admins can create society-wide or apartment-specific schedules. | Supports flexible maintenance charging policies. |
| **Flexible pricing models** | Maintenance schedules support fixed pricing and area-based pricing. | Adapts to different billing models used by societies. |
| **Scope-based scheduling** | Schedules can be applied across the society or to individual apartments. | Supports both broad and targeted maintenance programs. |
| **Frequency-based billing** | Schedules can recur over time rather than being entered manually each period. | Lowers recurring administrative effort. |
| **Due-day configuration** | Admins define the due day for collection. | Improves consistency in resident payment expectations. |
| **Schedule activation/inactivation** | Existing schedules can be activated or inactivated from an effective month and year. | Preserves financial history while supporting policy changes. |
| **Admin payment review** | Admin workflows support review of resident payment proof and dues. | Improves control over collections and verification. |
| **Month-wise payment grid** | Admins can view maintenance status month by month for all apartments. | Gives leadership a compact operational finance view. |

---

## 6.11 Vendor and operational expense management

**Purpose**  
Manage society vendors and operational expense obligations with the same rigor applied to resident billing.

**Primary users**  
Admins

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Vendor registry** | Admins can maintain a searchable vendor list. | Creates an organized operating record of external partners. |
| **Vendor profile management** | Vendor records include business identity, address, contact details, validity, business type, and service area. | Improves vendor governance and contract traceability. |
| **Vendor status management** | Vendors can be marked active or inactive. | Helps prevent accidental use of expired or retired vendors. |
| **Vendor document upload** | Admins can upload vendor pictures and contract files. | Keeps vendor documentation attached to the working record. |
| **Recurring cost schedules** | Admins can create recurring payment schedules for vendors by frequency and amount. | Supports planned operational expenses such as housekeeping, security, or maintenance contracts. |
| **Monthly and annual equivalents** | Recurring schedules expose derived monthly and annual cost views. | Improves budget understanding and planning. |
| **One-time vendor costs** | Admins can create ad hoc charges for non-recurring vendor expenses. | Supports emergency repairs and special one-off work. |
| **Schedule window control** | Admins can update schedule end date and inactive-from month. | Allows future cost planning to be adjusted without losing historical data. |
| **Charge register** | All generated and one-time charges can be reviewed in a vendor charge register. | Gives finance teams an actionable operating ledger view. |
| **Payment capture** | Charges can be marked paid with payment date, method, reference, notes, and receipt evidence. | Strengthens payment auditability. |
| **Charge lifecycle controls** | Charges can be activated, inactivated, or deleted. | Gives admins operational flexibility while preserving intentional control over what contributes to totals. |
| **Vendor payment grid** | Admins can view month-wise vendor costs with paid, due, and overdue visibility. | Provides a high-level finance operations dashboard for vendor obligations. |
| **Overdue monitoring** | Overdue vendor charges are highlighted and can trigger admin notification workflows. | Improves payment discipline and reduces missed obligations. |

---

## 6.12 Rewards and gamification

**Purpose**  
Promote community engagement and make participation visible.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Leaderboard** | Users can view a ranking-oriented rewards screen. | Encourages participation and healthy competition. |
| **Points page** | Residents can see their personal points. | Makes earned value visible and reinforces engagement mechanics. |

---

## 6.13 Service provider directory and service requests

**Purpose**  
Connect residents with service providers that operate within or around the society ecosystem.

**Primary users**  
Admins, Residents

**Feature descriptions**

| Feature | Description | Business value |
|---|---|---|
| **Service provider directory** | Users can browse registered providers with category and contact context. | Improves discoverability of trusted providers. |
| **Provider registration** | Admins can add new service providers through a registration form. | Allows societies to curate their service ecosystem. |
| **Provider-linked request initiation** | Residents can initiate service requests directly from the provider list. | Reduces friction between discovery and action. |
| **Service request form** | Users can submit a formal request for a provider. | Creates a structured service engagement workflow instead of informal handoffs. |

---

## 7. Cross-cutting platform capabilities

## 7.1 Multi-tenancy

| Capability | Description |
|---|---|
| **Society-scoped data isolation** | Every major business area is modeled per society, enabling multiple societies to coexist on the same platform. |
| **Role separation by scope** | Platform roles and society roles are distinct, allowing both central governance and local operations. |

## 7.2 Documents and evidence capture

| Capability | Description |
|---|---|
| **Blob-backed uploads** | Vendor pictures, contracts, receipts, and finance-related files are stored through file upload workflows. |
| **Evidence-based payment tracking** | Financial workflows support attachment of receipts and payment proof to improve audit quality. |

## 7.3 Background processing and automation

| Capability | Description |
|---|---|
| **Recurring charge generation** | Scheduled background jobs generate recurring financial charges without requiring manual monthly entry. |
| **Overdue follow-up** | Overdue vendor-payment flows support admin notification patterns. |
| **Event-driven backend design** | The backend includes outbox-based event publishing patterns aligned with an eventually consistent architecture. |

## 7.4 Progressive web application experience

| Capability | Description |
|---|---|
| **Angular standalone PWA** | The frontend is delivered as a modern Angular PWA. |
| **Mobile-friendly navigation** | The app supports side navigation and bottom navigation for responsive usage patterns. |
| **Service worker updates** | Users can be notified when a new version is available and update the app experience smoothly. |

## 8. Business value summary

From a product perspective, OurHome delivers value in five major dimensions:

| Value area | What the platform enables |
|---|---|
| **Operational control** | Centralized administration for apartments, residents, vendors, and maintenance |
| **Resident self-service** | Faster completion of common tasks such as complaints, bookings, visitor registration, and payment proof submission |
| **Financial visibility** | Better tracking of incoming maintenance collections and outgoing vendor obligations |
| **Communication quality** | Clearer society-wide notice publishing and activity visibility |
| **Community engagement** | Rewards and leaderboard experiences that make participation visible |

## 9. Suggested positioning summary

**OurHome** is a digital operations platform for apartment communities and housing societies. It combines resident administration, apartment management, maintenance billing, vendor expense control, visitor workflows, amenities, notices, complaints, service coordination, and engagement features in one multi-tenant, mobile-friendly application.
