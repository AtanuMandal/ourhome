using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Net;

namespace ApartmentManagement.Infrastructure;

/// <summary>
/// Ensures every Cosmos DB database and container the application depends on exists.
/// Containers are split across several databases (see <see cref="CosmosDatabaseGroup"/>) —
/// all within the same Cosmos account/connection string — so no single database holds more
/// than ~10 containers. Safe to run at startup: CreateDatabaseIfNotExistsAsync /
/// CreateContainerIfNotExistsAsync are no-ops when the resource already exists.
/// </summary>
public static class CosmosDbInitializer
{
    private sealed record ContainerSpec(string Name, string PartitionKey, CosmosDatabaseGroup Group);

    // Authoritative list — names must match what the repository classes pass to GetContainer().
    // outbox-leases uses /id (Change Feed lease container requirement).
    private static readonly ContainerSpec[] Containers =
    [
        // ── Identity — core multi-tenancy: societies, apartments, users ────────────────
        new("societies",  "/societyId", CosmosDatabaseGroup.Identity),
        new("apartments", "/societyId", CosmosDatabaseGroup.Identity),
        new("users",      "/societyId", CosmosDatabaseGroup.Identity),

        // ── Operations — day-to-day resident-facing activity ───────────────────────────
        new("amenities",        "/societyId", CosmosDatabaseGroup.Operations),
        new("amenity_bookings", "/societyId", CosmosDatabaseGroup.Operations),
        new("complaints",       "/societyId", CosmosDatabaseGroup.Operations),
        new("notices",          "/societyId", CosmosDatabaseGroup.Operations),
        new("visitor-logs",     "/societyId", CosmosDatabaseGroup.Operations),

        // ── Staff — workforce roster, shifts, and attendance ───────────────────────────
        new("shifts",           "/societyId", CosmosDatabaseGroup.Staff),
        new("staff",            "/societyId", CosmosDatabaseGroup.Staff),
        new("staff_attendance", "/societyId", CosmosDatabaseGroup.Staff),

        // ── Finance — maintenance billing, fees, and vendor expense management ─────────
        new("maintenance_schedules",         "/societyId", CosmosDatabaseGroup.Finance),
        new("maintenance_charges",           "/societyId", CosmosDatabaseGroup.Finance),
        new("maintenance_charge_grid_views", "/societyId", CosmosDatabaseGroup.Finance),
        new("fee-schedules",                 "/societyId", CosmosDatabaseGroup.Finance),
        new("fee-payments",                  "/societyId", CosmosDatabaseGroup.Finance),
        new("vendors",                       "/societyId", CosmosDatabaseGroup.Finance),
        new("vendor_recurring_schedules",    "/societyId", CosmosDatabaseGroup.Finance),
        new("vendor_charges",                "/societyId", CosmosDatabaseGroup.Finance),

        // ── Engagement — community engagement and the local services marketplace ──────
        new("competitions",        "/societyId", CosmosDatabaseGroup.Engagement),
        new("competition_entries", "/societyId", CosmosDatabaseGroup.Engagement),
        new("reward_points",       "/societyId", CosmosDatabaseGroup.Engagement),
        new("service_providers",   "/societyId", CosmosDatabaseGroup.Engagement),
        new("service_requests",    "/societyId", CosmosDatabaseGroup.Engagement),

        // ── Platform — cross-cutting messaging/notification infrastructure ────────────
        new("outbox",             "/societyId", CosmosDatabaseGroup.Platform),
        new("outbox-leases",      "/id",        CosmosDatabaseGroup.Platform),
        new("push-subscriptions", "/societyId", CosmosDatabaseGroup.Platform),
        new("mobile-push-tokens", "/societyId", CosmosDatabaseGroup.Platform),
    ];

    private static readonly IndexingPolicy DefaultIndexingPolicy = new()
    {
        IndexingMode = IndexingMode.Consistent,
        IncludedPaths = { new IncludedPath { Path = "/*" } },
        ExcludedPaths = { new ExcludedPath { Path = "/\"_etag\"/?" } },
    };

    public static async Task InitializeAsync(CosmosClient client, InfrastructureSettings settings, ILogger? logger = null)
    {
        var created = 0;
        var groups = Containers.Select(c => c.Group).Distinct();

        foreach (var group in groups)
        {
            var databaseName = settings.GetDatabaseName(group);
            Console.WriteLine("CosmosDB init: ensuring database '{Database}' exists ({Group})", databaseName, group);

            var dbResponse = await client.CreateDatabaseIfNotExistsAsync(databaseName);
            var database = dbResponse.Database;

            foreach (var spec in Containers.Where(c => c.Group == group))
            {
                var props = new ContainerProperties(spec.Name, spec.PartitionKey)
                {
                    IndexingPolicy = DefaultIndexingPolicy,
                };

                var response = await database.CreateContainerIfNotExistsAsync(props);
                if (response.StatusCode == HttpStatusCode.Created)
                {
                    Console.WriteLine("CosmosDB init: created container '{Container}' in '{Database}'", spec.Name, databaseName);
                    created++;
                }
            }
        }

        if (created == 0)
            Console.WriteLine("CosmosDB init: all {Count} containers already exist across {DbCount} database(s)", Containers.Length, groups.Count());
        else
            Console.WriteLine("CosmosDB init: {Created} container(s) created across {DbCount} database(s)", created, groups.Count());
    }
}
