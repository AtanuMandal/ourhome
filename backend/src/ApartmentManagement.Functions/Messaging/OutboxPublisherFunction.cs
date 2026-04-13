using ApartmentManagement.Domain.Entities;
using Azure;
using Azure.Messaging;
using Azure.Messaging.EventGrid;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ApartmentManagement.Functions;

/// <summary>
/// Cosmos DB Change Feed trigger — picks up new outbox records and publishes
/// them as CloudEvents to Event Grid, then marks each record Published/Failed.
/// </summary>
public class OutboxPublisherFunction(
    CosmosClient cosmosClient,
    IConfiguration configuration,
    ILogger<OutboxPublisherFunction> logger)
{
    private const string DbName = "apartment-management";
    private const string ContainerName = "outbox";

    [Function(nameof(OutboxPublisherFunction))]
    public async Task Run(
        [CosmosDBTrigger(
            databaseName: DbName,
            containerName: ContainerName,
            Connection = "CosmosDbConnection",
            LeaseContainerName = "outbox-leases",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<OutboxRecord> records)
    {
        if (records is null || records.Count == 0) return;

        var endpoint = configuration["Infrastructure:EventGridTopicEndpoint"];
        var key = configuration["Infrastructure:EventGridTopicKey"];

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(key))
        {
            logger.LogWarning("EventGrid not configured — skipping outbox publishing for {Count} record(s).", records.Count);
            return;
        }

        var egClient = new EventGridPublisherClient(new Uri(endpoint), new AzureKeyCredential(key));
        var container = cosmosClient.GetContainer(DbName, ContainerName);

        foreach (var record in records)
        {
            if (record.Status != "Pending") continue;

            try
            {
                var cloudEvent = new CloudEvent(
                    source: $"/apartment-management/{record.SocietyId}",
                    type: $"ApartmentManagement.{record.EventType}",
                    jsonSerializableData: JsonDocument.Parse(record.EventData).RootElement)
                {
                    Id = record.Id,
                    Time = record.CreatedAt
                };

                await egClient.SendEventAsync(cloudEvent);

                record.MarkPublished();
                await container.UpsertItemAsync(record, new PartitionKey(record.SocietyId));

                logger.LogInformation("Published outbox record {Id} ({EventType})", record.Id, record.EventType);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to publish outbox record {Id} ({EventType})", record.Id, record.EventType);
                try
                {
                    record.MarkFailed();
                    await container.UpsertItemAsync(record, new PartitionKey(record.SocietyId));
                }
                catch (Exception updateEx)
                {
                    logger.LogError(updateEx, "Could not mark outbox record {Id} as Failed", record.Id);
                }
            }
        }
    }
}
