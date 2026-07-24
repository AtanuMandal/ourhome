# Architecture

## Overview
OurHome is a multi-tenant SaaS platform for apartment society management. The architecture follows cloud-native, serverless-first principles on Azure with a strong emphasis on security, observability, cost efficiency, and extensibility.

---

## Core Principles

### 1. Serverless API on Azure Functions
- All API endpoints are implemented as Azure Functions (Consumption plan, .NET 8 isolated worker).
- Functions provide built-in auto-scaling (scale-in/scale-out) without infrastructure management.
- The function host is configured in `host.json`; secrets and connection strings are in `local.settings.json` for local development and Azure Key Vault references in production.

### 2. API Gateway via Azure API Management (APIM)
- All incoming HTTP requests (except local debugging) are routed through **Azure API Management (APIM)**.
- APIM handles: SSL termination, rate limiting enforcement, request routing, CORS policies, and API versioning.
- Functions are not exposed directly to the internet in production; they sit behind the APIM subscription key.
- ⚠️ **Gap:** APIM policy configuration and subscription-key enforcement are infrastructure concerns defined in Bicep templates; rate limiting middleware at the application code level is not implemented.

### 3. Database — Azure Cosmos DB
- All data is stored in **Azure Cosmos DB** (Serverless tier for cost efficiency).
- Multi-tenancy is enforced via `/societyId` as the partition key on all containers.
- Each domain entity has its own Cosmos container.
- The repository pattern abstracts all DB access — the application layer depends on interfaces (`IVisitorLogRepository`, `IUserRepository`, etc.) not on Cosmos SDK directly. This makes database swaps possible.
- Indexes must be tuned per-container to keep RU costs low (favour composite indexes on common filter fields).
- All JSON properties stored in camelCase (Cosmos serialiser is configured accordingly).
- ✅ **Implemented:** Separate grid/view containers for data that requires expensive cross-partition reads (e.g., maintenance fee grid is mirrored to a dedicated container).

### 4. File Storage — Azure Blob Storage
- Binary files (visitor photos, payment proofs, contract documents, notice attachments, society branding) are stored in **Azure Blob Storage**.
- Locally, **Azurite** (`azurite --silent --location C:\azurite`) emulates Blob Storage.
- The `IFileStorageService` interface abstracts all blob operations; the implementation is in the Infrastructure layer.
- Containers are either authenticated-only (maintenance proofs, vendor documents) or publicly readable (`visitor-images`, `profile-pictures`, `society-logos`, `society-backgrounds` — see `FileContainers.PubliclyReadable`), the latter for content a plain `<img>`/CSS `background-image` or native mobile `Image` view needs to render without attaching a JWT header. All use unguessable GUID blob names.

### 5. Multi-Tenancy
- Every API route that operates on society data includes `societyId` as a path segment: `/api/societies/{societyId}/...`
- The `ICurrentUserService` extracts `societyId`, `userId`, `role`, and `apartmentId` from the JWT on every request.
- Application layer handlers validate that the `societyId` in the route matches the `societyId` in the user's token.

### 6. Authentication and Security
- Authentication uses **JWT (HS256)** tokens signed with a secret stored in Key Vault.
- JWT claims: `sub` (userId), `email`, `role`, `societyId`, `apartmentId` (for `SUUser`), `jti`, expiry.
- All sensitive endpoints validate the JWT in the Functions middleware before the handler runs.
- The `ICurrentUserService` is resolved from the JWT on every request — no session state is maintained server-side.
- Password hashing uses BCrypt (industry-standard one-way hashing).
- Invite tokens are short-lived JWT tokens with a `type=invite` claim, used for the self-registration flow.
- ⚠️ **Gap:** Application-level rate limiting (per-user or per-society) is not implemented in code. Rate limiting is expected to be enforced at the APIM layer; no fallback rate limiter exists in the functions themselves.

### 7. Event-Driven Architecture — Outbox Pattern
- The application uses an **outbox pattern** for reliable event publishing.
- Domain events (`IEventPublisher`) are written transactionally alongside the entity mutation.
- An `OutboxPublisherFunction` (timer-triggered) reads pending events from the outbox container and publishes them to **Azure Event Grid** (CloudEvents 1.0 format).
- Event Grid subscribers (currently push notifications via `INotificationService`) consume events asynchronously.
- This ensures at-least-once delivery and decouples notification side-effects from the main request path.

### 8. Push Notifications
- Web push notifications use the **VAPID** protocol.
- `PushSubscriptionFunctions` manages browser push subscriptions (save/delete VAPID public key exchange).
- `INotificationService.SendPushNotificationAsync` sends push payloads to stored subscriptions.
- SMS notifications go through **Azure Communication Services (ACS)**.
- Email notifications go through the **Brevo transactional email API** (`POST https://api.brevo.com/v3/smtp/email`, authenticated with an `api-key` header — `Infrastructure:BrevoApiKey` setting), via `IEmailSender`/`BrevoEmailSender`, registered directly in `Program.cs` as a typed `HttpClient` so the transport is independently dependency-injectable and swappable without touching `INotificationService`'s SMS/push logic.
- **OTP delivery fallback:** if no SMS provider is configured (`INotificationService.IsSmsConfigured` is false), every OTP-sending path (account creation, resend, email- and phone-based OTP login) sends the OTP to the user's email instead of SMS — see `requirements/UserAndAccess.md`.

### 9. Clean Architecture + CQRS
```
ApartmentManagement.Domain/          # Entities and domain logic — zero external dependencies
ApartmentManagement.Application/     # MediatR commands/queries, DTOs, FluentValidation, interfaces
ApartmentManagement.Infrastructure/  # Cosmos DB repos, Blob Storage, ACS, JWT implementation
ApartmentManagement.Functions/       # Azure Functions (HTTP triggers, timer triggers)
ApartmentManagement.Shared/          # Shared enums and error codes used across layers
```
- Commands mutate state; queries read state. They are separate MediatR handler classes.
- `FluentValidation` validators run via MediatR pipeline behaviour before any handler executes.
- Logging behaviour (`LoggingBehavior`) wraps every handler for structured request/response logging.

### 10. Observability
- All handlers use `ILogger<T>` for structured logging. Logs are shipped to **Azure Application Insights** in production.
- ⚠️ **Gap:** No distributed tracing correlation IDs are injected at the function level. App Insights request tracking is configured in `host.json` but custom telemetry instrumentation (custom events, dependency tracking) is not in place.
- ⚠️ **Gap:** No alerting rules (e.g., Azure Monitor alerts on error rate, latency, or failed outbox events) are configured in the Bicep templates.

### 11. Infrastructure as Code
- All Azure resources are defined in **Bicep templates** under `infra/bicep/`.
- **Deployment is automated via GitHub Actions** (`ci.yml` for build/test, `cd.yml` for deploy).
- Azure auth uses OIDC federated credentials — no long-lived secrets stored in GitHub.
- Resources include: Azure Functions, Cosmos DB, Event Grid topic, Blob Storage, Key Vault, App Insights, ACS.

### 12. Resilience
- ⚠️ **Gap:** No **retry policies** (e.g., Polly) are configured for outbound HTTP calls or Cosmos DB SDK operations. The Cosmos DB SDK has built-in retry for transient errors, but ACS and Event Grid calls have no explicit retry logic in the application code.

### 13. Extensibility
- The repository pattern and interface-driven design allow swapping Cosmos DB for another store without touching the application layer.
- Adding an API gateway (APIM) or Redis cache layer requires only infrastructure changes and an additional `ICacheService` implementation — no application code changes.

---

## Test Architecture

The test suite follows a three-level pyramid under `backend_unittest/`:

| Level | Project | Description |
|-------|---------|-------------|
| **L0** | `ApartmentManagement.Tests.L0` | Pure unit tests — domain entities and application command/query handlers with all dependencies mocked. No I/O, no network, no DB. |
| **L1** | `ApartmentManagement.Tests.L1` | Integration tests with fake in-memory repository implementations. Tests handler behaviour against realistic data scenarios without external services. |
| **L2** | `ApartmentManagement.Tests.L2` | End-to-end tests against real (emulated) Cosmos DB and Azurite blob storage. Tests the full stack from MediatR command to DB persistence. |

- All tests must be runnable without external services at L0 and L1.
- L2 tests require Cosmos DB Emulator or Docker.
- ⚠️ **Gap:** **Playwright UI tests (L3)** — a limited set of end-to-end browser tests was planned but not implemented.

---

## Local Development

```bash
# Terminal 1: Azurite (blob storage emulator)
azurite --silent --location C:\azurite

# Terminal 2: Cosmos DB Emulator (Windows app or Docker container)

# Terminal 3: Backend API
cd backend/src/ApartmentManagement.Functions
func start

# Terminal 4: Angular frontend
cd frontend/apartment-management
npm install && npm start
```

---

## Acceptance Criteria
- All traffic in production routes through APIM.
- Cosmos DB uses `/societyId` partition key on all containers.
- Repository interfaces are in the Application layer; implementations in Infrastructure.
- Domain events are published via the outbox pattern, not inline in handlers.
- JWT tokens are verified on every authenticated request; claims are not trusted from the request body.
- L0 and L1 tests pass with no external services running.

---

## Future / Planned

> 🔜 **Application-level rate limiting** — implement a `RateLimitBehavior` MediatR pipeline behaviour (or Azure Functions middleware) as a fallback in case requests bypass APIM. Rate limits should be configurable per society and per user.

> 🔜 **Distributed tracing** — inject correlation IDs into all requests and propagate through event handlers; use App Insights custom telemetry for key business operations.

> 🔜 **Retry policies** — add Polly-based retry with exponential backoff for ACS (email/SMS) and Event Grid publish operations.

> 🔜 **Playwright L3 tests** — a minimal set of critical-path browser tests (login → view notices → raise complaint) to catch regressions at the UI level.

> 🔜 **Alerting** — Azure Monitor alert rules for error spike, outbox backlog, and latency P95 thresholds, defined in Bicep.
