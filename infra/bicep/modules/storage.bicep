/*
  Storage Account Module
  ======================
  Deploys an Azure Storage Account (Standard LRS, StorageV2) used for:
    - Azure Functions host storage (AzureWebJobsStorage / WEBSITE_CONTENTAZUREFILECONNECTIONSTRING)
    - Blob container for apartment-related file uploads (documents, images)

  Naming: 3–24 chars, lowercase alphanumeric only (no hyphens).
*/

@description('Azure region for the storage account.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

// Storage account names: 3–24 chars, lowercase alphanumeric only
var storageAccountName = take(
  toLower(replace('st${resourcePrefix}${uniqueString(resourceGroup().id)}', '-', '')),
  24
)

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    accessTier: 'Hot'
    encryption: {
      services: {
        blob: { enabled: true }
        file: { enabled: true }
      }
      keySource: 'Microsoft.Storage'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// Container for society-uploaded documents, floor plans, receipts, etc.
resource filesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'apartment-files'
  properties: {
    publicAccess: 'None'
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
// Connection string is used by both the Function App runtime and this module's callers
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
