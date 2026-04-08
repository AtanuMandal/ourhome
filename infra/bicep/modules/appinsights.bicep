/*
  Application Insights + Log Analytics Module
  ============================================
  Deploys a workspace-based Application Insights instance backed by a
  Log Analytics Workspace for unified telemetry storage and querying.

  Design decisions:
    - Workspace-based App Insights (classic is retired): all data flows to Log Analytics.
    - 30-day retention keeps costs low while providing adequate debugging history.
    - 1 GB/day ingestion cap prevents unexpected cost spikes from runaway logging.
    - PerGB2018 pricing: pay only for data ingested (no commitment tier needed at low volume).
*/

@description('Azure region for the resources.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

var logAnalyticsWorkspaceName = '${resourcePrefix}-law'
var appInsightsName = '${resourcePrefix}-ai'

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: 1  // Hard cap to guard against logging runaway
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 30
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output logAnalyticsWorkspaceName string = logAnalyticsWorkspace.name
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output appInsightsName string = appInsights.name
output appInsightsId string = appInsights.id
output connectionString string = appInsights.properties.ConnectionString
output instrumentationKey string = appInsights.properties.InstrumentationKey
