using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Infrastructure.Persistence;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Infrastructure.Repositories;

public class FeeScheduleRepository(
    CosmosClient client,
    string databaseName,
    ILogger<FeeScheduleRepository> logger)
    : CosmosDbRepository<FeeSchedule>(client, databaseName, "fee_schedules", logger), IFeeScheduleRepository
{
    public Task<FeeSchedule> CreateAsync(FeeSchedule schedule, CancellationToken ct = default)
        => base.CreateAsync(schedule, ct);

    public Task<FeeSchedule?> GetByIdAsync(string id, string societyId, CancellationToken ct = default)
        => base.GetByIdAsync(id, societyId, ct);

    public Task<FeeSchedule> UpdateAsync(FeeSchedule schedule, CancellationToken ct = default)
        => base.UpdateAsync(schedule, ct);

    public async Task<IReadOnlyList<FeeSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true")
            .WithParameter("@sid", societyId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeeSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default)
    {
        // Return both apartment-specific schedules and society-level schedules (apartmentId IS NULL)
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.isActive = true AND (c.apartmentId = @apartmentId OR IS_NULL(c.apartmentId))")
            .WithParameter("@sid", societyId).WithParameter("@apartmentId", apartmentId);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}

public class FeePaymentRepository(
    CosmosClient client,
    string databaseName,
    ILogger<FeePaymentRepository> logger)
    : CosmosDbRepository<FeePayment>(client, databaseName, "fee_payments", logger), IFeePaymentRepository
{
    public Task<FeePayment> CreateAsync(FeePayment payment, CancellationToken ct = default)
        => base.CreateAsync(payment, ct);

    public Task<FeePayment?> GetByIdAsync(string id, string societyId, CancellationToken ct = default)
        => base.GetByIdAsync(id, societyId, ct);

    public Task<FeePayment> UpdateAsync(FeePayment payment, CancellationToken ct = default)
        => base.UpdateAsync(payment, ct);

    public async Task<IReadOnlyList<FeePayment>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.apartmentId = @apartmentId ORDER BY c.dueDate DESC OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@apartmentId", apartmentId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status ORDER BY c.dueDate DESC OFFSET @offset LIMIT @limit")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", status.ToString())
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var until = now.AddDays(withinDays);
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.status = @status AND c.dueDate >= @now AND c.dueDate <= @until")
            .WithParameter("@sid", societyId)
            .WithParameter("@status", PaymentStatus.Pending.ToString())
            .WithParameter("@now", now.ToString("o"))
            .WithParameter("@until", until.ToString("o"));
        return await ExecuteQueryAsync(q, societyId, ct);
    }

    public async Task<IReadOnlyList<FeePayment>> GetOverdueAsync(string societyId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow.ToString("o");
        var q = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND (c.status = @overdue OR (c.status = @pending AND c.dueDate < @now))")
            .WithParameter("@sid", societyId)
            .WithParameter("@overdue", PaymentStatus.Overdue.ToString())
            .WithParameter("@pending", PaymentStatus.Pending.ToString())
            .WithParameter("@now", now);
        return await ExecuteQueryAsync(q, societyId, ct);
    }
}
