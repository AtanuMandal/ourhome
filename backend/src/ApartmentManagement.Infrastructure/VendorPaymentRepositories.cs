using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Infrastructure.Persistence;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Infrastructure.Repositories;

public class VendorRepository(CosmosClient client, string dbName, ILogger<VendorRepository> logger)
    : CosmosDbRepository<Vendor>(client, dbName, "vendors", logger), IVendorRepository
{
    public async Task<IReadOnlyList<Vendor>> SearchAsync(string societyId, string? searchText, CancellationToken ct = default)
    {
        var normalizedSearch = string.IsNullOrWhiteSpace(searchText) ? null : searchText.Trim().ToLowerInvariant();
        var queryText = @"
SELECT * FROM c
WHERE c.societyId = @sid";

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            queryText += @"
  AND (
    CONTAINS(LOWER(c.name), @search)
    OR (IS_DEFINED(c.businessType) AND NOT IS_NULL(c.businessType) AND CONTAINS(LOWER(c.businessType), @search))
    OR (IS_DEFINED(c.geographicServiceArea) AND NOT IS_NULL(c.geographicServiceArea) AND CONTAINS(LOWER(c.geographicServiceArea), @search))
    OR CONTAINS(LOWER(c.contactFirstName), @search)
    OR CONTAINS(LOWER(c.contactLastName), @search)
    OR CONTAINS(LOWER(c.contactEmail), @search)
  )";
        }

        var query = new QueryDefinition(queryText)
            .WithParameter("@sid", societyId);

        if (!string.IsNullOrWhiteSpace(normalizedSearch))
            query.WithParameter("@search", normalizedSearch);

        return await ExecuteQueryAsync(query, societyId, ct);
    }
}

public class VendorRecurringScheduleRepository(CosmosClient client, string dbName, ILogger<VendorRecurringScheduleRepository> logger)
    : CosmosDbRepository<VendorRecurringSchedule>(client, dbName, "vendor_recurring_schedules", logger), IVendorRecurringScheduleRepository
{
    public async Task<IReadOnlyList<VendorRecurringSchedule>> GetByVendorAsync(string societyId, string vendorId, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.vendorId = @vendorId")
            .WithParameter("@sid", societyId)
            .WithParameter("@vendorId", vendorId);
        return await ExecuteQueryAsync(query, societyId, ct);
    }

    public async Task<IReadOnlyList<VendorRecurringSchedule>> GetActiveDueOnAsync(DateTime asOfUtc, CancellationToken ct = default)
    {
        var asOf = asOfUtc.Date.ToString("o");
        var query = new QueryDefinition(@"
SELECT * FROM c
WHERE c.nextChargeDate <= @asOf
  AND c.startDate <= @asOf
  AND (
    NOT IS_DEFINED(c.endDate)
    OR IS_NULL(c.endDate)
    OR c.endDate >= c.nextChargeDate
  )
  AND (
    NOT IS_DEFINED(c.inactiveFromDate)
    OR IS_NULL(c.inactiveFromDate)
    OR c.inactiveFromDate > c.nextChargeDate
  )")
            .WithParameter("@asOf", asOf);
        return await ExecuteCrossPartitionQueryAsync(query, ct);
    }
}

public class VendorChargeRepository(CosmosClient client, string dbName, ILogger<VendorChargeRepository> logger)
    : CosmosDbRepository<VendorCharge>(client, dbName, "vendor_charges", logger), IVendorChargeRepository
{
    public async Task<IReadOnlyList<VendorCharge>> GetByVendorAsync(string societyId, string vendorId, int page, int pageSize, int? year, int? month, PaymentStatus? status, CancellationToken ct = default)
    {
        var queryText = @"SELECT * FROM c
WHERE c.societyId = @sid
  AND c.vendorId = @vendorId
  AND (
    NOT IS_DEFINED(c.isDeleted)
    OR c.isDeleted = false
  )";
        if (year.HasValue)
            queryText += " AND c.chargeYear = @year";
        if (month.HasValue)
            queryText += " AND c.chargeMonth = @month";
        if (status.HasValue)
            queryText += " AND c.status = @status";
        queryText += " ORDER BY c.effectiveDate OFFSET @offset LIMIT @limit";

        var query = new QueryDefinition(queryText)
            .WithParameter("@sid", societyId)
            .WithParameter("@vendorId", vendorId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);

        if (year.HasValue)
            query.WithParameter("@year", year.Value);
        if (month.HasValue)
            query.WithParameter("@month", month.Value);
        if (status.HasValue)
            query.WithParameter("@status", status.Value.ToString());

        return await ExecuteQueryAsync(query, societyId, ct);
    }

    public async Task<IReadOnlyList<VendorCharge>> GetBySocietyAsync(string societyId, int page, int pageSize, string? vendorId, PaymentStatus? status, int? year, int? month, CancellationToken ct = default)
    {
        var queryText = @"SELECT * FROM c
WHERE c.societyId = @sid
  AND (
    NOT IS_DEFINED(c.isDeleted)
    OR c.isDeleted = false
  )";
        if (!string.IsNullOrWhiteSpace(vendorId))
            queryText += " AND c.vendorId = @vendorId";
        if (status.HasValue)
            queryText += " AND c.status = @status";
        if (year.HasValue)
            queryText += " AND c.chargeYear = @year";
        if (month.HasValue)
            queryText += " AND c.chargeMonth = @month";
        queryText += " ORDER BY c.effectiveDate OFFSET @offset LIMIT @limit";

        var query = new QueryDefinition(queryText)
            .WithParameter("@sid", societyId)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);

        if (!string.IsNullOrWhiteSpace(vendorId))
            query.WithParameter("@vendorId", vendorId);
        if (status.HasValue)
            query.WithParameter("@status", status.Value.ToString());
        if (year.HasValue)
            query.WithParameter("@year", year.Value);
        if (month.HasValue)
            query.WithParameter("@month", month.Value);

        return await ExecuteQueryAsync(query, societyId, ct);
    }

    public async Task<IReadOnlyList<VendorCharge>> GetByScheduleAsync(string societyId, string scheduleId, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.scheduleId = @scheduleId")
            .WithParameter("@sid", societyId)
            .WithParameter("@scheduleId", scheduleId);
        return await ExecuteQueryAsync(query, societyId, ct);
    }

    public async Task<VendorCharge?> GetByScheduleAndEffectiveDateAsync(string societyId, string scheduleId, DateTime effectiveDate, CancellationToken ct = default)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.societyId = @sid AND c.scheduleId = @scheduleId AND c.effectiveDate = @effectiveDate")
            .WithParameter("@sid", societyId)
            .WithParameter("@scheduleId", scheduleId)
            .WithParameter("@effectiveDate", effectiveDate.Date.ToString("o"));
        return (await ExecuteQueryAsync(query, societyId, ct)).FirstOrDefault();
    }

    public async Task<IReadOnlyList<VendorCharge>> GetByYearAsync(string societyId, int year, CancellationToken ct = default)
    {
        var query = new QueryDefinition(@"
SELECT * FROM c
WHERE c.societyId = @sid
  AND c.chargeYear = @year
  AND (
    NOT IS_DEFINED(c.isDeleted)
    OR c.isDeleted = false
  )")
            .WithParameter("@sid", societyId)
            .WithParameter("@year", year);
        return await ExecuteQueryAsync(query, societyId, ct);
    }

    public async Task<IReadOnlyList<VendorCharge>> GetOverduePendingAcrossSocietiesAsync(DateTime asOfUtc, CancellationToken ct = default)
    {
        var asOf = asOfUtc.Date.ToString("o");
        var query = new QueryDefinition(@"
SELECT * FROM c
WHERE c.dueDate < @asOf
  AND c.status != @paidStatus
  AND (
    NOT IS_DEFINED(c.isDeleted)
    OR c.isDeleted = false
  )
  AND (
    NOT IS_DEFINED(c.isActive)
    OR c.isActive = true
  )
  AND (
    NOT IS_DEFINED(c.overdueNotificationSentAt)
    OR IS_NULL(c.overdueNotificationSentAt)
  )")
            .WithParameter("@asOf", asOf)
            .WithParameter("@paidStatus", PaymentStatus.Paid.ToString());
        return await ExecuteCrossPartitionQueryAsync(query, ct);
    }
}
