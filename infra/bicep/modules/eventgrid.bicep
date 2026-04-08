/*
  Event Grid Module
  =================
  Deploys an Azure Event Grid Custom Topic for domain event pub/sub.
  Used by the Transactional Outbox pattern:
    Cosmos Change Feed → OutboxPublisherFunction → Event Grid → subscribers

  Design decisions:
    - Custom Topic (not system topic): we control the schema and event types.
    - CloudEvents 1.0 schema: standard, interoperable, supported by Azure Functions EventGrid trigger.
    - Public access: fine for low-traffic internal workloads; restrict with private endpoints for higher security.
    - Estimated cost: ~$0.60 per million events (first 100K/month free).
      At 200 req/day × ~2 events/req = ~12,000 events/month → effectively free.
*/

@description('Azure region for the Event Grid Topic.')
param location string

@description('Resource name prefix (e.g., aptmgmt-dev).')
param resourcePrefix string

@description('Resource tags to apply to all resources.')
param tags object

var topicName = '${resourcePrefix}-evgt-${uniqueString(resourceGroup().id)}'

resource eventGridTopic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: topicName
  location: location
  tags: tags
  properties: {
    inputSchema: 'CloudEventSchemaV1_0'   // CloudEvents 1.0 standard
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────

output topicName string = eventGridTopic.name
output topicId string = eventGridTopic.id
output topicEndpoint string = eventGridTopic.properties.endpoint
output topicKey string = eventGridTopic.listKeys().key1
