/*
  Key Vault Role Assignment Module
  ================================
  Assigns an RBAC role on a Key Vault to a principal (managed identity).

  Exists as a separate module because role-assignment `name` and `scope` must
  be calculable at the start of a deployment (BCP120). Passing the vault name
  and principal ID as module parameters satisfies that, whereas referencing
  another module's outputs directly from main.bicep does not.
*/

@description('Name of the existing Key Vault to scope the role assignment to.')
param keyVaultName string

@description('Object ID of the principal (e.g., a managed identity) receiving the role.')
param principalId string

@description('Built-in role definition GUID (e.g., Key Vault Secrets User).')
param roleDefinitionId string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, principalId, roleDefinitionId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitionId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
