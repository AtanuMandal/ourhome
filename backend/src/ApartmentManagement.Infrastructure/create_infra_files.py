"""
Creates all Infrastructure project directories and source files.
Run with: python create_infra_files.py
"""
import os

BASE = r"C:\01. Atanu\Code\apartment_management\backend\src\ApartmentManagement.Infrastructure"

# ── Directories ──────────────────────────────────────────────────────────────
os.makedirs(os.path.join(BASE, "Persistence", "Repositories"), exist_ok=True)
os.makedirs(os.path.join(BASE, "Services"), exist_ok=True)

# ── File content map  (relative_path → content) ──────────────────────────────
FILES = {}

FILES["Persistence/CosmosDbSettings.cs"] = '''\
namespace ApartmentManagement.Infrastructure.Persistence;

public class CosmosDbSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public string AccountEndpoint { get; set; } = string.Empty;
    public string AccountKey { get; set; } = string.Empty;
    public string SocietiesContainer { get; set; } = "societies";
    public string ApartmentsContainer { get; set; } = "apartments";
    public string UsersContainer { get; set; } = "users";
    public string AmenitiesContainer { get; set; } = "amenities";
    public string AmenityBookingsContainer { get; set; } = "amenity-bookings";
    public string ComplaintsContainer { get; set; } = "complaints";
    public string NoticesContainer { get; set; } = "notices";
    public string VisitorLogsContainer { get; set; } = "visitor-logs";
    public string FeeSchedulesContainer { get; set; } = "fee-schedules";
    public string FeePaymentsContainer { get; set; } = "fee-payments";
    public string CompetitionsContainer { get; set; } = "competitions";
    public string CompetitionEntriesContainer { get; set; } = "competition-entries";
    public string RewardPointsContainer { get; set; } = "reward-points";
    public string ServiceProvidersContainer { get; set; } = "service-providers";
    public string ServiceRequestsContainer { get; set; } = "service-requests";
}
'''

FILES["Persistence/CosmosNewtonsoftSerializer.cs"] = '''\
using Microsoft.Azure.Cosmos;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Reflection;
using System.Text;

namespace ApartmentManagement.Infrastructure.Persistence;

/// <summary>CosmosDB serializer using Newtonsoft.Json with private setter support.</summary>
internal sealed class CosmosNewtonsoftSerializer : CosmosSerializer
{
    private static readonly Encoding DefaultEncoding = new UTF8Encoding(false, true);

    private readonly JsonSerializer _serializer;

    public CosmosNewtonsoftSerializer()
    {
        _serializer = JsonSerializer.Create(new JsonSerializerSettings
        {
            ContractResolver = new PrivateSetterContractResolver(),
            NullValueHandling = NullValueHandling.Ignore,
            DateFormatHandling = DateFormatHandling.IsoDateFormat,
            DateTimeZoneHandling = DateTimeZoneHandling.Utc,
            ConstructorHandling = ConstructorHandling.AllowNonPublicDefaultConstructor
        });
    }

    public override T FromStream<T>(Stream stream)
    {
        using var sr = new StreamReader(stream);
        using var reader = new JsonTextReader(sr);
        return _serializer.Deserialize<T>(reader)!;
    }

    public override Stream ToStream<T>(T input)
    {
        var ms = new MemoryStream();
        using (var sw = new StreamWriter(ms, DefaultEncoding, 1024, leaveOpen: true))
        using (var writer = new JsonTextWriter(sw) { Formatting = Formatting.None })
        {
            _serializer.Serialize(writer, input);
        }
        ms.Position = 0;
        return ms;
    }

    private sealed class PrivateSetterContractResolver : CamelCasePropertyNamesContractResolver
    {
        protected override JsonProperty CreateProperty(MemberInfo member, MemberSerialization memberSerialization)
        {
            var property = base.CreateProperty(member, memberSerialization);
            if (!property.Writable && member is PropertyInfo pi)
                property.Writable = pi.GetSetMethod(nonPublic: true) != null;
            return property;
        }
    }
}
'''

FILES["Persistence/CosmosDbRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Infrastructure.Persistence;

/// <summary>
/// Generic Cosmos DB repository base. Partition key is always the entity SocietyId.
/// </summary>
public abstract class CosmosDbRepository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly Container _container;
    protected readonly ILogger _logger;

    protected CosmosDbRepository(CosmosClient client, string databaseName, string containerName, ILogger logger)
    {
        _container = client.GetContainer(databaseName, containerName);
        _logger = logger;
    }

    public virtual async Task<T?> GetByIdAsync(string id, string societyId, CancellationToken ct = default)
    {
        try
        {
            var response = await _container.ReadItemAsync<T>(id, new PartitionKey(societyId), cancellationToken: ct);
            var item = response.Resource;
            item.ETag = response.ETag;
            return item;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @societyId")
            .WithParameter("@societyId", societyId);
        return await ExecuteQueryAsync(query, ct);
    }

    public virtual async Task<T> CreateAsync(T entity, CancellationToken ct = default)
    {
        var response = await _container.CreateItemAsync(entity, new PartitionKey(entity.SocietyId), cancellationToken: ct);
        entity.ETag = response.ETag;
        return entity;
    }

    public virtual async Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        var options = entity.ETag is not null
            ? new ItemRequestOptions { IfMatchEtag = entity.ETag }
            : null;
        try
        {
            var response = await _container.ReplaceItemAsync(
                entity, entity.Id, new PartitionKey(entity.SocietyId),
                options, cancellationToken: ct);
            entity.ETag = response.ETag;
            return entity;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PreconditionFailed)
        {
            throw new InvalidOperationException($"Concurrency conflict updating {typeof(T).Name} {entity.Id}. The item was modified by another process.", ex);
        }
    }

    public virtual async Task DeleteAsync(string id, string societyId, CancellationToken ct = default)
    {
        try
        {
            await _container.DeleteItemAsync<T>(id, new PartitionKey(societyId), cancellationToken: ct);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Already deleted — treat as success
        }
    }

    public virtual async Task<bool> ExistsAsync(string id, string societyId, CancellationToken ct = default)
    {
        try
        {
            await _container.ReadItemAsync<T>(id, new PartitionKey(societyId), cancellationToken: ct);
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    protected async Task<IReadOnlyList<T>> ExecuteQueryAsync(QueryDefinition query, CancellationToken ct)
    {
        var results = new List<T>();
        using var feed = _container.GetItemQueryIterator<T>(query);
        while (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            results.AddRange(page);
        }
        return results.AsReadOnly();
    }

    protected async Task<IReadOnlyList<T>> ExecuteQueryAsync(QueryDefinition query, QueryRequestOptions options, CancellationToken ct)
    {
        var results = new List<T>();
        using var feed = _container.GetItemQueryIterator<T>(query, requestOptions: options);
        while (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            results.AddRange(page);
        }
        return results.AsReadOnly();
    }
}
'''

FILES["Persistence/Repositories/SocietyRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class SocietyRepository : CosmosDbRepository<Society>, ISocietyRepository
{
    public SocietyRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<SocietyRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.SocietiesContainer, logger) { }

    public async Task<Society?> GetByRegistrationNumberAsync(string registrationNumber, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.registrationNumber = @reg")
            .WithParameter("@reg", registrationNumber);
        var results = await ExecuteQueryAsync(query, ct);
        return results.FirstOrDefault();
    }

    public async Task<IReadOnlyList<Society>> GetByStatusAsync(SocietyStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, ct);
    }

    public async Task<int> CountAsync(CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c");
        using var feed = _container.GetItemQueryIterator<int>(query);
        if (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            return page.FirstOrDefault();
        }
        return 0;
    }
}
'''

FILES["Persistence/Repositories/ApartmentRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class ApartmentRepository : CosmosDbRepository<Apartment>, IApartmentRepository
{
    public ApartmentRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<ApartmentRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.ApartmentsContainer, logger) { }

    public async Task<Apartment?> GetByUnitNumberAsync(string societyId, string block, string unitNumber, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.blockName = @block AND c.apartmentNumber = @unit")
            .WithParameter("@sid", societyId)
            .WithParameter("@block", block.ToUpperInvariant())
            .WithParameter("@unit", unitNumber.ToUpperInvariant());
        var results = await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
        return results.FirstOrDefault();
    }

    public async Task<IReadOnlyList<Apartment>> GetByStatusAsync(string societyId, ApartmentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<Apartment>> GetByOwnerAsync(string societyId, string ownerUserId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.ownerId = @owner")
            .WithParameter("@sid", societyId)
            .WithParameter("@owner", ownerUserId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<Apartment>> GetByTenantAsync(string societyId, string tenantUserId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.tenantId = @tenant")
            .WithParameter("@sid", societyId)
            .WithParameter("@tenant", tenantUserId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<int> CountBySocietyAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.societyId = @sid")
            .WithParameter("@sid", societyId);
        using var feed = _container.GetItemQueryIterator<int>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) });
        if (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync(ct);
            return page.FirstOrDefault();
        }
        return 0;
    }
}
'''

FILES["Persistence/Repositories/UserRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class UserRepository : CosmosDbRepository<User>, IUserRepository
{
    public UserRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<UserRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.UsersContainer, logger) { }

    public async Task<User?> GetByEmailAsync(string societyId, string email, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.email = @email")
            .WithParameter("@sid", societyId)
            .WithParameter("@email", email);
        var results = await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
        return results.FirstOrDefault();
    }

    public async Task<User?> GetByPhoneAsync(string societyId, string phone, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.phone = @phone")
            .WithParameter("@sid", societyId)
            .WithParameter("@phone", phone);
        var results = await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
        return results.FirstOrDefault();
    }

    public async Task<User?> GetByExternalAuthIdAsync(string externalAuthId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.externalAuthId = @id")
            .WithParameter("@id", externalAuthId);
        // Cross-partition query — no PartitionKey set
        var results = await ExecuteQueryAsync(query, ct);
        return results.FirstOrDefault();
    }

    public async Task<IReadOnlyList<User>> GetByRoleAsync(string societyId, UserRole role, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.role = @role OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@role", role.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/AmenityRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class AmenityRepository : CosmosDbRepository<Amenity>, IAmenityRepository
{
    public AmenityRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<AmenityRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.AmenitiesContainer, logger) { }

    public async Task<IReadOnlyList<Amenity>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/AmenityBookingRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class AmenityBookingRepository : CosmosDbRepository<AmenityBooking>, IAmenityBookingRepository
{
    public AmenityBookingRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<AmenityBookingRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.AmenityBookingsContainer, logger) { }

    public async Task<IReadOnlyList<AmenityBooking>> GetByAmenityAsync(string societyId, string amenityId, DateOnly date, CancellationToken ct = default)
    {
        var start = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var end = start.AddDays(1);
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.amenityId = @aid AND c.startTime >= @start AND c.startTime < @end")
            .WithParameter("@sid", societyId)
            .WithParameter("@aid", amenityId)
            .WithParameter("@start", start)
            .WithParameter("@end", end);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<AmenityBooking>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.bookedByUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@uid", userId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<AmenityBooking>> GetByStatusAsync(string societyId, BookingStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/ComplaintRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class ComplaintRepository : CosmosDbRepository<Complaint>, IComplaintRepository
{
    public ComplaintRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<ComplaintRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.ComplaintsContainer, logger) { }

    public async Task<IReadOnlyList<Complaint>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.raisedByUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@uid", userId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<Complaint>> GetByStatusAsync(string societyId, ComplaintStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<Complaint>> GetByAssigneeAsync(string societyId, string assignedToUserId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.assignedToUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@uid", assignedToUserId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/NoticeRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class NoticeRepository : CosmosDbRepository<Notice>, INoticeRepository
{
    public NoticeRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<NoticeRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.NoticesContainer, logger) { }

    public async Task<IReadOnlyList<Notice>> GetActiveAsync(string societyId, int page, int pageSize, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.isArchived = false AND c.publishAt <= @now " +
            "AND (NOT IS_DEFINED(c.expiresAt) OR c.expiresAt IS NULL OR c.expiresAt > @now) OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@now", now)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<Notice>> GetExpiredAsync(string societyId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.isArchived = false AND IS_DEFINED(c.expiresAt) AND c.expiresAt != null AND c.expiresAt < @now")
            .WithParameter("@sid", societyId)
            .WithParameter("@now", now);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/VisitorLogRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class VisitorLogRepository : CosmosDbRepository<VisitorLog>, IVisitorLogRepository
{
    public VisitorLogRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<VisitorLogRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.VisitorLogsContainer, logger) { }

    public async Task<IReadOnlyList<VisitorLog>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.hostApartmentId = @aid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@aid", apartmentId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<VisitorLog>> GetActiveVisitorsAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = \'CheckedIn\'")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<VisitorLog?> GetByPassCodeAsync(string passCode, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.passCode = @code")
            .WithParameter("@code", passCode);
        // Cross-partition query — no PartitionKey set
        var results = await ExecuteQueryAsync(query, ct);
        return results.FirstOrDefault();
    }
}
'''

FILES["Persistence/Repositories/FeeScheduleRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class FeeScheduleRepository : CosmosDbRepository<FeeSchedule>, IFeeScheduleRepository
{
    public FeeScheduleRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<FeeScheduleRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.FeeSchedulesContainer, logger) { }

    public async Task<IReadOnlyList<FeeSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<FeeSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.apartmentId = @aid")
            .WithParameter("@sid", societyId)
            .WithParameter("@aid", apartmentId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/FeePaymentRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class FeePaymentRepository : CosmosDbRepository<FeePayment>, IFeePaymentRepository
{
    public FeePaymentRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<FeePaymentRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.FeePaymentsContainer, logger) { }

    public async Task<IReadOnlyList<FeePayment>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.apartmentId = @aid ORDER BY c.dueDate DESC OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@aid", apartmentId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetOverdueAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = \'Overdue\'")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(withinDays);
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = \'Pending\' AND c.dueDate <= @cutoff")
            .WithParameter("@sid", societyId)
            .WithParameter("@cutoff", cutoff);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/CompetitionRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class CompetitionRepository : CosmosDbRepository<Competition>, ICompetitionRepository
{
    public CompetitionRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<CompetitionRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.CompetitionsContainer, logger) { }

    public async Task<IReadOnlyList<Competition>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = \'Active\'")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<Competition>> GetByStatusAsync(string societyId, CompetitionStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/CompetitionEntryRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class CompetitionEntryRepository : CosmosDbRepository<CompetitionEntry>, ICompetitionEntryRepository
{
    public CompetitionEntryRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<CompetitionEntryRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.CompetitionEntriesContainer, logger) { }

    public async Task<IReadOnlyList<CompetitionEntry>> GetByCompetitionAsync(string societyId, string competitionId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.competitionId = @cid")
            .WithParameter("@sid", societyId)
            .WithParameter("@cid", competitionId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<CompetitionEntry>> GetLeaderboardAsync(string societyId, string competitionId, int topN, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.competitionId = @cid ORDER BY c.score DESC OFFSET 0 LIMIT @topN")
            .WithParameter("@sid", societyId)
            .WithParameter("@cid", competitionId)
            .WithParameter("@topN", topN);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<CompetitionEntry?> GetUserEntryAsync(string societyId, string competitionId, string userId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.competitionId = @cid AND c.userId = @uid")
            .WithParameter("@sid", societyId)
            .WithParameter("@cid", competitionId)
            .WithParameter("@uid", userId);
        var results = await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
        return results.FirstOrDefault();
    }
}
'''

FILES["Persistence/Repositories/RewardPointsRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class RewardPointsRepository : CosmosDbRepository<RewardPoints>, IRewardPointsRepository
{
    public RewardPointsRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<RewardPointsRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.RewardPointsContainer, logger) { }

    public async Task<RewardPoints?> GetByUserAsync(string societyId, string userId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.userId = @uid")
            .WithParameter("@sid", societyId)
            .WithParameter("@uid", userId);
        var results = await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
        return results.FirstOrDefault();
    }

    public async Task<IReadOnlyList<RewardPoints>> GetLeaderboardAsync(string societyId, int topN, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid ORDER BY c.points DESC OFFSET 0 LIMIT @topN")
            .WithParameter("@sid", societyId)
            .WithParameter("@topN", topN);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/ServiceProviderRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class ServiceProviderRepository : CosmosDbRepository<ServiceProvider>, IServiceProviderRepository
{
    public ServiceProviderRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<ServiceProviderRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.ServiceProvidersContainer, logger) { }

    public async Task<IReadOnlyList<ServiceProvider>> GetByServiceTypeAsync(string societyId, string serviceType, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND ARRAY_CONTAINS(c.serviceTypes, @type) OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@type", serviceType)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<ServiceProvider>> GetApprovedAsync(string societyId, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = \'Approved\'")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Persistence/Repositories/ServiceProviderRequestRepository.cs"] = '''\
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Persistence.Repositories;

public sealed class ServiceProviderRequestRepository : CosmosDbRepository<ServiceProviderRequest>, IServiceProviderRequestRepository
{
    public ServiceProviderRequestRepository(CosmosClient client, IOptions<CosmosDbSettings> settings, ILogger<ServiceProviderRequestRepository> logger)
        : base(client, settings.Value.DatabaseName, settings.Value.ServiceRequestsContainer, logger) { }

    public async Task<IReadOnlyList<ServiceProviderRequest>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.requestedByUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@uid", userId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<ServiceProviderRequest>> GetByStatusAsync(string societyId, ServiceRequestStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }

    public async Task<IReadOnlyList<ServiceProviderRequest>> GetByProviderAsync(string societyId, string providerId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.acceptedByProviderId = @pid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@pid", providerId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(query, new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) }, ct);
    }
}
'''

FILES["Services/NotificationService.cs"] = '''\
using ApartmentManagement.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Infrastructure.Services;

public sealed class NotificationService : INotificationService
{
    private readonly ILogger<NotificationService> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public NotificationService(ILogger<NotificationService> logger, IConfiguration configuration, HttpClient httpClient)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
    }

    public async Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Sending email to {To} with subject \'{Subject}\'", to, subject);
            // TODO: Integrate with SendGrid
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send email to {To}. Non-critical, continuing.", to);
        }
    }

    public async Task SendSmsAsync(string phone, string message, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Sending SMS to {Phone}", phone);
            // TODO: Integrate with Azure Communication Services SMS
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SMS to {Phone}. Non-critical, continuing.", phone);
        }
    }

    public async Task SendPushNotificationAsync(string userId, string title, string body, CancellationToken ct = default)
    {
        try
        {
            _logger.LogInformation("Sending push notification to user {UserId}: {Title}", userId, title);
            // TODO: Integrate with Azure Notification Hubs or Firebase FCM
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send push notification to user {UserId}. Non-critical, continuing.", userId);
        }
    }

    public async Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default)
    {
        try
        {
            var recipientList = recipients.ToList();
            _logger.LogInformation("Sending bulk email to {Count} recipients with subject \'{Subject}\'", recipientList.Count, subject);
            // TODO: Integrate with SendGrid bulk send API
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send bulk email. Non-critical, continuing.");
        }
    }
}
'''

FILES["Services/EventPublisher.cs"] = '''\
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Events;
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ApartmentManagement.Infrastructure.Services;

public sealed class EventPublisher : IEventPublisher
{
    private readonly ServiceBusClient _serviceBusClient;
    private readonly ILogger<EventPublisher> _logger;

    public EventPublisher(ServiceBusClient serviceBusClient, ILogger<EventPublisher> logger)
    {
        _serviceBusClient = serviceBusClient;
        _logger = logger;
    }

    public async Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent
    {
        var topicName = GetTopicName(typeof(T).Name);
        try
        {
            var sender = _serviceBusClient.CreateSender(topicName);
            var messageBody = JsonSerializer.Serialize(domainEvent, domainEvent.GetType());
            var message = new ServiceBusMessage(messageBody)
            {
                ContentType = "application/json",
                MessageId = domainEvent.EventId.ToString()
            };
            message.ApplicationProperties["EventType"] = typeof(T).Name;
            message.ApplicationProperties["SocietyId"] = domainEvent.SocietyId;
            message.ApplicationProperties["OccurredAt"] = domainEvent.OccurredAt.ToString("O");
            message.ApplicationProperties["EventId"] = domainEvent.EventId.ToString();

            await sender.SendMessageAsync(message, ct);
            _logger.LogInformation("Published event {EventType} to topic {Topic}", typeof(T).Name, topicName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish event {EventType} to topic {Topic}. Non-critical.", typeof(T).Name, topicName);
        }
    }

    public async Task PublishManyAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default)
    {
        foreach (var @event in events)
        {
            var method = GetType().GetMethod(nameof(PublishAsync))!.MakeGenericMethod(@event.GetType());
            await (Task)method.Invoke(this, [@event, ct])!;
        }
    }

    private static string GetTopicName(string eventTypeName)
    {
        // SocietyCreatedEvent → society-created
        var name = eventTypeName.EndsWith("Event") ? eventTypeName[..^5] : eventTypeName;
        return Regex.Replace(name, "(?<=[a-z])([A-Z])", "-$1").ToLowerInvariant();
    }
}
'''

FILES["Services/QrCodeService.cs"] = '''\
using ApartmentManagement.Application.Interfaces;
using Microsoft.Extensions.Logging;
using QRCoder;

namespace ApartmentManagement.Infrastructure.Services;

public sealed class QrCodeService : IQrCodeService
{
    private readonly ILogger<QrCodeService> _logger;

    public QrCodeService(ILogger<QrCodeService> logger)
    {
        _logger = logger;
    }

    public Task<string> GenerateQrCodeBase64Async(string data, CancellationToken ct = default)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(data, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrData);
        var bytes = qrCode.GetGraphic(20);
        return Task.FromResult(Convert.ToBase64String(bytes));
    }

    public bool ValidateQrCode(string qrData, string expectedData)
    {
        return string.Equals(qrData, expectedData, StringComparison.Ordinal);
    }
}
'''

FILES["Services/InMemoryRateLimitService.cs"] = '''\
using ApartmentManagement.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Infrastructure.Services;

public sealed class InMemoryRateLimitService : IRateLimitService
{
    private const int DefaultUserLimit = 100;
    private const int DefaultSocietyLimit = 1000;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private readonly IMemoryCache _cache;
    private readonly ILogger<InMemoryRateLimitService> _logger;

    public InMemoryRateLimitService(IMemoryCache cache, ILogger<InMemoryRateLimitService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public Task<bool> IsAllowedAsync(string userId, string societyId, string endpoint, CancellationToken ct = default)
    {
        var userKey = $"rl:user:{userId}:{endpoint}";
        var societyKey = $"rl:society:{societyId}:{endpoint}";

        var userCount = IncrementCounter(userKey);
        var societyCount = IncrementCounter(societyKey);

        var allowed = userCount <= DefaultUserLimit && societyCount <= DefaultSocietyLimit;
        if (!allowed)
            _logger.LogWarning("Rate limit exceeded for user {UserId} on {Endpoint} (user:{UserCount}, society:{SocietyCount})",
                userId, endpoint, userCount, societyCount);
        return Task.FromResult(allowed);
    }

    public Task<int> GetRemainingCallsAsync(string userId, string endpoint, CancellationToken ct = default)
    {
        var userKey = $"rl:user:{userId}:{endpoint}";
        var current = _cache.TryGetValue<int>(userKey, out var count) ? count : 0;
        return Task.FromResult(Math.Max(0, DefaultUserLimit - current));
    }

    private int IncrementCounter(string key)
    {
        return _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = Window;
            return 0;
        }) is int current
            ? _cache.Set(key, current + 1, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = Window
            })
            : 1;
    }
}
'''

FILES["Services/HttpContextCurrentUserService.cs"] = '''\
using ApartmentManagement.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace ApartmentManagement.Infrastructure.Services;

public sealed class HttpContextCurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public string UserId => User?.FindFirstValue("sub") ?? User?.FindFirstValue("oid") ?? string.Empty;
    public string SocietyId => User?.FindFirstValue("society_id") ?? string.Empty;
    public string Email => User?.FindFirstValue(ClaimTypes.Email) ?? User?.FindFirstValue("email") ?? string.Empty;
    public string Role => User?.FindFirstValue(ClaimTypes.Role) ?? User?.FindFirstValue("roles") ?? string.Empty;
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool IsInRole(string role) =>
        User?.IsInRole(role) ?? false;

    public bool IsInRoles(params string[] roles) =>
        roles.Any(r => User?.IsInRole(r) ?? false);
}
'''

FILES["DependencyInjection.cs"] = '''\
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Infrastructure.Persistence;
using ApartmentManagement.Infrastructure.Persistence.Repositories;
using ApartmentManagement.Infrastructure.Services;
using Azure.Messaging.ServiceBus;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // CosmosDB settings
        services.Configure<CosmosDbSettings>(configuration.GetSection("CosmosDb"));

        // CosmosDB client — singleton, using custom Newtonsoft.Json serializer for private setter support
        services.AddSingleton<CosmosClient>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<CosmosDbSettings>>().Value;
            return new CosmosClient(
                settings.ConnectionString,
                new CosmosClientOptions
                {
                    Serializer = new CosmosNewtonsoftSerializer()
                });
        });

        // Repositories (scoped)
        services.AddScoped<ISocietyRepository, SocietyRepository>();
        services.AddScoped<IApartmentRepository, ApartmentRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAmenityRepository, AmenityRepository>();
        services.AddScoped<IAmenityBookingRepository, AmenityBookingRepository>();
        services.AddScoped<IComplaintRepository, ComplaintRepository>();
        services.AddScoped<INoticeRepository, NoticeRepository>();
        services.AddScoped<IVisitorLogRepository, VisitorLogRepository>();
        services.AddScoped<IFeeScheduleRepository, FeeScheduleRepository>();
        services.AddScoped<IFeePaymentRepository, FeePaymentRepository>();
        services.AddScoped<ICompetitionRepository, CompetitionRepository>();
        services.AddScoped<ICompetitionEntryRepository, CompetitionEntryRepository>();
        services.AddScoped<IRewardPointsRepository, RewardPointsRepository>();
        services.AddScoped<IServiceProviderRepository, ServiceProviderRepository>();
        services.AddScoped<IServiceProviderRequestRepository, ServiceProviderRequestRepository>();

        // Azure Service Bus
        services.AddSingleton(sp =>
        {
            var connStr = configuration["ServiceBus:ConnectionString"];
            return string.IsNullOrWhiteSpace(connStr)
                ? new ServiceBusClient("Endpoint=sb://placeholder.servicebus.windows.net/;SharedAccessKeyName=placeholder;SharedAccessKey=placeholder")
                : new ServiceBusClient(connStr);
        });

        // Application services
        services.AddScoped<IEventPublisher, EventPublisher>();
        services.AddScoped<IQrCodeService, QrCodeService>();
        services.AddSingleton<IRateLimitService, InMemoryRateLimitService>();
        services.AddMemoryCache();

        // Notification service with named HttpClient
        services.AddHttpClient<INotificationService, NotificationService>();

        // Current user service
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, HttpContextCurrentUserService>();

        return services;
    }
}
'''

# ── Write files ──────────────────────────────────────────────────────────────
created = []
for rel_path, content in FILES.items():
    full_path = os.path.join(BASE, rel_path.replace("/", os.sep))
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    created.append(full_path)
    print(f"  Created: {rel_path}")

print(f"\nDone — {len(created)} files written.")
