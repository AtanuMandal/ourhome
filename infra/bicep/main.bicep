/*
  Apartment Management System – Main Bicep Orchestrator
  ======================================================
  Multi-tenant SaaS platform for apartment society management.

  Deploys (in dependency order):
    1. Storage Account
    2. Application Insights + Log Analytics
    3. Cosmos DB (serverless, 17 containers incl. outbox + outbox-leases)
    4. Event Grid Custom Topic (replaces Service Bus – saves ~$10/month)
    5. Azure Communication Services
    6. Key Vault  (stores secrets from 3-5)
    7. Function App (wired to all of the above via KV references)
    8. Key Vault RBAC role assignment for Function App identity

  Usage:
    az deployment group create \
      --resource-group rg-aptmgmt-dev \
      --template-file main.bicep \
      --parameters @parameters/dev.bicepparam
*/

targetScope = 'resourceGroup'

// ─── Parameters ───────────────────────────────────────────────────────────────

@description('Environment name. Controls naming, SKUs, and feature flags.')
@allowed(['dev', 'prod'])
param environment string

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Short application name used as a prefix for all resource names (3–10 lowercase alphanum).')
@minLength(3)
@maxLength(10)
param appName string

@description('JWT signing secret stored in Key Vault. Minimum 32 characters.')
@secure()
@minLength(32)
param jwtSecret string

// ─── Variables ────────────────────────────────────────────────────────────────

var resourcePrefix = '${appName}-${environment}'

var tags = {
  environment: environment
  application: appName
  managedBy: 'bicep'
  costCenter: 'apartment-management'
}

// Built-in "Key Vault Secrets User" role – grants read access to secrets
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

// ─── Modules ──────────────────────────────────────────────────────────────────

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

module appInsights 'modules/appinsights.bicep' = {
  name: 'appinsights'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

module eventGrid 'modules/eventgrid.bicep' = {
  name: 'eventgrid'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

module communication 'modules/communication.bicep' = {
  name: 'communication'
  params: {
    resourcePrefix: resourcePrefix
    tags: tags
  }
}

// Key Vault receives connection strings from the above modules as @secure() params
module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
    appEnvironment: environment
    cosmosDbConnectionString: cosmos.outputs.connectionString
    eventGridTopicKey: eventGrid.outputs.topicKey
    communicationServicesConnectionString: communication.outputs.connectionString
    jwtSecret: jwtSecret
  }
}

// Function App uses Key Vault references (@Microsoft.KeyVault()) for secrets
module functionApp 'modules/functionapp.bicep' = {
  name: 'functionapp'
  params: {
    location: location
    resourcePrefix: resourcePrefix
    tags: tags
    storageAccountName: storage.outputs.storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultName: keyVault.outputs.keyVaultName
    appEnvironment: environment
    eventGridTopicEndpoint: eventGrid.outputs.topicEndpoint
  }
}

// ─── Key Vault RBAC ───────────────────────────────────────────────────────────
// Grant the Function App's system-assigned identity the "Key Vault Secrets User"
// role so that @Microsoft.KeyVault() app setting references resolve at runtime.

resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVault.outputs.keyVaultName
}

resource kvFunctionAppRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: existingKeyVault
  name: guid(existingKeyVault.id, functionApp.outputs.principalId, kvSecretsUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: functionApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output storageAccountName string = storage.outputs.storageAccountName
output cosmosAccountName string = cosmos.outputs.cosmosAccountName
output eventGridTopicName string = eventGrid.outputs.topicName
output eventGridTopicEndpoint string = eventGrid.outputs.topicEndpoint
output appInsightsName string = appInsights.outputs.appInsightsName
output keyVaultName string = keyVault.outputs.keyVaultName
output keyVaultUri string = keyVault.outputs.keyVaultUri
output functionAppName string = functionApp.outputs.functionAppName
output functionAppHostName string = functionApp.outputs.functionAppHostName
output communicationServiceName string = communication.outputs.communicationServiceName
