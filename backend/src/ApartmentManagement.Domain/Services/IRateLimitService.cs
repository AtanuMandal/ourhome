namespace ApartmentManagement.Domain.Services;

public interface IRateLimitService
{
    Task<bool> IsAllowedAsync(string userId, string endpoint, CancellationToken ct = default);
    Task<bool> IsSocietyAllowedAsync(string societyId, string endpoint, CancellationToken ct = default);
}
