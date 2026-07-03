using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ApartmentManagement.Infrastructure;

public interface IMobilePushTokenStore
{
    Task<IReadOnlyList<MobilePushTokenDocument>> GetByUserIdAsync(string userId, string societyId, CancellationToken ct = default);
    Task UpsertAsync(MobilePushTokenDocument doc, CancellationToken ct = default);
    Task DeleteByTokenAsync(string token, string societyId, CancellationToken ct = default);
}

public sealed class MobilePushTokenRepository(
    CosmosClient client,
    string databaseName,
    ILogger<MobilePushTokenRepository> logger) : IMobilePushTokenStore
{
    private const string ContainerName = "mobile-push-tokens";
    private readonly Container _container = client.GetContainer(databaseName, ContainerName);

    public async Task<IReadOnlyList<MobilePushTokenDocument>> GetByUserIdAsync(
        string userId, string societyId, CancellationToken ct = default)
    {
        try
        {
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.userId = @userId AND c.societyId = @societyId")
                .WithParameter("@userId", userId)
                .WithParameter("@societyId", societyId);

            var results = new List<MobilePushTokenDocument>();
            var options = new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) };
            using var feed = _container.GetItemQueryIterator<MobilePushTokenDocument>(query, requestOptions: options);
            while (feed.HasMoreResults)
                results.AddRange(await feed.ReadNextAsync(ct));

            return results;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get mobile push tokens for user {UserId}", userId);
            return [];
        }
    }

    public async Task UpsertAsync(MobilePushTokenDocument doc, CancellationToken ct = default)
    {
        try
        {
            await _container.UpsertItemAsync(doc, new PartitionKey(doc.SocietyId), cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upsert mobile push token for user {UserId}", doc.UserId);
        }
    }

    public async Task DeleteByTokenAsync(string token, string societyId, CancellationToken ct = default)
    {
        try
        {
            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.token = @token AND c.societyId = @societyId")
                .WithParameter("@token", token)
                .WithParameter("@societyId", societyId);

            var options = new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) };
            using var feed = _container.GetItemQueryIterator<MobilePushTokenDocument>(query, requestOptions: options);
            while (feed.HasMoreResults)
            {
                var page = await feed.ReadNextAsync(ct);
                foreach (var doc in page)
                {
                    try
                    {
                        await _container.DeleteItemAsync<MobilePushTokenDocument>(
                            doc.Id, new PartitionKey(societyId), cancellationToken: ct);
                    }
                    catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete mobile push token for societyId={SocietyId}", societyId);
        }
    }
}
