/*
  Cosmos DB Module
  ================
  Deploys an Azure Cosmos DB account in serverless capacity mode with the
  apartment-management database and all 15 domain containers.

  Design decisions:
    - Serverless mode: pay per RU consumed, no provisioned throughput needed.
      Ideal for bursty / low-volume workloads (~200 req/day).
    - Single-region: serverless accounts support only one write region.
    - Partition key /societyId on every container enforces multi-tenant isolation.
    - Hash v2 partitioning for even distribution.
    - Session consistency: good balance of performance and consistency for CRUD APIs.
*/

@description('Azure region for the Cosmos DB account.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

var cosmosAccountName = '${resourcePrefix}-cosmos-${uniqueString(resourceGroup().id)}'
var databaseName = 'apartment-management'

// All domain containers + outbox containers for Transactional Outbox pattern
var containers = [
  { name: 'societies',           partitionKey: '/societyId' }
  { name: 'apartments',          partitionKey: '/societyId' }
  { name: 'users',               partitionKey: '/societyId' }
  { name: 'amenities',           partitionKey: '/societyId' }
  { name: 'amenity-bookings',    partitionKey: '/societyId' }
  { name: 'complaints',          partitionKey: '/societyId' }
  { name: 'notices',             partitionKey: '/societyId' }
  { name: 'visitor-logs',        partitionKey: '/societyId' }
  { name: 'fee-schedules',       partitionKey: '/societyId' }
  { name: 'fee-payments',        partitionKey: '/societyId' }
  { name: 'competitions',        partitionKey: '/societyId' }
  { name: 'competition-entries', partitionKey: '/societyId' }
  { name: 'reward-points',       partitionKey: '/societyId' }
  { name: 'service-providers',   partitionKey: '/societyId' }
  { name: 'service-requests',    partitionKey: '/societyId' }
  // Outbox: written atomically with business data; Change Feed publishes to Event Grid
  { name: 'outbox',              partitionKey: '/societyId' }
  // Lease container for the Cosmos DB Change Feed trigger in Azure Functions
  { name: 'outbox-leases',       partitionKey: '/id' }
]

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    // Serverless: no throughput provisioning – charged per RU consumed
    capabilities: [
      { name: 'EnableServerless' }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false  // Serverless supports single-region writes only
    backupPolicy: {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 240    // Back up every 4 hours
        backupRetentionIntervalInHours: 8
        backupStorageRedundancy: 'Local'
      }
    }
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
  }
}

// Deploy all 15 containers via a loop – no throughput settings needed for serverless
resource cosmosContainers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = [
  for container in containers: {
    parent: cosmosDatabase
    name: container.name
    properties: {
      resource: {
        id: container.name
        partitionKey: {
          paths: [ container.partitionKey ]
          kind: 'Hash'
          version: 2
        }
        indexingPolicy: {
          indexingMode: 'consistent'
          automatic: true
          includedPaths: [ { path: '/*' } ]
          excludedPaths: [ { path: '/"_etag"/?' } ]
        }
      }
    }
  }
]

// ─── Outputs ──────────────────────────────────────────────────────────────────

output cosmosAccountName string = cosmosAccount.name
output cosmosAccountId string = cosmosAccount.id
output databaseName string = databaseName
output connectionString string = cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
