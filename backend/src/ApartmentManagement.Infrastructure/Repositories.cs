using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Infrastructure.Persistence;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

using DomainUser = ApartmentManagement.Domain.Entities.User;

namespace ApartmentManagement.Infrastructure.Repositories;

public class SocietyRepository(CosmosClient client, string dbName, ILogger<SocietyRepository> logger)
    : CosmosDbRepository<Society>(client, dbName, "societies", logger), ISocietyRepository
{
    public async Task<Society?> GetByRegistrationNumberAsync(string registrationNumber, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.registrationNumber = @reg")
            .WithParameter("@reg", registrationNumber);
        var results = await ExecuteCrossPartitionQueryAsync(q, ct);
        return results.FirstOrDefault();
    }

    public async Task<IReadOnlyList<Society>> GetByStatusAsync(SocietyStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }

    public async Task<int> CountAsync(CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT VALUE COUNT(1) FROM c");
        var results = new List<int>();
        using var feed = _container.GetItemQueryIterator<int>(q);
        while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync(ct));
        return results.FirstOrDefault();
    }
}

public class ApartmentRepository(CosmosClient client, string dbName, ILogger<ApartmentRepository> logger)
    : CosmosDbRepository<Apartment>(client, dbName, "apartments", logger), IApartmentRepository
{
    public async Task<Apartment?> GetByUnitNumberAsync(string societyId, string block, string unitNumber, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.blockName = @block AND c.apartmentNumber = @unit")
            .WithParameter("@sid", societyId).WithParameter("@block", block).WithParameter("@unit", unitNumber);
        var results = await ExecuteQueryAsync(q, societyId, ct);
        return results.FirstOrDefault();
    }

    public async Task<IReadOnlyList<Apartment>> GetByStatusAsync(string societyId, ApartmentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Apartment>> GetByOwnerAsync(string societyId, string ownerUserId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.ownerId = @owner")
            .WithParameter("@sid", societyId).WithParameter("@owner", ownerUserId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Apartment>> GetByTenantAsync(string societyId, string tenantUserId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.tenantId = @tenant")
            .WithParameter("@sid", societyId).WithParameter("@tenant", tenantUserId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<int> CountBySocietyAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.societyId = @sid")
            .WithParameter("@sid", societyId);
        var results = new List<int>();
        var opts = new QueryRequestOptions { PartitionKey = new PartitionKey(societyId) };
        using var feed = _container.GetItemQueryIterator<int>(q, requestOptions: opts);
        while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync(ct));
        return results.FirstOrDefault();
    }
}

public class UserRepository(CosmosClient client, string dbName, ILogger<UserRepository> logger)
    : CosmosDbRepository<DomainUser>(client, dbName, "users", logger), IUserRepository
{
    public async Task<DomainUser?> GetByEmailAsync(string societyId, string email, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.email = @email")
            .WithParameter("@sid", societyId).WithParameter("@email", email);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }

    public async Task<DomainUser?> GetByPhoneAsync(string societyId, string phone, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.phone = @phone")
            .WithParameter("@sid", societyId).WithParameter("@phone", phone);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }

    public async Task<DomainUser?> GetByExternalAuthIdAsync(string externalAuthId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.externalAuthId = @ext")
            .WithParameter("@ext", externalAuthId);
        return (await ExecuteCrossPartitionQueryAsync(q, ct)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<DomainUser>> GetByRoleAsync(string societyId, UserRole role, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.role = @role OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@role", role.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class AmenityRepository(CosmosClient client, string dbName, ILogger<AmenityRepository> logger)
    : CosmosDbRepository<Amenity>(client, dbName, "amenities", logger), IAmenityRepository
{
    public async Task<IReadOnlyList<Amenity>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class AmenityBookingRepository(CosmosClient client, string dbName, ILogger<AmenityBookingRepository> logger)
    : CosmosDbRepository<AmenityBooking>(client, dbName, "amenity_bookings", logger), IAmenityBookingRepository
{
    public async Task<IReadOnlyList<AmenityBooking>> GetByAmenityAsync(string societyId, string amenityId, DateOnly date, CancellationToken ct = default)
    {
        var start = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).ToString("o");
        var end = date.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc).ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.amenityId = @aid AND c.startTime >= @start AND c.startTime <= @end")
            .WithParameter("@sid", societyId).WithParameter("@aid", amenityId)
            .WithParameter("@start", start).WithParameter("@end", end);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<AmenityBooking>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.bookedByUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@uid", userId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<AmenityBooking>> GetByStatusAsync(string societyId, BookingStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class ComplaintRepository(CosmosClient client, string dbName, ILogger<ComplaintRepository> logger)
    : CosmosDbRepository<Complaint>(client, dbName, "complaints", logger), IComplaintRepository
{
    public async Task<IReadOnlyList<Complaint>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.raisedByUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@uid", userId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Complaint>> GetByStatusAsync(string societyId, ComplaintStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Complaint>> GetByAssigneeAsync(string societyId, string assignedToUserId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.assignedToUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@uid", assignedToUserId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class NoticeRepository(CosmosClient client, string dbName, ILogger<NoticeRepository> logger)
    : CosmosDbRepository<Notice>(client, dbName, "notices", logger), INoticeRepository
{
    public async Task<IReadOnlyList<Notice>> GetActiveAsync(string societyId, int page, int pageSize, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isArchived = false AND c.publishAt <= @now AND (IS_NULL(c.expiresAt) OR c.expiresAt > @now) OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@now", now)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Notice>> GetExpiredAsync(string societyId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isArchived = false AND c.expiresAt < @now")
            .WithParameter("@sid", societyId).WithParameter("@now", now);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class VisitorLogRepository(CosmosClient client, string dbName, ILogger<VisitorLogRepository> logger)
    : CosmosDbRepository<VisitorLog>(client, dbName, "visitor_logs", logger), IVisitorLogRepository
{
    public async Task<IReadOnlyList<VisitorLog>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.hostApartmentId = @aid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@aid", apartmentId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<VisitorLog>> GetActiveVisitorsAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.checkOutTime = null")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<VisitorLog?> GetByPassCodeAsync(string passCode, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.passCode = @code")
            .WithParameter("@code", passCode);
        return (await ExecuteCrossPartitionQueryAsync(q, ct)).FirstOrDefault();
    }
}

public class FeeScheduleRepository(CosmosClient client, string dbName, ILogger<FeeScheduleRepository> logger)
    : CosmosDbRepository<FeeSchedule>(client, dbName, "fee_schedules", logger), IFeeScheduleRepository
{
    public async Task<IReadOnlyList<FeeSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeeSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.apartmentId = @aid")
            .WithParameter("@sid", societyId).WithParameter("@aid", apartmentId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class FeePaymentRepository(CosmosClient client, string dbName, ILogger<FeePaymentRepository> logger)
    : CosmosDbRepository<FeePayment>(client, dbName, "fee_payments", logger), IFeePaymentRepository
{
    public async Task<IReadOnlyList<FeePayment>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.apartmentId = @aid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@aid", apartmentId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetOverdueAsync(string societyId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status AND c.dueDate < @now")
            .WithParameter("@sid", societyId).WithParameter("@status", PaymentStatus.Pending.ToString()).WithParameter("@now", now);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default)
    {
        var start = DateTime.UtcNow.ToString("o");
        var end = DateTime.UtcNow.AddDays(withinDays).ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status AND c.dueDate >= @start AND c.dueDate <= @end")
            .WithParameter("@sid", societyId).WithParameter("@status", PaymentStatus.Pending.ToString())
            .WithParameter("@start", start).WithParameter("@end", end);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class CompetitionRepository(CosmosClient client, string dbName, ILogger<CompetitionRepository> logger)
    : CosmosDbRepository<Competition>(client, dbName, "competitions", logger), ICompetitionRepository
{
    public async Task<IReadOnlyList<Competition>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status")
            .WithParameter("@sid", societyId).WithParameter("@status", CompetitionStatus.Active.ToString());
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Competition>> GetByStatusAsync(string societyId, CompetitionStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class CompetitionEntryRepository(CosmosClient client, string dbName, ILogger<CompetitionEntryRepository> logger)
    : CosmosDbRepository<CompetitionEntry>(client, dbName, "competition_entries", logger), ICompetitionEntryRepository
{
    public async Task<IReadOnlyList<CompetitionEntry>> GetByCompetitionAsync(string societyId, string competitionId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.competitionId = @cid")
            .WithParameter("@sid", societyId).WithParameter("@cid", competitionId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<CompetitionEntry>> GetLeaderboardAsync(string societyId, string competitionId, int topN, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT TOP @topN * FROM c WHERE c.societyId = @sid AND c.competitionId = @cid ORDER BY c.score DESC")
            .WithParameter("@topN", topN).WithParameter("@sid", societyId).WithParameter("@cid", competitionId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<CompetitionEntry?> GetUserEntryAsync(string societyId, string competitionId, string userId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.competitionId = @cid AND c.userId = @uid")
            .WithParameter("@sid", societyId).WithParameter("@cid", competitionId).WithParameter("@uid", userId);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }
}

public class RewardPointsRepository(CosmosClient client, string dbName, ILogger<RewardPointsRepository> logger)
    : CosmosDbRepository<RewardPoints>(client, dbName, "reward_points", logger), IRewardPointsRepository
{
    public async Task<RewardPoints?> GetByUserAsync(string societyId, string userId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.userId = @uid")
            .WithParameter("@sid", societyId).WithParameter("@uid", userId);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<RewardPoints>> GetLeaderboardAsync(string societyId, int topN, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT TOP @topN * FROM c WHERE c.societyId = @sid ORDER BY c.points DESC")
            .WithParameter("@topN", topN).WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class ServiceProviderRepository(CosmosClient client, string dbName, ILogger<ServiceProviderRepository> logger)
    : CosmosDbRepository<ServiceProvider>(client, dbName, "service_providers", logger), IServiceProviderRepository
{
    public async Task<IReadOnlyList<ServiceProvider>> GetByServiceTypeAsync(string societyId, string serviceType, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND ARRAY_CONTAINS(c.serviceTypes, @type) OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@type", serviceType)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<ServiceProvider>> GetApprovedAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status")
            .WithParameter("@sid", societyId).WithParameter("@status", ServiceProviderStatus.Approved.ToString());
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class ServiceProviderRequestRepository(CosmosClient client, string dbName, ILogger<ServiceProviderRequestRepository> logger)
    : CosmosDbRepository<ServiceProviderRequest>(client, dbName, "service_requests", logger), IServiceProviderRequestRepository
{
    public async Task<IReadOnlyList<ServiceProviderRequest>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.requestedByUserId = @uid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@uid", userId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<ServiceProviderRequest>> GetByStatusAsync(string societyId, ServiceRequestStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<ServiceProviderRequest>> GetByProviderAsync(string societyId, string providerId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.acceptedByProviderId = @pid OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@pid", providerId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class OutboxRepository(CosmosClient client, string dbName, ILogger<OutboxRepository> logger)
    : CosmosDbRepository<OutboxRecord>(client, dbName, "outbox", logger), IOutboxRepository
{
    public async Task<IReadOnlyList<OutboxRecord>> GetPendingAsync(int maxCount = 100, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.status = 'Pending' ORDER BY c.createdAt OFFSET 0 LIMIT @limit")
            .WithParameter("@limit", maxCount);
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }
}
