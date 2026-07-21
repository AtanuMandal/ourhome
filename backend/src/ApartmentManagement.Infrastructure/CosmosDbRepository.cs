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
            return ApplyResponseMetadata(response.Resource, response.ETag);
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
            return ApplyResponseMetadata(response.Resource ?? entity, response.ETag);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.Conflict)
        {
            logger.LogWarning("Conflict creating {Type} id={Id}", typeof(T).Name, entity.Id);
            throw;
        }
    }

    public async Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        try
        {
            entity.TouchUpdatedAt();
            ItemRequestOptions? options = null;
            if (!string.IsNullOrWhiteSpace(entity.ETag))
                options = new ItemRequestOptions { IfMatchEtag = entity.ETag };

            var response = await _container.ReplaceItemAsync(entity, entity.Id,
                new PartitionKey(entity.SocietyId), options, ct);
            return ApplyResponseMetadata(response.Resource ?? entity, response.ETag);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.PreconditionFailed)
        {
            logger.LogWarning("ETag mismatch updating {Type} id={Id}", typeof(T).Name, entity.Id);
            throw;
        }
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
            results.AddRange(page.Select(item => ApplyResponseMetadata(item, null)));
        }
        return results;
    }

    protected async Task<IReadOnlyList<T>> ExecuteCrossPartitionQueryAsync(QueryDefinition query, CancellationToken ct)
    {
        var results = new List<T>();
        // MaxConcurrency caps the parallel partition fan-out; MaxItemCount limits per-page payload.
        var options = new QueryRequestOptions { MaxConcurrency = 10, MaxItemCount = 100 };
        using var feed = _container.GetItemQueryIterator<T>(query, requestOptions: options);
        while (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            results.AddRange(page.Select(item => ApplyResponseMetadata(item, null)));
        }
        return results;
    }

    // Cosmos caps a TransactionalBatch at 100 operations against one partition key.
    private const int TransactionalBatchLimit = 100;

    /// <summary>
    /// Writes many entities in one round trip per 100 items using TransactionalBatch —
    /// Cosmos's native "multiple rows in a single call". Entities are grouped by societyId
    /// (each batch must target one partition); each batch is atomic, distinct batches are not.
    /// </summary>
    protected async Task WriteManyCoreAsync(IReadOnlyList<T> entities, bool replace, CancellationToken ct)
    {
        if (entities.Count == 0) return;

        foreach (var partition in entities.GroupBy(e => e.SocietyId, StringComparer.Ordinal))
        {
            foreach (var chunk in partition.Chunk(TransactionalBatchLimit))
            {
                var batch = _container.CreateTransactionalBatch(new PartitionKey(partition.Key));
                foreach (var entity in chunk)
                {
                    if (replace)
                    {
                        entity.TouchUpdatedAt();
                        var options = string.IsNullOrWhiteSpace(entity.ETag)
                            ? null
                            : new TransactionalBatchItemRequestOptions { IfMatchEtag = entity.ETag };
                        batch.ReplaceItem(entity.Id, entity, options);
                    }
                    else
                    {
                        batch.CreateItem(entity);
                    }
                }

                using var response = await batch.ExecuteAsync(ct);
                if (!response.IsSuccessStatusCode)
                {
                    logger.LogError("Batch {Op} of {Count} {Type} items failed with {Status}",
                        replace ? "replace" : "create", chunk.Length, typeof(T).Name, response.StatusCode);
                    throw new InvalidOperationException(
                        $"Batch write of {chunk.Length} {typeof(T).Name} items failed with status {response.StatusCode}.");
                }
            }
        }
    }

    /// <summary>Deletes many ids from one partition in 100-item batches. A batch aborted by a
    /// concurrent deletion (404 aborts the whole atomic batch) falls back to per-item deletes,
    /// which tolerate missing documents like <see cref="DeleteAsync"/> does.</summary>
    protected async Task DeleteManyCoreAsync(string societyId, IReadOnlyList<string> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return;

        foreach (var chunk in ids.Chunk(TransactionalBatchLimit))
        {
            var batch = _container.CreateTransactionalBatch(new PartitionKey(societyId));
            foreach (var id in chunk)
                batch.DeleteItem(id);

            using var response = await batch.ExecuteAsync(ct);
            if (response.IsSuccessStatusCode)
                continue;

            foreach (var id in chunk)
                await DeleteAsync(id, societyId, ct);
        }
    }

    private static T ApplyResponseMetadata(T entity, string? etag)
    {
        if (!string.IsNullOrWhiteSpace(etag))
            entity.ETag = etag;

        return entity;
    }
}
