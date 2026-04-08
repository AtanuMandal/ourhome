using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ApartmentManagement.Infrastructure.Persistence;

/// <summary>Generic Cosmos DB repository. SocietyId is the partition key on every container.</summary>
public class CosmosDbRepository<T>(
    CosmosClient client,
    string databaseName,
    string containerName,
    ILogger<CosmosDbRepository<T>> logger)
    : IRepository<T> where T : BaseEntity
{
    protected readonly Container _container = client.GetContainer(databaseName, containerName);

    public async Task<T?> GetByIdAsync(string id, string societyId, CancellationToken ct = default)
    {
        try
        {
            var response = await _container.ReadItemAsync<T>(id, new PartitionKey(societyId), cancellationToken: ct);
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error reading {Type} id={Id}", typeof(T).Name, id);
            throw;
        }
    }

    public async Task<IReadOnlyList<T>> GetAllAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @societyId")
            .WithParameter("@societyId", societyId);
        return await ExecuteQueryAsync(query, societyId, ct);
    }

    // PSEUDOCODE / PLAN (as comments)
    // - Call CreateItemAsync to persist the entity in Cosmos DB.
    // - Capture the ItemResponse<T> returned by the SDK.
    // - The SDK's response contains server-generated metadata (ETag) on the response object.
    // - Some model properties on response.Resource may not be populated by the SDK mapping.
    // - To ensure the caller gets the latest metadata, prefer to return the created resource
    //   but copy server headers (ETag) from the response to the returned object.
    // - If response.Resource is null for any reason, fall back to returning the original entity
    //   after applying the ETag from the response.
    // - Preserve existing exception handling for conflict cases.

    // Replace the CreateAsync method implementation below.
    public async Task<T> CreateAsync(T entity, CancellationToken ct = default)
    {
        try
        {
            var response = await _container.CreateItemAsync(entity, new PartitionKey(entity.SocietyId), cancellationToken: ct);

            // The SDK exposes the resource instance and the ETag separately on the ItemResponse.
            // Some SDK/serializer combinations don't populate all server-side metadata into response.Resource.
            // Ensure the returned instance has the server ETag so callers can use it (e.g. for optimistic concurrency).
            var created = response.Resource ?? entity;

            // response.ETag holds the server ETag; assign it to the returned entity if the property exists.
            if (!string.IsNullOrEmpty(response.ETag))
            {
                try
                {
                    created.ETag = response.ETag;
                }
                catch
                {
                    // If the returned type does not expose a settable ETag, ignore silently.
                    // We still return 'created' so caller receives whatever fields are available.
                }
            }

            return created;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.Conflict)
        {
            logger.LogWarning("Conflict creating {Type} id={Id}", typeof(T).Name, entity.Id);
            throw;
        }
    }

    public async Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        entity.TouchUpdatedAt();
        var options = new ItemRequestOptions { IfMatchEtag = entity.ETag };
        var response = await _container.ReplaceItemAsync(entity, entity.Id,
            new PartitionKey(entity.SocietyId), options, ct);
        return response.Resource;
    }

    public async Task DeleteAsync(string id, string societyId, CancellationToken ct = default)
    {
        try
        {
            await _container.DeleteItemAsync<T>(id, new PartitionKey(societyId), cancellationToken: ct);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }
    }

    public async Task<bool> ExistsAsync(string id, string societyId, CancellationToken ct = default)
    {
        var item = await GetByIdAsync(id, societyId, ct);
        return item is not null;
    }

    protected async Task<IReadOnlyList<T>> ExecuteQueryAsync(QueryDefinition query, string societyId, CancellationToken ct)
    {
        var results = new List<T>();
        var options = new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) };
        using var feed = _container.GetItemQueryIterator<T>(query, requestOptions: options);
        while (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            results.AddRange(page);
        }
        return results;
    }

    protected async Task<IReadOnlyList<T>> ExecuteCrossPartitionQueryAsync(QueryDefinition query, CancellationToken ct)
    {
        var results = new List<T>();
        using var feed = _container.GetItemQueryIterator<T>(query);
        while (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            results.AddRange(page);
        }
        return results;
    }
}
