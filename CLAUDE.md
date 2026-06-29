# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OurHome** is a multi-tenant SaaS platform for apartment/housing society management. It uses Azure cloud-native services with a .NET 8 backend and Angular 17 PWA frontend.

**User roles**: `HQAdmin` (platform admin), `HQUser` (platform viewer), `SUAdmin` (society officer), `SUUser` (resident).

---

## Local Development Setup

### Prerequisites
- .NET SDK 8.x, Azure Functions Core Tools v4
- Node.js 20.x LTS
- Cosmos DB Emulator (Windows) or Docker
- Azurite: `npm install -g azurite`

### Running locally (4 terminals)

```bash
# Terminal 1: Local blob storage emulator
azurite --silent --location C:\azurite

# Terminal 2: Cosmos DB Emulator (Windows app or Docker)

# Terminal 3: Backend API (http://localhost:7071)
cd backend/src/ApartmentManagement.Functions
func start

# Terminal 4: Frontend PWA (http://localhost:4200)
cd frontend/apartment-management
npm install && npm start
```

---

## Build Commands

### Backend

```bash
dotnet restore apartment_management.sln
dotnet build apartment_management.sln

# Production publish
dotnet publish backend/src/ApartmentManagement.Functions \
  --configuration Release --output ./publish/functions
```

### Frontend

```bash
cd frontend/apartment-management
npm run build               # Development build
npm run build:prod          # Production (includes service worker)
```

---

## Testing

Three-level pyramid in `backend_unittest/`:

```bash
# L0: Pure unit tests — domain + application logic, no I/O
dotnet test backend_unittest/ApartmentManagement.Tests.L0

# L1: Integration tests — fake Cosmos/storage, in-memory
dotnet test backend_unittest/ApartmentManagement.Tests.L1

# L2: End-to-end tests — real or emulated services
dotnet test backend_unittest/ApartmentManagement.Tests.L2

# Run a single test class or method
dotnet test backend_unittest/ApartmentManagement.Tests.L0 \
  --filter "FullyQualifiedName~ClassName.MethodName"

# All tests
dotnet test apartment_management.sln
```

Frontend tests: `cd frontend/apartment-management && npm test`

---

## Architecture

### Backend (Clean Architecture + CQRS)

```
ApartmentManagement.Domain/        # Entities, domain logic — no dependencies
ApartmentManagement.Application/   # MediatR commands/queries, DTOs, FluentValidation
ApartmentManagement.Infrastructure/ # Cosmos DB repos, Blob Storage, ACS (email/SMS)
ApartmentManagement.Functions/     # HTTP triggers, timer triggers, Event Grid outbox
ApartmentManagement.Shared/        # Shared types across layers
```

Key patterns:
- **CQRS via MediatR** — commands and queries are separate handler classes
- **Repository pattern** — Cosmos DB abstracted behind interfaces
- **Outbox pattern** — transactional event publishing to Event Grid (CloudEvents 1.0)
- **Multi-tenancy** — all Cosmos containers use `/societyId` as partition key

Authentication: JWT (HS256), validated in Functions middleware. Claims include `societyId` and `role`.

### Frontend (Angular 17 Standalone)

```
src/app/
├── core/
│   ├── models/       # TypeScript interfaces matching backend DTOs
│   ├── services/     # Feature services (api.service.ts is the base HTTP client)
│   ├── guards/       # authGuard, adminGuard, guestGuard
│   └── interceptors/ # JWT injection + global error handler
├── features/         # One folder per domain (auth, dashboard, apartments, etc.)
└── shared/components/ # Reusable UI (bottom-nav, page-header, status-chip, spinner)
```

Key patterns:
- **Standalone components only** — no NgModule
- **Signals-based state** — Angular 17 primitives, no NgRx
- **Lazy-loaded routes** — each feature is a separate chunk
- **PWA service worker** — network-first for `/api/*`, cache-first for assets

### Infrastructure

Azure resources (defined in `infra/bicep/`):
- **Azure Functions** (Consumption, .NET 8 isolated)
- **Cosmos DB** (Serverless, 17 containers, camelCase JSON)
- **Event Grid** custom topic (outbox pub/sub)
- **Storage Account** — Azurite locally; blob $web container hosts SPA in production
- **Key Vault**, **App Insights**, **Azure Communication Services**

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `backend/src/ApartmentManagement.Functions/local.settings.json` | Local emulator endpoints, JWT secret, CORS, ACS stubs |
| `backend/src/ApartmentManagement.Functions/host.json` | Functions runtime, App Insights sampling |
| `frontend/apartment-management/src/environments/` | API baseUrl per environment |
| `frontend/apartment-management/ngsw-config.json` | Service worker cache strategies |

---

## Adding a New Feature

### Backend pattern (example: new resource `X`)
1. **Domain**: Add entity in `ApartmentManagement.Domain/`
2. **Application**: Add DTOs to `ApplicationDtos.cs`, mapping to `Mappings.cs`, validation to `Validators.cs`, and a MediatR module file (e.g., `XModule.cs`) with Command/Query handlers
3. **Infrastructure**: Add a repository implementing the interface
4. **Functions**: Add HTTP trigger functions in `ApartmentManagement.Functions/Http/X/`

### Frontend pattern
1. Add TypeScript model in `core/models/`
2. Add service in `core/services/`
3. Create feature folder under `features/` with standalone component(s)
4. Register lazy route in `app.routes.ts`

---

## CI/CD

- **ci.yml** — triggers on every push/PR to `main`: build + L0/L1/L2 tests + frontend build + Bicep lint
- **cd.yml** — triggers on merge to `main` or manual dispatch: Bicep deploy → Functions zip deploy + SPA blob upload (parallel)
- Azure auth uses OIDC federated credentials (no stored secrets)

Deploy to Azure manually:
```bash
az deployment group create \
  --template-file infra/bicep/main.bicep \
  --parameters infra/bicep/parameters/dev.bicepparam
```
