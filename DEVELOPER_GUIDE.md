# Developer Guide
## Apartment Management System — Local Development & Azure Deployment

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development — Backend](#local-development--backend)
3. [Local Development — Frontend](#local-development--frontend)
4. [Running Both Together](#running-both-together)
5. [Azure Deployment — One-Time Setup](#azure-deployment--one-time-setup)
6. [Azure Deployment — Infrastructure (Bicep)](#azure-deployment--infrastructure-bicep)
7. [Azure Deployment — Backend (Azure Functions)](#azure-deployment--backend-azure-functions)
8. [Azure Deployment — Frontend (Angular PWA)](#azure-deployment--frontend-angular-pwa)
9. [CI/CD with GitHub Actions](#cicd-with-github-actions)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these tools once on your machine:

| Tool | Version | Install |
|------|---------|---------|
| .NET SDK | 8.x | https://dotnet.microsoft.com/download/dotnet/8.0 |
| Node.js | 20.x LTS | https://nodejs.org |
| Azure Functions Core Tools | v4 | `npm install -g azure-functions-core-tools@4` |
| Azure CLI | Latest | https://learn.microsoft.com/cli/azure/install-azure-cli |
| Azure Cosmos DB Emulator | Latest | https://aka.ms/cosmosdb-emulator *(Windows)* |
| Azurite (local storage) | Latest | `npm install -g azurite` |
| Angular CLI | 17.x | `npm install -g @angular/cli@17` |

> **Mac/Linux for Cosmos DB Emulator:** Use the [Docker image](https://learn.microsoft.com/azure/cosmos-db/linux-emulator) instead:
> ```bash
> docker run -p 8081:8081 -p 10251-10255:10251-10255 mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
> ```

---

## Local Development — Backend

The backend is an **Azure Functions v4 app** (.NET 8 isolated worker). It needs two local services running before you start: Azurite (storage) and the Cosmos DB Emulator.

### Step 1 — Start Azurite

```bash
azurite --silent --location C:\azurite --debug C:\azurite\debug.log
```

Or in VS Code: `Ctrl+Shift+P` → **Azurite: Start**

Keep this terminal open.

### Step 2 — Start the Cosmos DB Emulator

- **Windows:** Launch *Azure Cosmos DB Emulator* from the Start Menu. Wait ~30 seconds until the browser opens at `https://localhost:8081/_explorer/index.html`.
- **Docker (Mac/Linux):**
  ```bash
  docker run -p 8081:8081 -e AZURE_COSMOS_EMULATOR_PARTITION_COUNT=1 \
    mcr.microsoft.com/cosmosdb/linux/azure-cosmos-emulator
  ```

The emulator's connection string (pre-filled in `local.settings.json`) is:
```
AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD1b/pkEWnkJCUH4dyRxPE1/Fq/BzOy6A==
```
This key is the same for every installation — it is not a secret.

### Step 3 — Create the Cosmos DB database

Open the Emulator Explorer at `https://localhost:8081/_explorer/index.html` and create:

- **Database:** `apartment-management`
- **Containers** *(all with `/societyId` as partition key, except `outbox-leases`)*:

| Container | Partition Key |
|-----------|--------------|
| `societies` | `/societyId` |
| `apartments` | `/societyId` |
| `users` | `/societyId` |
| `amenities` | `/societyId` |
| `amenity-bookings` | `/societyId` |
| `complaints` | `/societyId` |
| `notices` | `/societyId` |
| `visitor_logs` | `/societyId` |
| `fee-schedules` | `/societyId` |
| `fee-payments` | `/societyId` |
| `competitions` | `/societyId` |
| `competition-entries` | `/societyId` |
| `reward-points` | `/societyId` |
| `service-providers` | `/societyId` |
| `service-requests` | `/societyId` |
| `outbox` | `/societyId` |
| `outbox-leases` | `/id` |

### Step 4 — Review `local.settings.json`

File: `backend/src/ApartmentManagement.Functions/local.settings.json`

```jsonc
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",          // Azurite
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",

    // Cosmos DB Emulator (pre-filled — no changes needed)
    "Infrastructure:CosmosDbConnectionString": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6y...",
    "Infrastructure:CosmosDbDatabaseName": "apartment-management",

    // Required by the Outbox Change Feed trigger (same value as above, different key name)
    "CosmosDbConnection": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6y...",

    // Event Grid — leave blank locally; outbox publisher skips publishing but API still works
    "Infrastructure:EventGridTopicEndpoint": "",
    "Infrastructure:EventGridTopicKey": "",

    // Azure Communication Services — leave blank to skip email/SMS sending
    "Infrastructure:AzureCommunicationConnectionString": "",

    // Azure AD B2C — leave blank to skip JWT validation during local dev
    "AzureAdB2C:Authority": "",
    "AzureAdB2C:ClientId": ""
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "http://localhost:4200",
    "CORSCredentials": true
  }
}
```

> ⚠️ `local.settings.json` is in `.gitignore`. Never commit real connection strings.

### Step 5 — Build and run

```bash
# From the repo root
dotnet restore apartment_management.sln
dotnet build apartment_management.sln

# Start the Functions host
cd backend/src/ApartmentManagement.Functions
func start
```

The API is now running at **`http://localhost:7071/api/`**

### Step 6 — Test with Postman

1. Open Postman → **Import** → select `postman/ApartmentManagement.postman_collection.json`
2. Import `postman/ApartmentManagement.postman_environment.json`
3. Select the **ApartmentManagement - Local** environment
4. Set `baseUrl` = `http://localhost:7071/api` (already pre-set)

### Role hierarchy

| Category | Role | Description |
|----------|------|-------------|
| **HQ** (HeadQuarters) | `HQAdmin` | Platform admin — creates societies, manages platform |
| **HQ** | `HQUser` | Platform viewer — read-only access to society list |
| **SU** (Society Users) | `SUAdmin` | Housing Officer — manages their society (residents, fees, complaints…) |
| **SU** | `SUUser` | Regular resident within a society |

### First-time setup flow (local)

**Step 1 — Create a society (this also creates the first Housing Officer account):**

Run **02 – Society → Create Society** in Postman. The request body includes both the society details and the initial `SUAdmin` (Housing Officer) credentials:

```json
{
  "name": "Green Valley Residency",
  "street": "42 Palm Grove Avenue", "city": "Bengaluru",
  "state": "Karnataka", "postalCode": "560001", "country": "India",
  "contactEmail": "admin@greenvalley.com", "contactPhone": "+91-8012345678",
  "totalBlocks": 4, "totalApartments": 120,
  "adminFullName": "Rajesh Kumar",
  "adminEmail": "rajesh.kumar@greenvalley.com",
  "adminPhone": "+91-9000000001"
}
```

The response is `201 Created` with:
```json
{
  "society": { "id": "<societyId>", "status": "Draft", ... },
  "admin":   { "id": "<adminUserId>", "role": "SUAdmin", "isVerified": false, ... }
}
```

The Postman test script **automatically saves** `societyId` and `adminUserId` as collection variables.

**Step 2 — Generate OTP for the Housing Officer:**

Run **Auth → Send OTP** for the admin user. Locally, no SMS is sent. Read the OTP directly from the emulator:
- Open `https://localhost:8081/_explorer`
- Browse `apartment-management` → `users` container
- Find the admin document and copy the `otpCode` field value

**Step 3 — Verify OTP:**
```
Auth → Verify OTP   → returns JWT token (auto-saved to {{bearerToken}})
```
All subsequent requests use the saved token automatically.

### Running Tests

```bash
# All tests from repo root
dotnet test apartment_management.sln

# Individual levels
dotnet test backend_unittest/ApartmentManagement.Tests.L0  # Unit tests
dotnet test backend_unittest/ApartmentManagement.Tests.L1  # Integration (fakes)
dotnet test backend_unittest/ApartmentManagement.Tests.L2  # End-to-end (real pipeline)
```

---

## Local Development — Frontend

The Angular PWA frontend requires the backend API running on port 7071 (see above).

### Step 1 — Install dependencies

```bash
cd frontend/apartment-management
npm install
```

### Step 2 — Start the dev server

```bash
npm start
```

Opens at **`http://localhost:4200`**. Hot-reload is enabled — changes reflect instantly.

The dev environment is pre-configured to point at `http://localhost:7071/api` via `src/environments/environment.ts`. No changes needed.

### Build for production locally

```bash
npm run build                              # production build
npm run build -- --configuration=production  # explicit flag
```

Output goes to `dist/apartment-management/browser/`.

### PWA / Service Worker

The service worker is **only active in production builds**. In dev mode (`npm start`), the app behaves as a standard SPA. To test the PWA offline experience locally:

```bash
npm run build
npx http-server dist/apartment-management/browser -p 8080
```

Then open `http://localhost:8080` and use Chrome DevTools → Application → Service Workers.

---

## Running Both Together

Open three terminals:

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `azurite --silent` | Local storage emulator |
| 2 | `cd backend/src/ApartmentManagement.Functions && func start` | API on :7071 |
| 3 | `cd frontend/apartment-management && npm start` | UI on :4200 |

CORS is pre-configured in `local.settings.json` to allow `http://localhost:4200`.

---

## Azure Deployment — One-Time Setup

These steps are done once per Azure subscription and once per environment (dev/prod).

### 1. Create resource groups

```bash
az login
az account set --subscription "<your-subscription-id>"

az group create --name rg-aptmgmt-dev  --location eastus
az group create --name rg-aptmgmt-prod --location eastus  # prod only
```

### 2. Create a Service Principal with OIDC (for GitHub Actions)

```bash
# Create app registration
az ad app create --display-name "aptmgmt-github-actions"

# Note the appId from the output
APP_ID="<appId from above>"

# Create service principal
az ad sp create --id $APP_ID

# Get object ID of the service principal
SP_OBJECT_ID=$(az ad sp show --id $APP_ID --query id -o tsv)

# Assign Contributor role on both resource groups
az role assignment create --role Contributor \
  --assignee-object-id $SP_OBJECT_ID \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-aptmgmt-dev

az role assignment create --role Contributor \
  --assignee-object-id $SP_OBJECT_ID \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-aptmgmt-prod
```

### 3. Configure OIDC federated credentials

In the Azure Portal → **App Registrations** → your app → **Certificates & secrets** → **Federated credentials** → Add:

| Field | Value |
|-------|-------|
| Scenario | GitHub Actions deploying Azure resources |
| Organisation | `<your-github-org>` |
| Repository | `<your-repo-name>` |
| Entity | Branch |
| Branch | `main` |
| Name | `github-actions-main` |

Add a second credential for pull requests (Entity = Pull request).

### 4. Add GitHub repository secrets

In GitHub → **Settings** → **Secrets and variables** → **Actions** → add these secrets:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App registration's Application (client) ID |
| `AZURE_TENANT_ID` | Your Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | `rg-aptmgmt-dev` (or use per-environment) |

### 5. Create GitHub Environments

In GitHub → **Settings** → **Environments** — create two environments:

- **`dev`** — no protection rules (auto-deploy on push to `main`)
- **`prod`** — add **Required reviewers** (yourself) to gate production deploys

Per environment, add these **Variables** (not secrets):

| Variable | dev value | prod value |
|----------|-----------|------------|
| `FUNCTION_APP_NAME` | *(leave blank — auto-detected from Bicep output)* | same |
| `STORAGE_ACCOUNT_NAME` | *(leave blank — auto-detected)* | same |
| `CDN_PROFILE_NAME` | *(optional, for cache purge)* | same |
| `CDN_ENDPOINT_NAME` | *(optional)* | same |

---

## Azure Deployment — Infrastructure (Bicep)

Deploy or update all Azure resources in one command.

### Deploy dev environment

```bash
az deployment group create \
  --resource-group rg-aptmgmt-dev \
  --template-file infra/bicep/main.bicep \
  --parameters infra/bicep/parameters/dev.bicepparam \
  --parameters jwtSecret="<your-32+-char-secret>"
```

### Deploy prod environment

```bash
az deployment group create \
  --resource-group rg-aptmgmt-prod \
  --template-file infra/bicep/main.bicep \
  --parameters infra/bicep/parameters/prod.bicepparam \
  --parameters jwtSecret="<your-prod-32+-char-secret>"
```

### What gets deployed

| Resource | Name pattern | Notes |
|----------|-------------|-------|
| Azure Functions (Consumption) | `aptmgmt-dev-func-<hash>` | .NET 8 isolated, HTTPS only |
| Cosmos DB (Serverless) | `aptmgmt-dev-cosmos-<hash>` | 17 containers, camelCase serialization |
| Event Grid Custom Topic | `aptmgmt-dev-evgt-<hash>` | CloudEvents 1.0, outbox pub/sub |
| Key Vault | `kvaptmgmtdev<hash>` | RBAC auth, stores 4 secrets |
| Storage Account | `aptmgmtdev<hash>` | LRS, also hosts static website |
| App Insights + Log Analytics | `aptmgmt-dev-ai` | Workspace-based |
| Azure Communication Services | `aptmgmt-dev-comm` | Email + SMS |

### After first deployment — note the outputs

```bash
az deployment group show \
  --resource-group rg-aptmgmt-dev \
  --name "<deployment-name>" \
  --query properties.outputs
```

Note the `functionAppHostName` — you'll need it for the frontend environment config.

---

## Azure Deployment — Backend (Azure Functions)

### Manual deploy (one-off)

```bash
# Build and publish
dotnet publish backend/src/ApartmentManagement.Functions/ApartmentManagement.Functions.csproj \
  --configuration Release \
  --output ./publish/functions

# Zip the output
cd publish/functions && zip -r ../../function-app.zip . && cd ../..

# Deploy
az functionapp deployment source config-zip \
  --resource-group rg-aptmgmt-dev \
  --name "<function-app-name>" \
  --src ./function-app.zip
```

### Verify deployment

```bash
# Check the function app is running
az functionapp show \
  --resource-group rg-aptmgmt-dev \
  --name "<function-app-name>" \
  --query "state"

# Tail live logs
az webapp log tail \
  --resource-group rg-aptmgmt-dev \
  --name "<function-app-name>"
```

---

## Azure Deployment — Frontend (Angular PWA)

The Angular app is deployed as a **static website** hosted on Azure Blob Storage.

### Step 1 — Enable static website hosting on the storage account

This is a one-time step (Bicep does not currently enable it):

```bash
az storage blob service-properties update \
  --account-name "<storage-account-name>" \
  --static-website \
  --index-document index.html \
  --404-document index.html \
  --auth-mode login
```

> Setting `--404-document index.html` is required for Angular's client-side routing to work correctly (all 404s serve `index.html` and Angular handles the route).

### Step 2 — Set the API URL for production

Edit `frontend/apartment-management/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://<your-function-app-name>.azurewebsites.net/api',
};
```

Replace `<your-function-app-name>` with the value from the Bicep output `functionAppHostName`.

### Step 3 — Build and upload

```bash
cd frontend/apartment-management

# Production build
npm run build -- --configuration production

# Upload to $web container
az storage blob upload-batch \
  --account-name "<storage-account-name>" \
  --destination '$web' \
  --source dist/apartment-management/browser \
  --overwrite \
  --auth-mode login
```

### Step 4 — Get the website URL

```bash
az storage account show \
  --name "<storage-account-name>" \
  --resource-group rg-aptmgmt-dev \
  --query "primaryEndpoints.web" \
  --output tsv
```

The URL looks like: `https://<storage-account-name>.z13.web.core.windows.net/`

### Optional — Add a custom domain / CDN

For HTTPS + custom domain + faster global delivery, add Azure CDN or Azure Front Door in front of the storage account's `$web` endpoint. The CD workflow already includes a cache-purge step for CDN when `CDN_PROFILE_NAME` and `CDN_ENDPOINT_NAME` are set as GitHub environment variables.

### Step 5 — Configure CORS on the Function App

Allow the frontend origin to call the API:

```bash
az functionapp cors add \
  --resource-group rg-aptmgmt-dev \
  --name "<function-app-name>" \
  --allowed-origins "https://<storage-account-name>.z13.web.core.windows.net"
```

---

## CI/CD with GitHub Actions

Three workflows are in `.github/workflows/`:

| Workflow | File | Triggers |
|----------|------|---------|
| **CI** | `ci.yml` | Every push + PR to `main` |
| **CD** | `cd.yml` | Push to `main` (→ dev) or manual dispatch (→ dev/prod) |
| **PR Check** | `pr-check.yml` | Pull requests |

### CI pipeline stages (automatic on every push)

```
Backend: restore → build → L0 tests → L1 tests → L2 tests
Frontend: npm ci → ng build --production
Bicep: az bicep build (lint) → deployment what-if
```

### CD pipeline stages (on push to main)

```
1. Deploy infrastructure (Bicep)     ← runs first
2. Deploy backend (zip deploy)  ┐
3. Deploy frontend (blob upload) ┘   ← run in parallel after infra
```

For `prod`, the `deploy` job is gated by GitHub Environment required reviewers — you must approve before anything deploys to production.

### Required GitHub secrets summary

```
AZURE_CLIENT_ID          App registration client ID
AZURE_TENANT_ID          Azure AD tenant ID
AZURE_SUBSCRIPTION_ID    Azure subscription ID
AZURE_RESOURCE_GROUP     Target resource group (rg-aptmgmt-dev or rg-aptmgmt-prod)
```

---

## Troubleshooting

### Backend

| Problem | Cause | Fix |
|---------|-------|-----|
| `func start` fails with "no job functions found" | `dotnet publish` not run | Run `dotnet build` first, or use `func start --dotnet-isolated-debug` |
| `CosmosException: 404 Not Found` on first request | Containers not created | Create containers in emulator explorer (Step 3 above) |
| `SSL certificate error` from Cosmos Emulator | Emulator certificate not trusted | Run `certutil -addstore -f "ROOT" "<emulator-cert-path>"` or ignore SSL errors by adding `CosmosClientOptions { HttpClientFactory = () => new HttpClient(new HttpClientHandler { ServerCertificateCustomValidationCallback = ... }) }` in dev only |
| `AzureWebJobsStorage` error on startup | Azurite not running | Start Azurite first (Step 1) |
| 401 Unauthorized on all requests | JWT validation enabled but B2C not configured | Leave `AzureAdB2C:Authority` blank in `local.settings.json` to disable JWT validation locally |
| OutboxPublisherFunction logs errors | Event Grid not configured | Expected locally — the main HTTP API works fine; outbox relay just fails silently |

### Frontend

| Problem | Cause | Fix |
|---------|-------|-----|
| `CORS error` in browser | API CORS not configured | Ensure `local.settings.json` has `"CORS": "http://localhost:4200"` and `func start` was restarted |
| `Cannot GET /dashboard` on refresh | Static website 404 doc not set | Set `--404-document index.html` on the storage static website config |
| PWA install prompt not appearing | Dev server or HTTP (not HTTPS) | Service worker only registers on HTTPS or localhost over production build |
| Angular build error: budget exceeded | Bundle size > 800 KB | Already raised to 800 KB in `angular.json`; further reduce by removing unused Angular Material modules |
| `NG8107` optional chain warnings | Harmless type warnings | Build still succeeds; safe to ignore |

### Azure Deployment

| Problem | Cause | Fix |
|---------|-------|-----|
| `Deployment failed: KeyVault secret reference not resolved` | RBAC propagation lag | Wait 60–90 seconds after first deploy and restart the Function App |
| `az login` fails in GitHub Actions | OIDC federated credential not matching | Check the Organization, Repository, and Branch match exactly in the Azure app registration |
| Functions returning 500 after deploy | App settings referencing Key Vault but managed identity has no access | Verify the `kvFunctionAppRoleAssignment` in `main.bicep` ran successfully; check in Azure Portal → Key Vault → Access control (IAM) |
