using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Repositories;

public interface IFeePaymentRepository
{
    Task<FeePayment> CreateAsync(FeePayment payment, CancellationToken ct = default);
    Task<FeePayment?> GetByIdAsync(string id, string societyId, CancellationToken ct = default);
    Task<FeePayment> UpdateAsync(FeePayment payment, CancellationToken ct = default);
    Task<IReadOnlyList<FeePayment>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<FeePayment>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<FeePayment>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default);
    Task<IReadOnlyList<FeePayment>> GetOverdueAsync(string societyId, CancellationToken ct = default);
}

