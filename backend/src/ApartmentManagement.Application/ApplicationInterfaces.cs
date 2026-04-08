using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Application.Interfaces;

public interface ICurrentUserService
{
    string UserId { get; }
    string SocietyId { get; }
    string Email { get; }
    string Role { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
    bool IsInRoles(params string[] roles);
}

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default);
    Task SendSmsAsync(string phone, string message, CancellationToken ct = default);
    Task SendPushNotificationAsync(string userId, string title, string body, CancellationToken ct = default);
    Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default);
}

public interface IEventPublisher
{
    Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent;
    Task PublishManyAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default);
}

public interface IFileStorageService
{
    Task<string> UploadAsync(Stream content, string fileName, string contentType, string containerName, CancellationToken ct = default);
    Task DeleteAsync(string fileUrl, CancellationToken ct = default);
    Task<string> GetUrlAsync(string blobName, string containerName, TimeSpan? expiry = null, CancellationToken ct = default);
}

public interface IQrCodeService
{
    Task<string> GenerateQrCodeBase64Async(string data, CancellationToken ct = default);
    bool ValidateQrCode(string qrData, string expectedData);
}

public interface IRateLimitService
{
    Task<bool> IsAllowedAsync(string userId, string societyId, string endpoint, CancellationToken ct = default);
    Task<int> GetRemainingCallsAsync(string userId, string endpoint, CancellationToken ct = default);
}

public interface IAuthService
{
    string GenerateOtp();
    Task<string> GenerateJwtTokenAsync(string userId, string email, string role, string societyId, CancellationToken ct = default);
    Task<bool> ValidateTokenAsync(string token, CancellationToken ct = default);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan expiry, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}
