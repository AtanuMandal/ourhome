/*
  Service Bus Module
  ==================
  Deploys an Azure Service Bus namespace with a topic and two subscriptions.

  ⚠  SKU NOTE: The requested Basic SKU does NOT support topics or subscriptions
     (Basic only supports queues). Standard SKU is required for the
     publish-subscribe pattern used here. Upgraded to Standard.

     Standard SKU pricing: ~$10/month base fee (East US, 2025).
     If you later simplify to queues-only, switch to Basic (~$0.05/million ops).

  Topic/subscription design:
    domain-events (topic)
    ├── notifications  – triggers email/SMS/push via ACS
    └── gamification   – awards points, evaluates competition entries
*/

@description('Azure region for the Service Bus namespace.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

var serviceBusNamespaceName = '${resourcePrefix}-sb-${uniqueString(resourceGroup().id)}'

resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: serviceBusNamespaceName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    minimumTlsVersion: '1.2'
  }
}

// Central topic – all domain events are published here
resource domainEventsTopic 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'domain-events'
  properties: {
    defaultMessageTimeToLive: 'P14D'   // 14-day TTL
    maxSizeInMegabytes: 1024
    enablePartitioning: false
    requiresDuplicateDetection: false
    supportOrdering: true
  }
}

// Subscription: processes domain events to send email / SMS / push notifications
resource notificationsSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  parent: domainEventsTopic
  name: 'notifications'
  properties: {
    deadLetteringOnMessageExpiration: true
    defaultMessageTimeToLive: 'P14D'
    lockDuration: 'PT1M'
    maxDeliveryCount: 10
    requiresSession: false
  }
}

// Subscription: processes domain events for points, competitions, and rewards
resource gamificationSubscription 'Microsoft.ServiceBus/namespaces/topics/subscriptions@2022-10-01-preview' = {
  parent: domainEventsTopic
  name: 'gamification'
  properties: {
    deadLetteringOnMessageExpiration: true
    defaultMessageTimeToLive: 'P14D'
    lockDuration: 'PT1M'
    maxDeliveryCount: 10
    requiresSession: false
  }
}

// Reference the auto-created shared access rule to obtain the connection string
resource rootManageSharedAccessKey 'Microsoft.ServiceBus/namespaces/authorizationRules@2022-10-01-preview' existing = {
  parent: serviceBusNamespace
  name: 'RootManageSharedAccessKey'
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output serviceBusNamespaceName string = serviceBusNamespace.name
output serviceBusNamespaceId string = serviceBusNamespace.id
output topicName string = domainEventsTopic.name
output connectionString string = rootManageSharedAccessKey.listKeys().primaryConnectionString
