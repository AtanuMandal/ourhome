using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Application.Interfaces;

public interface ICurrentUserService
{
    string UserId { get; }
    string SocietyId { get; }
    string Email { get; }
    string Role { get; }
    string? ApartmentId { get; }
    string? ResidentType { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
    bool IsInRoles(params string[] roles);
}

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default);
    Task SendSmsAsync(string phone, string message, CancellationToken ct = default);
    /// <summary>True when an SMS provider is configured. Callers that need to reach a user
    /// (e.g. OTP delivery) should fall back to email when this is false — see
    /// requirements/UserAndAccess.md.</summary>
    bool IsSmsConfigured { get; }
    Task SendPushNotificationAsync(string userId, string title, string body, CancellationToken ct = default,
        IReadOnlyDictionary<string, string>? data = null);
    Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default);

    // Web Push subscription management
    Task SavePushSubscriptionAsync(string userId, string societyId, string endpoint, string p256dh, string auth, CancellationToken ct = default);
    Task DeletePushSubscriptionAsync(string userId, string societyId, string endpoint, CancellationToken ct = default);
    string GetVapidPublicKey();

    // Mobile Push Token management (FCM/APNs)
    Task SaveMobilePushTokenAsync(string userId, string societyId, string platform, string token, string? appVersion, CancellationToken ct = default);
    Task DeleteMobilePushTokenAsync(string userId, string societyId, string token, CancellationToken ct = default);
    Task SendMobilePushNotificationAsync(string userId, string societyId, string title, string body, CancellationToken ct = default, IReadOnlyDictionary<string, string>? data = null);
}

/// <summary>Transactional email transport (the Brevo API by default — see
/// Infrastructure:BrevoApiKey). Kept separate from <see cref="INotificationService"/> so the
/// email transport is independently dependency-injectable (registered in Program.cs) without
/// touching the SMS/push logic that also lives on that interface.</summary>
public interface IEmailSender
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default);
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
    Task<(Stream Content, string ContentType)> DownloadAsync(string containerName, string blobName, CancellationToken ct = default);
}

public interface IQrCodeService
{
    Task<string> GenerateQrCodeBase64Async(string data, CancellationToken ct = default);
    bool ValidateQrCode(string qrData, string expectedData);
}

public interface IRateLimitService
{
    Task<bool> IsAllowedAsync(string userId, string societyId, string endpoint, CancellationToken ct = default);
    Task<int> GetRemainingCallsAsync(string userId, string societyId, string endpoint, CancellationToken ct = default);
}

public record InviteTokenClaims(string SocietyId, string? ApartmentId);

public interface IAuthService
{
    string GenerateOtp();
    Task<string> GenerateJwtTokenAsync(string userId, string email, string role, string societyId, string? apartmentId = null, string? residentType = null, CancellationToken ct = default);
    Task<bool> ValidateTokenAsync(string token, CancellationToken ct = default);
    Task<string> GenerateInviteTokenAsync(string societyId, string? apartmentId = null, CancellationToken ct = default);
    Task<InviteTokenClaims?> ValidateInviteTokenAsync(string token, CancellationToken ct = default);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan expiry, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}
