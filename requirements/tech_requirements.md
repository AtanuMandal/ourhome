# Technical Requirements

## Overview
This document defines the technical standards and non-functional requirements that apply across all modules of OurHome. These govern infrastructure, deployment, security, testing, and data architecture decisions.

---

## Infrastructure

### Hosting
- API: **Azure Functions** (Consumption plan, .NET 8 isolated worker) for automatic scale-in/scale-out at minimal cost.
- Frontend: **Angular PWA** (Progressive Web App) hosted on Azure Blob Storage static website (`$web` container).
- All Azure resources are defined in **Bicep templates** under `infra/bicep/` and deployed via **GitHub Actions** (`cd.yml`).

### API Gateway
- All production API traffic routes through **Azure API Management (APIM)**.
- APIM handles SSL termination, CORS, rate limiting enforcement, and subscription key validation.
- Azure Functions are not directly internet-accessible in production (APIM is the only entry point).

### Database
- **Azure Cosmos DB** (Serverless tier) for all application data.
- Partition key: `/societyId` on all containers to enforce multi-tenancy isolation.
- Each domain entity has its own container (visitors, users, apartments, notices, complaints, etc.).
- High-read aggregation views (e.g., maintenance fee grid) use a **separate mirror container** updated on every mutation to avoid cross-partition fan-out.
- Indexes must be tuned per container — favour composite indexes on common filter fields (e.g., `societyId + status + date`).
- JSON property names stored in camelCase.

### File Storage
- **Azure Blob Storage** for all binary content: visitor photos, payment proofs, contract documents, notice attachments, visitor images.
- Local development uses **Azurite** (`azurite --silent --location C:\azurite`).
- Files are uploaded via dedicated API endpoints that return the blob URL; URLs are then stored in Cosmos.

### Messaging and Events
- Domain events are published via **Azure Event Grid** (CloudEvents 1.0 format) using the outbox pattern.
- The `OutboxPublisher` timer function reads pending events and publishes them — decoupling notifications from request handling.
- Push notifications use the **VAPID** protocol via browser push.
- Email and SMS use **Azure Communication Services (ACS)**.

### Key Vault and Secrets
- All secrets (JWT signing key, Cosmos connection string, ACS keys) are stored in **Azure Key Vault**.
- Functions read secrets via Key Vault references in application settings.
- No secrets are stored in source code or `appsettings.json` in production.

---

## Code Architecture

### Backend (Clean Architecture + CQRS)
```
ApartmentManagement.Domain/          # Entities, domain logic — zero external dependencies
ApartmentManagement.Application/     # MediatR commands/queries, DTOs, FluentValidation, interfaces
ApartmentManagement.Infrastructure/  # Cosmos DB repos, Blob Storage, ACS, JWT implementation
ApartmentManagement.Functions/       # Azure Function HTTP triggers and timer triggers
ApartmentManagement.Shared/          # Shared enums and error codes
```
- Commands mutate state; queries read state — they are separate MediatR handler classes.
- `FluentValidation` runs as a MediatR pipeline behaviour before any handler executes.
- `IRepository<T>` interfaces are in the Application layer; Cosmos implementations are in Infrastructure. This enables database swapping with no application layer changes.

### Frontend (Angular 17 Standalone)
```
src/app/
├── core/
│   ├── models/       # TypeScript interfaces matching backend DTOs
│   ├── services/     # Feature services; api.service.ts is the base HTTP client
│   ├── guards/       # authGuard, adminGuard, guestGuard, visitorGuard
│   └── interceptors/ # JWT injection, global error handler
├── features/         # One folder per domain (visitors, notices, maintenance, etc.)
└── shared/components/ # Reusable UI (bottom-nav, page-header, status-chip, spinner)
```
- Standalone components only — no NgModule.
- Signals-based reactive state (`signal()`, `computed()`) — no NgRx.
- Lazy-loaded routes — each feature is a separate chunk.
- PWA service worker: network-first for `/api/*`, cache-first for static assets.
- Any gridview should have filter and sorting built in by default .
- All user actions should be included in Side menu with role based acccess and visibility
---

## Security

- All authenticated endpoints verify the JWT on every request (Functions middleware + `ICurrentUserService`).
- JWT uses HS256 signing; key rotates via Key Vault.
- Passwords are BCrypt-hashed — raw passwords are never stored.
- Rate limiting is enforced at the APIM layer; the application layer does not implement a separate rate limiter.
  - ⚠️ **Gap:** No application-level fallback rate limiter if requests bypass APIM (e.g., during local testing or direct function invocation).
- Multi-tenancy: `societyId` in the JWT must match `societyId` in the route on every request.

---

## Testing

The test suite uses a three-level pyramid:

| Level | Location | Description | External Dependencies |
|-------|----------|-------------|----------------------|
| **L0** | `backend_unittest/ApartmentManagement.Tests.L0` | Pure unit tests — domain entities and handlers with all dependencies mocked via Moq | None |
| **L1** | `backend_unittest/ApartmentManagement.Tests.L1` | Integration tests with in-memory fake repository implementations | None |
| **L2** | `backend_unittest/ApartmentManagement.Tests.L2` | End-to-end tests against Cosmos DB Emulator and Azurite | Cosmos DB Emulator, Azurite |

### Running Tests
```bash
# L0 — pure unit, no external dependencies
dotnet test backend_unittest/ApartmentManagement.Tests.L0

# L1 — in-memory fakes, no external dependencies
dotnet test backend_unittest/ApartmentManagement.Tests.L1

# L2 — requires Cosmos DB Emulator + Azurite running
dotnet test backend_unittest/ApartmentManagement.Tests.L2

# Single test class or method
dotnet test backend_unittest/ApartmentManagement.Tests.L0 \
  --filter "FullyQualifiedName~ClassName.MethodName"

# All tests
dotnet test apartment_management.sln
```

### Frontend Tests
```bash
cd frontend/apartment-management
npm test
```

### L3 — UI Tests (Planned)
- ⚠️ **Gap:** A limited set of **Playwright** end-to-end browser tests was planned but not yet implemented.

---

## Deployment

### CI Pipeline (`ci.yml`)
Triggers on every push and pull request to `main`:
1. Restore and build the .NET solution.
2. Run L0, L1, and L2 tests.
3. Build the Angular frontend.
4. Run Bicep linting.

### CD Pipeline (`cd.yml`)
Triggers on merge to `main` or manual dispatch:
1. Deploy Bicep templates (Cosmos DB, Functions, Blob, Key Vault, Event Grid, App Insights, ACS).
2. In parallel: publish .NET Functions (zip deploy) + upload Angular SPA to Blob `$web` container.
3. Azure auth via OIDC federated credentials — no long-lived secrets stored in GitHub.

---

## Observability

- Structured logging via `ILogger<T>` in all handlers; shipped to **Azure Application Insights**.
- `host.json` configures App Insights sampling rate.
- ⚠️ **Gap:** No custom telemetry events or dependency tracking beyond standard request logging.
- ⚠️ **Gap:** No Azure Monitor alert rules for error spike, latency degradation, or outbox backlog.

---

## Eventual Consistency

- Charge creation, outbox publishing, and notification delivery are eventual — the main request returns after writing to Cosmos; the outbox function publishes the event asynchronously.
- Push notifications may be delivered seconds after the triggering action.
- The outbox pattern guarantees at-least-once delivery; handlers must be idempotent where applicable.

---

## Acceptance Criteria
- L0 and L1 tests pass with no external services running.
- L2 tests pass with Cosmos DB Emulator and Azurite running locally.
- All secrets in production are in Key Vault; no plaintext secrets in source code or config files.
- All API traffic in production routes through APIM.
- Cosmos containers use `/societyId` as partition key.
- Repository interfaces are in the Application layer; Cosmos implementations are in Infrastructure.

---

## Future / Planned

> 🔜 **Playwright L3 UI tests** — critical-path browser tests (login → view notices → raise complaint → pay maintenance fee) to catch regressions at the UI level.

> 🔜 **Application-level rate limiting** — `RateLimitBehavior` MediatR pipeline behaviour or Azure Functions middleware as a fallback if traffic bypasses APIM.

> 🔜 **Retry policies** — Polly-based retry with exponential backoff for ACS (email, SMS) and Event Grid publish operations.

> 🔜 **Distributed tracing** — correlation ID injection and App Insights custom telemetry for key business operations (visitor registration, payment submission, etc.).

> 🔜 **Azure Monitor alerts** — alert rules for function error rate, outbox backlog size, and p95 API latency.

---

## Mobile Application — React Native (Android & iOS)

### Overview

The OurHome mobile app is a companion to the Angular PWA, targeting the same four user roles (`HQAdmin`, `HQUser`, `SUAdmin`, `SUUser`, `SUSecurity`) with the same backend API. It adds three native capabilities that are impractical in a browser: **biometric authentication**, **device push notifications** (FCM + APNs), and **direct camera capture with upload**. The app is built with **React Native 0.75+** (New Architecture, Bridgeless) using the **Expo SDK 52** managed-to-bare workflow with **EAS Build** for distribution.

The mobile client is a read-write peer to the PWA — not a stripped-down viewer. Every feature available to a role in the web app must be available in the mobile app.

---

### Technology Choices

| Concern | Library / Tool | Rationale |
|---|---|---|
| Framework | React Native 0.75 + Expo SDK 52 | Broadest native API coverage via Expo modules; EAS Build for CI |
| Language | TypeScript (strict mode) | Consistency with Angular frontend; catches API contract drift early |
| Navigation | React Navigation 7 (Native Stack + Bottom Tabs) | De-facto standard; native animations; deep-link support |
| Server state | TanStack Query v5 | Cache, background refresh, optimistic updates; mirrors web patterns |
| Client state | Zustand | Minimal boilerplate; TypeScript-first; replaces Context for auth/theme/permissions |
| Styling | NativeWind v4 (Tailwind CSS for RN) | Mirrors Tailwind token vocabulary; no runtime JS overhead |
| Biometrics | `expo-local-authentication` | Face ID / Touch ID / Fingerprint; single API for both platforms |
| Secure storage | `expo-secure-store` | iOS Keychain / Android Keystore; tokens never in AsyncStorage |
| Push notifications | `expo-notifications` + FCM + APNs | Unified API; handles foreground, background, and killed-app states |
| Camera | `expo-camera` + `expo-image-picker` | Capture and gallery; used for visitor photos, payment proof, profile |
| Image processing | `expo-image-manipulator` | Resize and compress before upload; enforces ≤ 1 MB cap |
| File upload | `expo-file-system` + `fetch` multipart | Streams files to the existing blob upload endpoints |
| Offline detection | `@react-native-community/netinfo` | Shows a banner and queues mutations when offline |
| Persisted cache | `@react-native-async-storage/async-storage` | TanStack Query `persistQueryClient` hydrates cache on cold start |
| Analytics | Azure App Insights (via REST) | Reuses existing observability stack |
| Testing | Jest + React Native Testing Library | Unit and component tests |
| E2E testing | Detox | Runs on iOS Simulator and Android Emulator in CI |
| Distribution | EAS Build + EAS Submit | TestFlight (iOS) and Play Store (Android) |

---

### Project Structure

```
mobile/
├── app.json                      # Expo config (bundle IDs, permissions, plugins)
├── eas.json                      # EAS Build profiles (dev, preview, production)
├── babel.config.js
├── tsconfig.json
│
└── src/
    ├── api/
    │   ├── client.ts             # Axios instance — base URL, JWT injection interceptor,
    │   │                         #   401 → token refresh → retry logic
    │   ├── endpoints/            # One file per domain (visitors.ts, maintenance.ts, …)
    │   └── types/                # TypeScript interfaces mirroring backend DTOs
    │       └── index.ts          # Re-exports from domain-specific type files
    │
    ├── auth/
    │   ├── AuthProvider.tsx      # Zustand-backed context; exposes login / logout / refresh
    │   ├── biometric.ts          # Biometric availability check, prompt, and fallback
    │   ├── tokenStore.ts         # SecureStore read/write helpers; never exposes raw token
    │   └── useAuth.ts            # Hook wrapping AuthProvider context
    │
    ├── features/                 # One folder per business domain
    │   ├── dashboard/
    │   │   ├── DashboardScreen.tsx
    │   │   └── useDashboard.ts
    │   ├── visitors/
    │   │   ├── VisitorListScreen.tsx
    │   │   ├── VisitorRegisterScreen.tsx
    │   │   ├── VisitorPassScreen.tsx
    │   │   └── hooks/
    │   ├── maintenance/
    │   ├── notices/
    │   ├── complaints/
    │   ├── apartments/
    │   ├── residents/
    │   ├── amenities/
    │   ├── financial-report/
    │   ├── vendor-payments/
    │   └── profile/
    │
    ├── navigation/
    │   ├── RootNavigator.tsx     # Auth gate: shows AuthStack or AppTabs
    │   ├── AuthStack.tsx         # Login, forgot-password, invite-accept screens
    │   ├── AppTabs.tsx           # Role-aware bottom tab configuration
    │   ├── AdminStack.tsx        # SUAdmin / HQ nested stack inside tabs
    │   ├── ResidentStack.tsx     # SUUser nested stack inside tabs
    │   ├── SecurityStack.tsx     # SUSecurity nested stack
    │   └── linking.ts            # Deep-link URL scheme (ourhome://)
    │
    ├── notifications/
    │   ├── NotificationProvider.tsx   # Registers token, listens for incoming events
    │   ├── notificationRouter.ts      # Routes tap-action to the correct screen
    │   └── useNotifications.ts
    │
    ├── camera/
    │   ├── CameraCapture.tsx          # Full-screen capture modal (visitor, proof, profile)
    │   ├── ImagePicker.tsx            # Gallery picker wrapper
    │   ├── imageUpload.ts             # Compress → upload → return blob URL
    │   └── useCamera.ts
    │
    ├── store/
    │   ├── authStore.ts               # Zustand: token, user, societyId
    │   ├── notificationStore.ts       # Zustand: unread count, queued events
    │   └── networkStore.ts            # Zustand: isOnline, pendingMutations
    │
    ├── shared/
    │   ├── components/
    │   │   ├── PageHeader.tsx
    │   │   ├── StatusChip.tsx
    │   │   ├── EmptyState.tsx
    │   │   ├── LoadingOverlay.tsx
    │   │   ├── OfflineBanner.tsx
    │   │   ├── BottomSheet.tsx        # @gorhom/bottom-sheet
    │   │   ├── SearchableSelect.tsx
    │   │   └── CurrencyText.tsx
    │   ├── hooks/
    │   │   ├── useDebounce.ts
    │   │   ├── useInfiniteList.ts     # Wraps TanStack Query infinite scroll
    │   │   └── useSocietyId.ts        # Reads societyId from authStore
    │   └── utils/
    │       ├── currency.ts            # ₹ formatting helpers
    │       ├── date.ts                # Indian locale date helpers
    │       └── errors.ts             # API error normalisation
    │
    └── theme/
        ├── colors.ts                  # Tokens matching the web design system
        ├── typography.ts
        └── spacing.ts
```

**Rules:**
- Every screen lives in a `features/<domain>/` folder; no screens in `navigation/`.
- No direct API calls from components — all server state goes through a `use<Feature>.ts` hook backed by TanStack Query.
- No `any` types; `strict: true` in `tsconfig.json`.
- No business logic in components — components render and dispatch; hooks own state and mutations.

---

### Authentication Flow

#### Initial Login

```
App launch
  └── tokenStore.getToken()
        ├── null → AuthStack (Login screen)
        │     └── POST /auth/login → store JWT in SecureStore → AppTabs
        └── found → validate expiry
              ├── valid  → prompt biometric (if enrolled) → AppTabs
              └── expired → POST /auth/refresh → update SecureStore → AppTabs
                            └── refresh fails → AuthStack
```

#### Biometric Authentication

- On first login the user is offered "Enable biometric login". If accepted, the JWT is stored in `expo-secure-store` under a biometric-protected key.
- On subsequent launches `expo-local-authentication.authenticateAsync()` is called. Success unlocks the stored token; failure (3 attempts) falls back to password.
- Biometric type is auto-detected: Face ID on face-capable iOS devices, Touch ID otherwise, Fingerprint/Face Unlock on Android.
- The biometric prompt appears on every cold start and after the app returns from background for more than 5 minutes.

```typescript
// auth/biometric.ts (outline)
export async function authenticateWithBiometric(): Promise<boolean> {
  const supported = await LocalAuthentication.hasHardwareAsync();
  const enrolled  = await LocalAuthentication.isEnrolledAsync();
  if (!supported || !enrolled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage:     'Verify your identity',
    cancelLabel:       'Use password',
    disableDeviceFallback: false,
  });
  return result.success;
}
```

#### Token Storage Contract

| What | Where | Why |
|---|---|---|
| JWT access token | `expo-secure-store` (biometric-protected key) | Keychain / Keystore; never in JS memory longer than needed |
| Refresh token | `expo-secure-store` (standard key) | Separate key; rotated on each use |
| User profile + societyId | Zustand `authStore` (in-memory) | Lost on kill; rehydrated from SecureStore on launch |

---

### Push Notifications

#### Registration Flow

1. On first launch after login, `expo-notifications.requestPermissionsAsync()` prompts the user.
2. On grant, `getExpoPushTokenAsync()` or the native FCM/APNs token is retrieved.
3. Token is `POST`-ed to `POST /societies/{societyId}/users/{userId}/push-subscriptions` (existing endpoint used by the PWA's VAPID flow — a new mobile variant will be added).
4. Token is re-registered on app upgrade or OS notification setting change.

#### Notification Types and Deep Links

| Event | Notification Body | Deep Link Target |
|---|---|---|
| Maintenance charge due | "Your ₹X maintenance for May is due on the 5th." | `/maintenance/charges/{id}` |
| Payment approved | "Your payment for April has been confirmed." | `/maintenance/charges/{id}` |
| Visitor pending approval | "John Doe is at the gate. Approve?" | `/visitors/{id}` — with approve/deny action buttons |
| New notice posted | "Notice: {title}" | `/notices/{id}` |
| Complaint status change | "Your complaint is now In Progress." | `/complaints/{id}` |
| Vendor payment due | "₹X due to CleanSphere by 30 Apr." | `/vendor-payments/{id}` |

#### Action Buttons (Visitor Approval)

Android and iOS both support interactive notification actions. The visitor pending notification carries two actions:

```typescript
await Notifications.setNotificationCategoryAsync('VISITOR_REQUEST', [
  { identifier: 'APPROVE', buttonTitle: 'Approve', options: { isDestructive: false } },
  { identifier: 'DENY',    buttonTitle: 'Deny',    options: { isDestructive: true  } },
]);
```

The background task handler calls `PATCH /societies/{sid}/visitors/{id}/approve` or `/deny` without the user opening the app.

#### Backend Integration

The existing `OutboxPublisher` function publishes domain events to Event Grid. A new **`MobilePushPublisher`** subscriber function will:
1. Subscribe to the same Event Grid events already used for VAPID push.
2. Fan out to registered FCM (Android) and APNs (iOS) tokens via **Firebase Admin SDK** (server-side FCM v1 API) and the **APNs HTTP/2 provider API**, both running as Azure Functions.
3. Token cleanup: `410 Gone` responses from FCM/APNs remove the stale registration from Cosmos.

---

### Camera and Image Upload

All three image upload surfaces (visitor photo at gate, payment proof, profile picture) share the same component and upload pipeline.

#### Capture Flow

```
CameraCapture modal
  ├── Source selection: [Camera] [Gallery]
  │     ├── Camera  → expo-camera full-screen preview → capture JPEG
  │     └── Gallery → expo-image-picker → pick from library
  ├── Preview + crop (expo-image-manipulator)
  ├── Compress to ≤ 800 px longest side, quality 0.75 (JPEG)
  │     → enforces ≤ 1 MB upload cap
  ├── POST multipart/form-data to /societies/{sid}/files/upload
  │     → returns { blobUrl: string }
  └── blobUrl passed back to calling screen's form field
```

#### Permissions

Declared in `app.json` and requested at runtime before first use:

```json
{
  "plugins": [
    ["expo-camera",       { "cameraPermission": "OurHome needs your camera to capture visitor photos and payment proofs." }],
    ["expo-image-picker", { "photosPermission": "OurHome needs access to your photos to upload payment proofs." }]
  ]
}
```

Permissions are requested **at the point of use** (not on app launch) to maximise grant rate.

---

### Navigation Architecture

```
RootNavigator
├── AuthStack              (unauthenticated)
│   ├── LoginScreen
│   ├── ForgotPasswordScreen
│   └── InviteAcceptScreen
│
└── AppTabs                (authenticated — tabs differ by role)
    │
    ├── [SUAdmin tabs]
    │   ├── Dashboard       → DashboardStack
    │   ├── Residents       → ResidentsStack
    │   ├── Maintenance     → MaintenanceStack
    │   ├── Reports         → FinancialReportStack
    │   └── More            → MoreStack (visitors, complaints, notices, society, profile)
    │
    ├── [SUUser tabs]
    │   ├── Home            → DashboardStack
    │   ├── Visitors        → VisitorsStack
    │   ├── Maintenance     → MaintenanceStack (own apartment only)
    │   ├── My Statement    → FinancialStatementStack
    │   └── More            → MoreStack (notices, complaints, amenities, profile)
    │
    └── [SUSecurity tabs]
        ├── Gate            → VisitorRegisterStack
        ├── Visitors        → VisitorListStack
        ├── Residents       → ResidentsStack (read-only)
        └── More            → MoreStack (complaints, notices, profile)
```

- All stacks use `createNativeStackNavigator` for native-platform transitions.
- Deep links (`ourhome://`) map to the same screen hierarchy using `linking.ts`.
- The `More` tab renders a menu list screen — avoids overwhelming the tab bar.

---

### Offline Strategy

| Scenario | Behaviour |
|---|---|
| Read data, device online | TanStack Query fetches; stale-while-revalidate; cached data shown instantly |
| Read data, device offline | Persisted TanStack Query cache served from AsyncStorage; `OfflineBanner` shown |
| Mutation (raise complaint, submit payment proof), device online | Normal API call |
| Mutation, device offline | Action blocked with inline message: "You are offline — this action requires a connection." No silent queue (avoids stale data confusion on retry) |
| Returns online | `netInfo` event triggers `queryClient.invalidateQueries()` to refresh all active queries |

---

### Role-Based Access Control

The mobile app reads the `role` claim from the JWT (same as the web app). Each Navigator, screen, and API call enforces role requirements:

```typescript
// shared/hooks/useRequireRole.ts
export function useRequireRole(...allowed: UserRole[]) {
  const role = useAuthStore(s => s.user?.role);
  if (!allowed.includes(role!)) {
    throw new Error(`Role ${role} is not authorised for this screen.`);
  }
}
```

Screens that are unauthorised for the current role are excluded from the navigator config entirely — they are not rendered as hidden routes.

---

### Security Hardening

| Concern | Measure |
|---|---|
| Token storage | `expo-secure-store` only; never `AsyncStorage`, `MMKV`, or JS memory across renders |
| Certificate pinning | `react-native-ssl-pinning` pinned to the Azure API Management certificate in production builds |
| Screenshot prevention | `expo-screen-capture.preventScreenCaptureAsync()` enabled on screens showing financial data and visitor passes |
| Jailbreak / root detection | `jail-monkey` at startup; if detected, warn the user and restrict sensitive operations |
| Obfuscation | Hermes engine + Metro minification in production; ProGuard rules for Android |
| Biometric downgrade | If biometric is removed from the device OS, the stored token is invalidated and the user must re-login with password |

---

### Testing Strategy

#### Unit and Component Tests (Jest + RNTL)

```
mobile/__tests__/
├── auth/
│   ├── biometric.test.ts         # Mock expo-local-authentication; test fallback paths
│   └── tokenStore.test.ts
├── features/
│   ├── visitors/
│   │   └── VisitorRegisterScreen.test.tsx
│   └── maintenance/
│       └── MaintenanceScreen.test.tsx
└── shared/
    └── components/
```

Coverage requirement: ≥ 70 % on `src/` excluding generated types.

#### E2E Tests (Detox)

```
mobile/e2e/
├── auth.e2e.ts           # Login → biometric unlock → logout
├── visitor.e2e.ts        # Register visitor → approve → check in → check out
├── maintenance.e2e.ts    # View charges → submit payment proof
└── notification.e2e.ts   # Receive test push → tap → land on correct screen
```

Detox runs on:
- iOS Simulator (iPhone 15, iOS 17) in CI
- Android Emulator (Pixel 7, API 34) in CI
- Physical devices in pre-release stage

---

### CI/CD Pipeline

#### EAS Build Profiles (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "API_BASE_URL": "http://localhost:7071/api" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "API_BASE_URL": "https://api-dev.greenvalley.in/api" }
    },
    "production": {
      "distribution": "store",
      "env": { "API_BASE_URL": "https://api.greenvalley.in/api" }
    }
  }
}
```

#### GitHub Actions — Mobile CI (`mobile-ci.yml`)

Triggers on push/PR to `main` where `mobile/**` files change:
1. `npm ci` in `mobile/`
2. `npx tsc --noEmit` — TypeScript check
3. `npm test -- --coverage` — Jest
4. `npx detox build --configuration ios.sim` + `npx detox test` — E2E on iOS Simulator
5. `npx detox build --configuration android.emu` + `npx detox test` — E2E on Android Emulator

#### GitHub Actions — Mobile CD (`mobile-cd.yml`)

Triggers on merge to `main` or manual dispatch:
1. `eas build --platform all --profile production --non-interactive`
2. `eas submit --platform ios` → TestFlight
3. `eas submit --platform android` → Play Store internal track

---

### Feature Parity Matrix

| Feature | PWA | Mobile |
|---|---|---|
| Login / logout | ✅ | ✅ |
| Biometric login | ❌ | ✅ Native |
| Push notifications | ✅ VAPID | ✅ FCM + APNs |
| Visitor registration + QR | ✅ | ✅ |
| Camera capture (visitor photo) | ✅ Browser | ✅ Native |
| Payment proof upload/preview | ✅ Browser | ❌ Not implemented — mobile maintenance screen is a read-only charge/status list with no proof upload or preview |
| Maintenance charges | ✅ | ✅ View only (no proof upload) |
| Financial reports | ✅ incl. Society Ledger | ✅ incl. Society Ledger |
| Vendor payments | ✅ (charges only; picture/contract upload has no preview) | ✅ View only (no document/picture display) |
| Notices | ✅ | ✅ |
| Complaints | ✅ | ✅ |
| Amenity booking | ✅ | ✅ |
| Resident / user management | ✅ | ✅ |
| Apartment management | ✅ | ✅ |
| Society settings | ✅ | ✅ |
| Offline read | ✅ SW cache | ✅ Persisted TQ |
| Deep links from notification | ✅ | ✅ |

---

### Acceptance Criteria

- App launches and reaches the dashboard within 2 seconds on a mid-range Android device (Pixel 6a) on a 4G connection.
- Biometric prompt appears on every cold start and after 5 minutes of backgrounding.
- Push notification received within 5 seconds of the triggering backend event in a test environment.
- Visitor approval via notification action button (without opening the app) succeeds and reflects in the visitor list on next foreground.
- Camera capture compresses to ≤ 1 MB and the blob URL is stored in Cosmos within 3 seconds on Wi-Fi.
- All L0-equivalent Jest tests pass with no network calls; all Detox E2E tests pass on both platforms.
- No JWT or sensitive data written to `AsyncStorage`, logs, or crash reports.
- App Store and Play Store builds produced from `main` branch via EAS without manual Xcode / Android Studio intervention.

---

### Future / Planned (Mobile)

> 🔜 **Expo Router** — file-system-based routing (evaluate when Expo Router v4 reaches stable; removes `navigation/` boilerplate entirely).

> 🔜 **Widgets** — iOS 17 Live Activities and Android 14 Dynamic Island equivalents for active visitor pass countdown.

> 🔜 **QR scanner** — `expo-barcode-scanner` to scan visitor QR codes at the gate without typing the pass code.

> 🔜 **Offline mutations** — `react-query-offline-manager` to queue complaint submissions and payment proof uploads while offline, replaying on reconnect.

> 🔜 **Accessibility** — full VoiceOver (iOS) and TalkBack (Android) compliance; minimum touch target 44×44 pt.
