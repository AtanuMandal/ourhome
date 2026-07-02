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
