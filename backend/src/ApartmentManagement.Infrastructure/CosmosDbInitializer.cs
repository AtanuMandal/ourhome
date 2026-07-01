using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ApartmentManagement.Infrastructure;

/// <summary>
/// Ensures the Cosmos DB database and every container the application depends on exist.
/// Safe to run at startup: CreateDatabaseIfNotExistsAsync / CreateContainerIfNotExistsAsync
/// are no-ops when the resource already exists.
/// </summary>
public static class CosmosDbInitializer
{
    private sealed record ContainerSpec(string Name, string PartitionKey);

    // Authoritative list — names must match what the repository classes pass to GetContainer().
    // outbox-leases uses /id (Change Feed lease container requirement).
    private static readonly ContainerSpec[] Containers =
    [
        new("societies",                     "/societyId"),
        new("apartments",                    "/societyId"),
        new("users",                         "/societyId"),
        new("amenities",                     "/societyId"),
        new("amenity_bookings",              "/societyId"),
        new("complaints",                    "/societyId"),
        new("notices",                       "/societyId"),
        new("visitor-logs",                  "/societyId"),
        new("maintenance_schedules",         "/societyId"),
        new("maintenance_charges",           "/societyId"),
        new("maintenance_charge_grid_views", "/societyId"),
        new("competitions",                  "/societyId"),
        new("competition_entries",           "/societyId"),
        new("reward_points",                 "/societyId"),
        new("service_providers",             "/societyId"),
        new("service_requests",              "/societyId"),
        new("vendors",                       "/societyId"),
        new("vendor_recurring_schedules",    "/societyId"),
        new("vendor_charges",               "/societyId"),
        new("fee-schedules",                 "/societyId"),
        new("fee-payments",                  "/societyId"),
        new("outbox",                        "/societyId"),
        new("outbox-leases",                 "/id"),
        new("push-subscriptions",            "/societyId"),
    ];

    private static readonly IndexingPolicy DefaultIndexingPolicy = new()
    {
        IndexingMode = IndexingMode.Consistent,
        IncludedPaths = { new IncludedPath { Path = "/*" } },
        ExcludedPaths = { new ExcludedPath { Path = "/\"_etag\"/?" } },
    };

    public static async Task InitializeAsync(CosmosClient client, string databaseName, ILogger? logger = null)
    {
        logger?.LogInformation("CosmosDB init: ensuring database '{Database}' exists", databaseName);

        var dbResponse = await client.CreateDatabaseIfNotExistsAsync(databaseName);
        var database   = dbResponse.Database;

        var created = 0;
        foreach (var spec in Containers)
        {
            var props = new ContainerProperties(spec.Name, spec.PartitionKey)
            {
                IndexingPolicy = DefaultIndexingPolicy,
            };

            var response = await database.CreateContainerIfNotExistsAsync(props);
            if (response.StatusCode == HttpStatusCode.Created)
            {
                logger?.LogInformation("CosmosDB init: created container '{Container}'", spec.Name);
                created++;
            }
        }

        if (created == 0)
            logger?.LogInformation("CosmosDB init: all {Count} containers already exist", Containers.Length);
        else
            logger?.LogInformation("CosmosDB init: {Created} container(s) created in '{Database}'", created, databaseName);
    }
}
