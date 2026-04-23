using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Repositories;

public interface IVendorRepository : IRepository<Vendor>
{
    Task<IReadOnlyList<Vendor>> SearchAsync(string societyId, string? searchText, CancellationToken ct = default);
}

public interface IVendorRecurringScheduleRepository : IRepository<VendorRecurringSchedule>
{
    Task<IReadOnlyList<VendorRecurringSchedule>> GetByVendorAsync(string societyId, string vendorId, CancellationToken ct = default);
    Task<IReadOnlyList<VendorRecurringSchedule>> GetActiveDueOnAsync(DateTime asOfUtc, CancellationToken ct = default);
}

public interface IVendorChargeRepository : IRepository<VendorCharge>
{
    Task<IReadOnlyList<VendorCharge>> GetByVendorAsync(string societyId, string vendorId, int page, int pageSize, int? year, int? month, PaymentStatus? status, CancellationToken ct = default);
    Task<IReadOnlyList<VendorCharge>> GetBySocietyAsync(string societyId, int page, int pageSize, string? vendorId, PaymentStatus? status, int? year, int? month, CancellationToken ct = default);
    Task<IReadOnlyList<VendorCharge>> GetByScheduleAsync(string societyId, string scheduleId, CancellationToken ct = default);
    Task<VendorCharge?> GetByScheduleAndEffectiveDateAsync(string societyId, string scheduleId, DateTime effectiveDate, CancellationToken ct = default);
    Task<IReadOnlyList<VendorCharge>> GetByYearAsync(string societyId, int year, CancellationToken ct = default);
    Task<IReadOnlyList<VendorCharge>> GetOverduePendingAcrossSocietiesAsync(DateTime asOfUtc, CancellationToken ct = default);
}
