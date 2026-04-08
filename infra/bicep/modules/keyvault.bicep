/*
  Key Vault Module
  ================
  Deploys an Azure Key Vault using RBAC authorization (not legacy access policies)
  and stores four secrets required by the Function App:
    - CosmosDbConnectionString
    - EventGridTopicKey
    - AzureCommunicationServicesConnectionString
    - JwtSecret

  Access model:
    - enableRbacAuthorization: true  →  permissions managed via Azure RBAC roles
    - The "Key Vault Secrets User" role is assigned to the Function App's managed
      identity in main.bicep (after the Function App is deployed).

  Naming: 3–24 chars, alphanumeric + hyphens, start with a letter.
*/

@description('Azure region for the Key Vault.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

@description('Environment. Enables purge protection for prod to prevent accidental deletion.')
@allowed(['dev', 'prod'])
param appEnvironment string

@description('Cosmos DB primary connection string.')
@secure()
param cosmosDbConnectionString string

@description('Event Grid topic key.')
@secure()
param eventGridTopicKey string

@description('Azure Communication Services primary connection string.')
@secure()
param communicationServicesConnectionString string

@description('JWT signing secret (minimum 32 characters).')
@secure()
param jwtSecret string

// Key Vault names: 3–24 chars; strip hyphens from prefix, then truncate to fit
var keyVaultName = take(
  'kv-${replace(resourcePrefix, '-', '')}${uniqueString(resourceGroup().id)}',
  24
)

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true         // Azure RBAC instead of legacy access policies
    enableSoftDelete: true
    softDeleteRetentionInDays: 7          // Minimum; consider 90 days for long-lived prod vaults
    enablePurgeProtection: appEnvironment == 'prod' ? true : false
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true    // Allows ARM deployments to read secrets as params
    publicNetworkAccess: 'Enabled'        // Restrict to private endpoint for higher-security deployments
  }
}

resource cosmosDbSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'CosmosDbConnectionString'
  properties: {
    value: cosmosDbConnectionString
    attributes: { enabled: true }
  }
}

resource eventGridTopicKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'EventGridTopicKey'
  properties: {
    value: eventGridTopicKey
    attributes: { enabled: true }
  }
}

resource communicationServicesSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AzureCommunicationServicesConnectionString'
  properties: {
    value: communicationServicesConnectionString
    attributes: { enabled: true }
  }
}

resource jwtSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'JwtSecret'
  properties: {
    value: jwtSecret
    attributes: { enabled: true }
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output keyVaultName string = keyVault.name
output keyVaultId string = keyVault.id
output keyVaultUri string = keyVault.properties.vaultUri
