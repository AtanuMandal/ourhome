using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Net;

namespace ApartmentManagement.Infrastructure;

/// <summary>
/// Ensures the application's Cosmos DB database and all its containers exist.
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
        // ── Core multi-tenancy: societies, apartments, users ────────────────────────────
        new("societies",  "/societyId"),
        new("apartments", "/societyId"),
        new("users",      "/societyId"),

        // ── Day-to-day resident-facing activity ─────────────────────────────────────────
        new("amenities",        "/societyId"),
        new("amenity_bookings", "/societyId"),
        new("complaints",       "/societyId"),
        new("notices",          "/societyId"),
        new("visitor-logs",     "/societyId"),
        new("sos_alerts",       "/societyId"),

        // ── Workforce roster, shifts, and attendance ────────────────────────────────────
        new("shifts",           "/societyId"),
        new("staff",            "/societyId"),
        new("staff_attendance", "/societyId"),

        // ── Maintenance billing, fees, and vendor expense management ───────────────────
        new("maintenance_schedules",         "/societyId"),
        new("maintenance_charges",           "/societyId"),
        new("maintenance_charge_grid_views", "/societyId"),
        new("fee-schedules",                 "/societyId"),
        new("fee-payments",                  "/societyId"),
        new("vendors",                       "/societyId"),
        new("vendor_recurring_schedules",    "/societyId"),
        new("vendor_charges",                "/societyId"),

        // ── Community engagement and the local services marketplace ────────────────────
        new("competitions",        "/societyId"),
        new("competition_entries", "/societyId"),
        new("reward_points",       "/societyId"),
        new("service_providers",   "/societyId"),
        new("service_requests",    "/societyId"),
        new("polls",               "/societyId"),
        new("poll-votes",          "/societyId"),
        new("agm-sessions",        "/societyId"),

        // ── Cross-cutting messaging/notification infrastructure ────────────────────────
        new("outbox",             "/societyId"),
        new("outbox-leases",      "/id"),
        new("push-subscriptions", "/societyId"),
        new("mobile-push-tokens", "/societyId"),
    ];

    private static readonly IndexingPolicy DefaultIndexingPolicy = new()
    {
        IndexingMode = IndexingMode.Consistent,
        IncludedPaths = { new IncludedPath { Path = "/*" } },
        ExcludedPaths = { new ExcludedPath { Path = "/\"_etag\"/?" } },
    };

    public static async Task InitializeAsync(CosmosClient client, InfrastructureSettings settings, ILogger? logger = null)
    {
        var databaseName = settings.CosmosDbDatabaseName;
        Console.WriteLine($"CosmosDB init: ensuring database '{databaseName}' exists");

        var dbResponse = await client.CreateDatabaseIfNotExistsAsync(databaseName);
        var database = dbResponse.Database;

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
                Console.WriteLine($"CosmosDB init: created container '{spec.Name}' in '{databaseName}'");
                created++;
            }
        }

        if (created == 0)
            Console.WriteLine($"CosmosDB init: all {Containers.Length} containers already exist in '{databaseName}'");
        else
            Console.WriteLine($"CosmosDB init: {created} container(s) created in '{databaseName}'");

    }
}
