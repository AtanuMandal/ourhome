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

    public async Task<IReadOnlyList<Society>> GetAllAcrossSocietiesAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c OFFSET @offset LIMIT @limit")
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
    public async Task<Apartment?> GetByLocationAsync(string societyId, string blockName, string apartmentNumber, int floorNumber, CancellationToken ct = default)
    {
        var q = new QueryDefinition(@"
SELECT * FROM c
WHERE c.societyId = @sid
  AND c.apartmentNumber = @apartmentNumber
  AND c.blockName = @blockName
  AND c.floorNumber = @floorNumber")
            .WithParameter("@sid", societyId)
            .WithParameter("@apartmentNumber", apartmentNumber.Trim().ToUpperInvariant())
            .WithParameter("@blockName", blockName.Trim().ToUpperInvariant())
            .WithParameter("@floorNumber", floorNumber);
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
        var q = new QueryDefinition(@"
SELECT * FROM c
WHERE c.societyId = @sid
  AND (
    (IS_DEFINED(c.residents) AND ARRAY_CONTAINS(c.residents, { ""userId"": @userId, ""residentType"": @residentType }, true))
    OR c.ownerId = @userId
  )")
            .WithParameter("@sid", societyId)
            .WithParameter("@userId", ownerUserId)
            .WithParameter("@residentType", ResidentType.Owner.ToString());
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Apartment>> GetByTenantAsync(string societyId, string tenantUserId, CancellationToken ct = default)
    {
        var q = new QueryDefinition(@"
SELECT * FROM c
WHERE c.societyId = @sid
  AND (
    (IS_DEFINED(c.residents) AND ARRAY_CONTAINS(c.residents, { ""userId"": @userId, ""residentType"": @residentType }, true))
    OR c.tenantId = @userId
  )")
            .WithParameter("@sid", societyId)
            .WithParameter("@userId", tenantUserId)
            .WithParameter("@residentType", ResidentType.Tenant.ToString());
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

    public async Task<IReadOnlyList<DomainUser>> GetByEmailAcrossSocietiesAsync(string email, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.email = @email")
            .WithParameter("@email", email);
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }

    public async Task<DomainUser?> GetByPhoneAsync(string societyId, string phone, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.phone = @phone")
            .WithParameter("@sid", societyId).WithParameter("@phone", phone);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<DomainUser>> GetByPhoneAcrossSocietiesAsync(string phone, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.phone = @phone")
            .WithParameter("@phone", phone);
        return await ExecuteCrossPartitionQueryAsync(q, ct);
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
    : CosmosDbRepository<VisitorLog>(client, dbName, "visitor-logs", logger), IVisitorLogRepository
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
        // The Cosmos serializer uses NullValueHandling.Ignore, so a null checkOutTime is never
        // written to the document — it's missing, not JSON null. `c.checkOutTime = null` evaluates
        // to Undefined (excluded from the WHERE clause) against a missing property, so this must be
        // matched with IS_DEFINED/IS_NULL rather than `= null` (same fix as StaffAttendanceRepository).
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND (NOT IS_DEFINED(c.checkOutTime) OR IS_NULL(c.checkOutTime))")
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

public class MaintenanceScheduleRepository(CosmosClient client, string dbName, ILogger<MaintenanceScheduleRepository> logger)
    : CosmosDbRepository<MaintenanceSchedule>(client, dbName, "maintenance_schedules", logger), IMaintenanceScheduleRepository
{
    public async Task<IReadOnlyList<MaintenanceSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.ToString("o");
        var q = new QueryDefinition(@"
SELECT * FROM c
WHERE c.societyId = @sid
  AND c.activeFromDate <= @now
  AND (
    c.isActive = true
    OR (IS_DEFINED(c.inactiveFromDate) AND NOT IS_NULL(c.inactiveFromDate) AND c.inactiveFromDate > @now)
  )")
            .WithParameter("@sid", societyId)
            .WithParameter("@now", now);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<MaintenanceSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND (IS_NULL(c.apartmentId) OR c.apartmentId = @aid)")
            .WithParameter("@sid", societyId).WithParameter("@aid", apartmentId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<MaintenanceSchedule>> GetActiveDueOnAsync(DateTime dueOnUtc, CancellationToken ct = default)
    {
        var dueOn = dueOnUtc.ToString("o");
        var q = new QueryDefinition(@"
SELECT * FROM c
WHERE c.activeFromDate <= @dueOn
  AND c.nextDueDate <= @dueOn
  AND (
    c.isActive = true
    OR (IS_DEFINED(c.inactiveFromDate) AND NOT IS_NULL(c.inactiveFromDate) AND c.inactiveFromDate > @dueOn)
  )")
            .WithParameter("@dueOn", dueOn);
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }
}

public class MaintenanceChargeRepository(CosmosClient client, string dbName, ILogger<MaintenanceChargeRepository> logger)
    : CosmosDbRepository<MaintenanceCharge>(client, dbName, "maintenance_charges", logger), IMaintenanceChargeRepository
{
    public async Task<IReadOnlyList<MaintenanceCharge>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, int? year, int? month, CancellationToken ct = default)
    {
        var queryText = "SELECT * FROM c WHERE c.societyId = @sid AND c.apartmentId = @aid";
        if (year.HasValue)
            queryText += " AND c.chargeYear = @year";
        if (month.HasValue)
            queryText += " AND c.chargeMonth = @month";
        queryText += " OFFSET @offset LIMIT @limit";

        var q = new QueryDefinition(queryText)
            .WithParameter("@sid", societyId).WithParameter("@aid", apartmentId)
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        if (year.HasValue)
            q.WithParameter("@year", year.Value);
        if (month.HasValue)
            q.WithParameter("@month", month.Value);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<MaintenanceCharge>> GetBySocietyAsync(string societyId, int page, int pageSize, string? apartmentId, PaymentStatus? status, int? year, int? month, CancellationToken ct = default)
    {
        var queryText = "SELECT * FROM c WHERE c.societyId = @sid";
        if (!string.IsNullOrWhiteSpace(apartmentId))
            queryText += " AND c.apartmentId = @aid";
        if (status.HasValue)
            queryText += " AND c.status = @status";
        if (year.HasValue)
            queryText += " AND c.chargeYear = @year";
        if (month.HasValue)
            queryText += " AND c.chargeMonth = @month";
        queryText += " OFFSET @offset LIMIT @limit";

        var q = new QueryDefinition(queryText)
            .WithParameter("@sid", societyId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        if (!string.IsNullOrWhiteSpace(apartmentId))
            q.WithParameter("@aid", apartmentId);
        if (status.HasValue)
            q.WithParameter("@status", status.Value.ToString());
        if (year.HasValue)
            q.WithParameter("@year", year.Value);
        if (month.HasValue)
            q.WithParameter("@month", month.Value);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<MaintenanceCharge>> GetByScheduleAsync(string societyId, string scheduleId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.scheduleId = @scheduleId")
            .WithParameter("@sid", societyId)
            .WithParameter("@scheduleId", scheduleId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<MaintenanceCharge>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId).WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize).WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<MaintenanceCharge>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default)
    {
        var start = DateTime.UtcNow.ToString("o");
        var end = DateTime.UtcNow.AddDays(withinDays).ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND ARRAY_CONTAINS(@statuses, c.status) AND c.dueDate >= @start AND c.dueDate <= @end")
            .WithParameter("@sid", societyId).WithParameter("@statuses", new[] { PaymentStatus.Pending.ToString(), PaymentStatus.ProofSubmitted.ToString() })
            .WithParameter("@start", start).WithParameter("@end", end);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<MaintenanceCharge?> GetByScheduleAndPeriodAsync(string societyId, string scheduleId, string apartmentId, int year, int month, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.scheduleId = @scheduleId AND c.apartmentId = @apartmentId AND c.chargeYear = @year AND c.chargeMonth = @month")
            .WithParameter("@sid", societyId)
            .WithParameter("@scheduleId", scheduleId)
            .WithParameter("@apartmentId", apartmentId)
            .WithParameter("@year", year)
            .WithParameter("@month", month);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<MaintenanceCharge>> GetByDueDateRangeAsync(string societyId, DateTime fromInclusiveUtc, DateTime toInclusiveUtc, CancellationToken ct = default)
    {
        var q = new QueryDefinition(@"
SELECT * FROM c
WHERE c.societyId = @sid
  AND c.dueDate >= @fromInclusive
  AND c.dueDate <= @toInclusive")
            .WithParameter("@sid", societyId)
            .WithParameter("@fromInclusive", fromInclusiveUtc.ToString("o"))
            .WithParameter("@toInclusive", toInclusiveUtc.ToString("o"));
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class MaintenanceChargeGridViewRepository(CosmosClient client, string dbName, ILogger<MaintenanceChargeGridViewRepository> logger)
    : CosmosDbRepository<MaintenanceChargeGridView>(client, dbName, "maintenance_charge_grid_views", logger), IMaintenanceChargeGridViewRepository
{
    public Task<MaintenanceChargeGridView?> GetByFinancialYearAsync(string societyId, int financialYearStart, CancellationToken ct = default) =>
        GetByIdAsync(MaintenanceChargeGridView.BuildId(financialYearStart), societyId, ct);
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

public class ShiftRepository(CosmosClient client, string dbName, ILogger<ShiftRepository> logger)
    : CosmosDbRepository<Shift>(client, dbName, "shifts", logger), IShiftRepository
{
}

public class StaffRepository(CosmosClient client, string dbName, ILogger<StaffRepository> logger)
    : CosmosDbRepository<Staff>(client, dbName, "staff", logger), IStaffRepository
{
    public async Task<IReadOnlyList<Staff>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<Staff>> GetActiveWithShiftsAcrossSocietiesAsync(CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.isActive = true AND IS_DEFINED(c.shiftId) AND c.shiftId != null");
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }
}

public class StaffAttendanceRepository(CosmosClient client, string dbName, ILogger<StaffAttendanceRepository> logger)
    : CosmosDbRepository<StaffAttendance>(client, dbName, "staff_attendance", logger), IStaffAttendanceRepository
{
    // "Open" (on-duty) means checked in with no check-out yet. The Cosmos serializer uses
    // NullValueHandling.Ignore, so a null checkOutTime is never written to the document at all —
    // it's *missing*, not JSON null. Cosmos treats a missing property as Undefined, and
    // `c.checkOutTime = null` evaluates to Undefined (excluded from the WHERE clause) rather than
    // true for a missing property, so it must be matched with IS_DEFINED/IS_NULL, not `= null`.
    private const string OpenAttendanceFilter =
        "IS_DEFINED(c.checkInTime) AND (NOT IS_DEFINED(c.checkOutTime) OR IS_NULL(c.checkOutTime))";

    public async Task<IReadOnlyList<StaffAttendance>> GetOnDutyAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            $"SELECT * FROM c WHERE c.societyId = @sid AND {OpenAttendanceFilter}")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<StaffAttendance?> GetOpenAttendanceAsync(string societyId, string staffId, CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            $"SELECT * FROM c WHERE c.societyId = @sid AND c.staffId = @staffId AND {OpenAttendanceFilter}")
            .WithParameter("@sid", societyId).WithParameter("@staffId", staffId);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<StaffAttendance>> GetByStaffAsync(string societyId, string staffId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.staffId = @staffId AND c.attendanceDate >= @from AND c.attendanceDate <= @to")
            .WithParameter("@sid", societyId).WithParameter("@staffId", staffId)
            .WithParameter("@from", fromUtc).WithParameter("@to", toUtc);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<StaffAttendance>> GetBySocietyAndDateRangeAsync(string societyId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.attendanceDate >= @from AND c.attendanceDate <= @to")
            .WithParameter("@sid", societyId).WithParameter("@from", fromUtc).WithParameter("@to", toUtc);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<bool> HasRecordForDateAsync(string societyId, string staffId, DateTime attendanceDate, CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.staffId = @staffId AND c.attendanceDate = @date")
            .WithParameter("@sid", societyId).WithParameter("@staffId", staffId).WithParameter("@date", attendanceDate.Date);
        return (await ExecuteQueryAsync(q, societyId, ct)).Count > 0;
    }
}

public class SosAlertRepository(CosmosClient client, string dbName, ILogger<SosAlertRepository> logger)
    : CosmosDbRepository<SosAlert>(client, dbName, "sos_alerts", logger), ISosAlertRepository
{
    // "Active" (still Triggered) is identified via acknowledgedAt/resolvedAt being unset rather than
    // comparing the status enum — the Cosmos serializer uses NullValueHandling.Ignore, so a null
    // acknowledgedAt/resolvedAt is never written to the document (missing, not JSON null), and a
    // missing property compared with `= <value>` evaluates to Undefined (excluded from the WHERE
    // clause). IS_DEFINED/IS_NULL correctly matches both "missing" and "explicit null".
    public async Task<IReadOnlyList<SosAlert>> GetActiveAcrossSocietiesAsync(CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE " +
            "(NOT IS_DEFINED(c.acknowledgedAt) OR IS_NULL(c.acknowledgedAt)) AND " +
            "(NOT IS_DEFINED(c.resolvedAt) OR IS_NULL(c.resolvedAt))");
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }
}

public class PollRepository(CosmosClient client, string dbName, ILogger<PollRepository> logger)
    : CosmosDbRepository<Poll>(client, dbName, "polls", logger), IPollRepository
{
    // ClosedAt is unset (missing/null) for both Scheduled and Open polls, and only ever set on Close —
    // a reliable proxy for "not yet closed" that avoids filtering on the raw enum-as-int status value.
    public async Task<IReadOnlyList<Poll>> GetOpenOrScheduledAcrossSocietiesAsync(CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE NOT IS_DEFINED(c.closedAt) OR IS_NULL(c.closedAt)");
        return await ExecuteCrossPartitionQueryAsync(q, ct);
    }
}

public class PollVoteRepository(CosmosClient client, string dbName, ILogger<PollVoteRepository> logger)
    : CosmosDbRepository<PollVote>(client, dbName, "poll-votes", logger), IPollVoteRepository
{
    public async Task<IReadOnlyList<PollVote>> GetByPollAsync(string societyId, string pollId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.pollId = @pollId")
            .WithParameter("@sid", societyId).WithParameter("@pollId", pollId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<PollVote?> GetByPollAndEligibleUnitAsync(string societyId, string pollId, string eligibleUnitId, CancellationToken ct = default)
    {
        var q = new QueryDefinition(
            "SELECT * FROM c WHERE c.societyId = @sid AND c.pollId = @pollId AND c.eligibleUnitId = @unit")
            .WithParameter("@sid", societyId).WithParameter("@pollId", pollId).WithParameter("@unit", eligibleUnitId);
        return (await ExecuteQueryAsync(q, societyId, ct)).FirstOrDefault();
    }
}

public class AgmSessionRepository(CosmosClient client, string dbName, ILogger<AgmSessionRepository> logger)
    : CosmosDbRepository<AgmSession>(client, dbName, "agm-sessions", logger), IAgmSessionRepository
{
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
