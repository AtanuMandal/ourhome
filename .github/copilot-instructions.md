# Copilot Instructions — Apartment Management System

## Architecture

Full-stack Azure-native application:

- **Backend**: Azure Functions v4 (.NET 8 isolated worker) + Azure Cosmos DB + Azure Event Grid
- **Frontend**: Angular 17+ PWA (`frontend/apartment-management/`)
- **Infrastructure**: Bicep templates (`infra/`)
- **Solution file**: `apartment_management.sln`

### Backend Layer Breakdown

```
ApartmentManagement.Domain        — Entities, enums, domain events, repository interfaces
ApartmentManagement.Application   — CQRS handlers (MediatR), validators, pipeline behaviors, mappings
ApartmentManagement.Infrastructure — Cosmos DB repositories, JWT, notifications, outbox publisher
ApartmentManagement.Functions     — Azure Functions HTTP triggers (the API surface)
ApartmentManagement.Shared        — Result<T>, PagedResult, ErrorCodes, exceptions
```

### CQRS / Module Pattern

Every domain area has a single `*Module.cs` file in `ApartmentManagement.Application/` that contains **commands, queries, and their handlers** in one place.

- Namespaces: `ApartmentManagement.Application.Commands.<Domain>` and `ApartmentManagement.Application.Queries.<Domain>`
- The legacy `*Handlers.cs` and `*Commands.cs` files exist but are wrapped in `#if false` — **do not edit them**.
- Validators live in `Validators.cs`; one `AbstractValidator<TCommand>` per command, registered automatically via `AddValidatorsFromAssembly`.

**MediatR pipeline order**: `LoggingBehavior` → `ValidationBehavior` (FluentValidation) → `AuthorizationBehavior` → Handler

To require roles on a command, implement `IAuthorizedRequest`:
```csharp
public record MyCommand(...) : IRequest<Result<MyResponse>>, IAuthorizedRequest
{
    public IReadOnlyList<string> RequiredRoles => [HqConstants.HQAdmin];
}
```

### Multi-Tenancy

`SocietyId` is the Cosmos DB partition key on **every container**. All repository methods accept `societyId` as an explicit parameter. Every entity inherits `BaseEntity.SocietyId`.

### Domain Entities

- All entities extend `BaseEntity` (provides `Id`, `SocietyId`, `CreatedAt`, `UpdatedAt`, `ETag`, domain event list).
- Use **static factory methods** — never `new`: `Society.Create(...)`, `User.Create(...)`, etc.
- Domain events: call `AddDomainEvent(evt)` inside the entity, then publish and clear in the handler:
  ```csharp
  foreach (var evt in entity.DomainEvents) await eventPublisher.PublishAsync(evt, ct);
  entity.ClearDomainEvents();
  ```

### Outbox Pattern

`IEventPublisher` writes to the `outbox` Cosmos container. `OutboxPublisherFunction` uses a Cosmos DB Change Feed trigger to relay records to Azure Event Grid as CloudEvents. Locally, Event Grid keys are blank and publishing is skipped gracefully.

### Result Pattern

Handlers return `Result<T>` from `ApartmentManagement.Shared.Models`:
```csharp
return Result<T>.Success(value);
return Result<T>.Failure(ErrorCodes.NotFound, "Society not found.");
```

The `ToActionResult(int successStatus)` extension in `HttpHelpers` maps error codes to HTTP status codes automatically.

### Role Hierarchy

| Role | Description |
|------|-------------|
| `HQAdmin` | Platform admin — creates societies |
| `HQUser` | Platform viewer — read-only |
| `SUAdmin` | Housing Officer — manages one society |
| `SUUser` | Resident within a society |

### Frontend

Angular 17+ standalone components, signals, lazy routes. Feature modules are under `src/app/features/` (amenities, apartments, auth, complaints, dashboard, fees, gamification, notices, residents, services, society, visitors). JWT is attached via `auth.interceptor.ts`.

---

## Build & Run

### Backend

```bash
# Restore and build
dotnet restore apartment_management.sln
dotnet build apartment_management.sln

# Run the Functions host (needs Azurite + Cosmos DB Emulator running first)
cd backend/src/ApartmentManagement.Functions
func start
# API available at http://localhost:7071/api/
```

### Frontend

```bash
cd frontend/apartment-management
npm install
npm start
# Dev server at http://localhost:4200, proxies to http://localhost:7071/api
```

---

## Tests

```bash
# All tests
dotnet test apartment_management.sln

# By level
dotnet test backend_unittest/ApartmentManagement.Tests.L0   # Unit tests
dotnet test backend_unittest/ApartmentManagement.Tests.L1   # Integration (fakes)
dotnet test backend_unittest/ApartmentManagement.Tests.L2   # Full MediatR pipeline, fake repos

# Single test class
dotnet test backend_unittest/ApartmentManagement.Tests.L2 --filter "FullyQualifiedName~SocietyIntegrationTests"

# Single test method
dotnet test backend_unittest/ApartmentManagement.Tests.L2 --filter "FullyQualifiedName~CreateSociety_ThenGetById_ReturnsSameSociety"
```

L2 tests use real MediatR + FluentValidation pipelines with **in-memory fake repositories** (no Cosmos DB needed). Test classes extend `IntegrationTestBase` which wires up the DI container with fakes (`FakeCurrentUserService`, `FakeEventPublisher`, `FakeNotificationService`, etc.).

---

## Key Conventions

- **New feature checklist**: add entity to `Domain/Entities/`, repository interface to `Domain/Repositories/`, Cosmos container mapping to `Infrastructure/Repositories.cs`, handler + validator to `Application/<Domain>Module.cs`, HTTP trigger to `Functions/`.
- **Mapping**: static extension methods in `Application/Mappings.cs` (`entity.ToResponse()`).
- **HTTP deserialization**: always use `req.DeserializeAsync<TCommand>(ct)` from `HttpHelpers`.
- **User.GenerateOtp()** is `void`; read `user.OtpCode` / `user.OtpExpiry` after calling it.
- `local.settings.json` is gitignored. The Cosmos DB Emulator key is not a secret — it's the same on every installation.
- Old superseded files (`*Handlers.cs`, `*Commands.cs`, root-level `Domain/*.cs` that say "Superseded") are kept for reference but excluded from compilation.
