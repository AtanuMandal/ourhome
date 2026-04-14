using ApartmentManagement.Domain.Entities;

namespace ApartmentManagement.Domain.Repositories;

public interface IFeeScheduleRepository
{
    Task<FeeSchedule> CreateAsync(FeeSchedule schedule, CancellationToken ct = default);
    Task<FeeSchedule?> GetByIdAsync(string id, string societyId, CancellationToken ct = default);
    Task<FeeSchedule> UpdateAsync(FeeSchedule schedule, CancellationToken ct = default);
    Task<IReadOnlyList<FeeSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default);
    Task<IReadOnlyList<FeeSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default);
}

