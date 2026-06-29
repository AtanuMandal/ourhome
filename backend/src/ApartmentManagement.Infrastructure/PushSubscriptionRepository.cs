using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ApartmentManagement.Infrastructure;

public interface IPushSubscriptionStore
{
    Task<IReadOnlyList<PushSubscriptionDocument>> GetByUserIdAsync(string userId, string societyId, CancellationToken ct = default);
    Task UpsertAsync(PushSubscriptionDocument doc, CancellationToken ct = default);
    Task DeleteByEndpointAsync(string endpoint, string societyId, CancellationToken ct = default);
}

public sealed class PushSubscriptionRepository(
    CosmosClient client,
    string databaseName,
    ILogger<PushSubscriptionRepository> logger) : IPushSubscriptionStore
{
    private const string ContainerName = "push-subscriptions";
    private readonly Container _container = client.GetContainer(databaseName, ContainerName);

    public async Task<IReadOnlyList<PushSubscriptionDocument>> GetByUserIdAsync(
        string userId, string societyId, CancellationToken ct = default)
    {
        try
        {
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.userId = @userId AND c.societyId = @societyId")
                .WithParameter("@userId", userId)
                .WithParameter("@societyId", societyId);

            var results = new List<PushSubscriptionDocument>();
            var options = new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) };
            using var feed = _container.GetItemQueryIterator<PushSubscriptionDocument>(query, requestOptions: options);
            while (feed.HasMoreResults)
                results.AddRange(await feed.ReadNextAsync(ct));

            return results;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get push subscriptions for user {UserId}", userId);
            return [];
        }
    }

    public async Task UpsertAsync(PushSubscriptionDocument doc, CancellationToken ct = default)
    {
        try
        {
            await _container.UpsertItemAsync(doc, new PartitionKey(doc.SocietyId), cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upsert push subscription for user {UserId}", doc.UserId);
        }
    }

    public async Task DeleteByEndpointAsync(string endpoint, string societyId, CancellationToken ct = default)
    {
        try
        {
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.endpoint = @endpoint AND c.societyId = @societyId")
                .WithParameter("@endpoint", endpoint)
                .WithParameter("@societyId", societyId);

            var options = new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) };
            using var feed = _container.GetItemQueryIterator<PushSubscriptionDocument>(query, requestOptions: options);
            while (feed.HasMoreResults)
            {
                var page = await feed.ReadNextAsync(ct);
                foreach (var doc in page)
                {
                    try
                    {
                        await _container.DeleteItemAsync<PushSubscriptionDocument>(
                            doc.Id, new PartitionKey(societyId), cancellationToken: ct);
                    }
                    catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete push subscription endpoint={Endpoint}", endpoint);
        }
    }
}
