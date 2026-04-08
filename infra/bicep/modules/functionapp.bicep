/*
  Function App Module
  ===================
  Deploys an Azure Functions v4 app (Consumption plan, .NET 8 isolated) with:
    - System-assigned managed identity (required for Key Vault secret references)
    - Consumption (Y1 / Dynamic) hosting plan – no reserved compute cost
    - HTTPS-only, TLS 1.2 minimum, FTP disabled
    - App settings wired to all platform dependencies

  Key Vault secret reference syntax used for sensitive settings:
    @Microsoft.KeyVault(VaultName=<name>;SecretName=<secret>)

  The Function App's managed identity must hold the "Key Vault Secrets User" RBAC
  role on the vault. This role assignment is created in main.bicep after this
  module outputs the principalId.

  Note on first deployment: Key Vault references may show "Initializing" status
  briefly until the RBAC propagation completes (~60 seconds). The Function App
  will retry and resolve them automatically.
*/

@description('Azure region for the Function App.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

@description('Name of the Storage Account used for the Function App host storage.')
param storageAccountName string

@description('Application Insights connection string (non-sensitive – passed directly).')
param appInsightsConnectionString string

@description('Key Vault name used to build @Microsoft.KeyVault() secret reference strings.')
param keyVaultName string

@description('Environment. Sets ASPNETCORE_ENVIRONMENT.')
@allowed(['dev', 'prod'])
param appEnvironment string

@description('Event Grid custom topic endpoint (non-sensitive public URL).')
param eventGridTopicEndpoint string

var functionAppName = '${resourcePrefix}-func-${uniqueString(resourceGroup().id)}'
var hostingPlanName = '${resourcePrefix}-plan'

// Look up the already-deployed storage account to retrieve its connection string
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

// Consumption (Y1 / Dynamic) plan – scale to zero, pay per execution
resource hostingPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: hostingPlanName
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false  // Windows Consumption plan
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'  // Principal ID used for Key Vault RBAC in main.bicep
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v8.0'
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [

        // ── Function runtime ─────────────────────────────────────────────────
        { name: 'FUNCTIONS_EXTENSION_VERSION',             value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME',                value: 'dotnet-isolated' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE',                value: '1' }

        // ── Storage (required for Windows Consumption plan) ──────────────────
        { name: 'AzureWebJobsStorage',                     value: storageConnectionString }
        { name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING', value: storageConnectionString }
        { name: 'WEBSITE_CONTENTSHARE',                    value: toLower(functionAppName) }

        // ── Observability ────────────────────────────────────────────────────
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING',   value: appInsightsConnectionString }

        // ── ASP.NET Core environment ─────────────────────────────────────────
        { name: 'ASPNETCORE_ENVIRONMENT',                  value: appEnvironment == 'prod' ? 'Production' : 'Development' }

        // ── Key Vault secret references ───────────────────────────────────────
        // Resolved at runtime by the Functions host using the managed identity.
        {
          name: 'CosmosDb__ConnectionString'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=CosmosDbConnectionString)'
        }
        {
          name: 'EventGrid__TopicKey'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=EventGridTopicKey)'
        }
        {
          name: 'EventGrid__TopicEndpoint'
          value: eventGridTopicEndpoint
        }
        {
          name: 'CommunicationServices__ConnectionString'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AzureCommunicationServicesConnectionString)'
        }
        {
          name: 'Jwt__Secret'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=JwtSecret)'
        }
      ]
    }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output functionAppName string = functionApp.name
output functionAppId string = functionApp.id
output principalId string = functionApp.identity.principalId
output functionAppHostName string = functionApp.properties.defaultHostName
