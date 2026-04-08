/*
  Azure Communication Services Module
  =====================================
  Deploys an Azure Communication Services (ACS) resource for:
    - Email (transactional emails for fee notices, booking confirmations, etc.)
    - SMS  (OTP, visitor alerts, urgent notifications)

  ACS is a globally-distributed service; the resource location must be 'global'.
  The dataLocation property specifies where customer data is stored at rest.
*/

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

var communicationServiceName = '${resourcePrefix}-acs'

// ACS resources must use location = 'global'
resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'United States'
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output communicationServiceName string = communicationService.name
output communicationServiceId string = communicationService.id
output connectionString string = communicationService.listKeys().primaryConnectionString
