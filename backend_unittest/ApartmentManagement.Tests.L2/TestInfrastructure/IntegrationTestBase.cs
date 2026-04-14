using ApartmentManagement.Application;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Repositories;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Tests.L2.TestInfrastructure;

// ─── Fake service implementations ────────────────────────────────────────────

public sealed class FakeCurrentUserService : ICurrentUserService
{
    public string UserId { get; set; } = "test-user-id";
    public string SocietyId { get; set; } = "test-society-id";
    public string Email { get; set; } = "admin@test.com";
    public string Role { get; set; } = "SocietyAdmin";
    public bool IsAuthenticated => true;

    public bool IsInRole(string role) =>
        role == Role || role == "SocietyAdmin" || role == "SuperAdmin";

    public bool IsInRoles(params string[] roles) => roles.Any(IsInRole);
}

public sealed class FakeNotificationService : INotificationService
{
    public List<(string To, string Subject, string Body)> SentEmails { get; } = [];
    public List<(string Phone, string Message)> SentSms { get; } = [];
    public List<(string UserId, string Title, string Body)> SentPushNotifications { get; } = [];

    public Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        SentEmails.Add((to, subject, body));
        return Task.CompletedTask;
    }

    public Task SendSmsAsync(string phone, string message, CancellationToken ct = default)
    {
        SentSms.Add((phone, message));
        return Task.CompletedTask;
    }

    public Task SendPushNotificationAsync(string userId, string title, string body, CancellationToken ct = default)
    {
        SentPushNotifications.Add((userId, title, body));
        return Task.CompletedTask;
    }

    public Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default)
    {
        foreach (var r in recipients)
            SentEmails.Add((r, subject, body));
        return Task.CompletedTask;
    }
}

public sealed class FakeEventPublisher : IEventPublisher
{
    public List<IDomainEvent> PublishedEvents { get; } = [];

    public Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent
    {
        PublishedEvents.Add(domainEvent);
        return Task.CompletedTask;
    }

    public Task PublishManyAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default)
    {
        PublishedEvents.AddRange(events);
        return Task.CompletedTask;
    }
}

public sealed class FakeQrCodeService : IQrCodeService
{
    public Task<string> GenerateQrCodeBase64Async(string data, CancellationToken ct = default)
        => Task.FromResult($"fake-qr-{data}");

    public bool ValidateQrCode(string qrData, string expectedData)
        => qrData == $"fake-qr-{expectedData}";
}

public sealed class FakeFileStorageService : IFileStorageService
{
    public Task<string> UploadAsync(Stream content, string fileName, string contentType, string containerName, CancellationToken ct = default)
        => Task.FromResult($"https://fake-storage/{containerName}/{fileName}");

    public Task DeleteAsync(string fileUrl, CancellationToken ct = default) => Task.CompletedTask;

    public Task<string> GetUrlAsync(string blobName, string containerName, TimeSpan? expiry = null, CancellationToken ct = default)
        => Task.FromResult($"https://fake-storage/{containerName}/{blobName}");
}

public sealed class FakeAuthService : IAuthService
{
    public string GenerateOtp() => "123456";

    public Task<string> GenerateJwtTokenAsync(string userId, string email, string role, string societyId, CancellationToken ct = default)
        => Task.FromResult("fake-jwt-token");

    public Task<bool> ValidateTokenAsync(string token, CancellationToken ct = default)
        => Task.FromResult(token == "fake-jwt-token");

    public string HashPassword(string password) => $"hashed-{password}";

    public bool VerifyPassword(string password, string hash) => hash == $"hashed-{password}";
}

public sealed class FakeCacheService : ICacheService
{
    private readonly Dictionary<string, object?> _cache = [];

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        _cache.TryGetValue(key, out var value);
        return Task.FromResult(value is T t ? t : default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan expiry, CancellationToken ct = default)
    {
        _cache[key] = value;
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }
}

public sealed class FakeRateLimitService : IRateLimitService
{
    public Task<bool> IsAllowedAsync(string userId, string societyId, string endpoint, CancellationToken ct = default)
        => Task.FromResult(true);

    public Task<int> GetRemainingCallsAsync(string userId, string endpoint, CancellationToken ct = default)
        => Task.FromResult(1000);
}

// ─── Integration Test Base ────────────────────────────────────────────────────

/// <summary>
/// Base class for L2 integration tests. Each subclass gets a fresh, isolated
/// in-memory DI container with real Application handlers and fake repositories.
/// </summary>
public abstract class IntegrationTestBase : IDisposable
{
    private readonly ServiceProvider _serviceProvider;

    protected IMediator Mediator { get; }

    // Fake services available for assertions and pre-population
    protected FakeSocietyRepository SocietyRepo { get; }
    protected FakeApartmentRepository ApartmentRepo { get; }
    protected FakeUserRepository UserRepo { get; }
    protected FakeAmenityRepository AmenityRepo { get; }
    protected FakeAmenityBookingRepository BookingRepo { get; }
    protected FakeComplaintRepository ComplaintRepo { get; }
    protected FakeNoticeRepository NoticeRepo { get; }
    protected FakeVisitorLogRepository VisitorRepo { get; }
    protected FakeCompetitionRepository CompetitionRepo { get; }
    protected FakeCompetitionEntryRepository CompetitionEntryRepo { get; }
    protected FakeRewardPointsRepository RewardPointsRepo { get; }
    protected FakeServiceProviderRepository ServiceProviderRepo { get; }
    protected FakeServiceProviderRequestRepository ServiceProviderRequestRepo { get; }
    protected FakeNotificationService NotificationService { get; }
    protected FakeEventPublisher EventPublisher { get; }
    protected FakeCurrentUserService CurrentUserService { get; }

    protected IntegrationTestBase()
    {
        // Create all fake repositories
        SocietyRepo = new FakeSocietyRepository();
        ApartmentRepo = new FakeApartmentRepository();
        UserRepo = new FakeUserRepository();
        AmenityRepo = new FakeAmenityRepository();
        BookingRepo = new FakeAmenityBookingRepository();
        ComplaintRepo = new FakeComplaintRepository();
        NoticeRepo = new FakeNoticeRepository();
        VisitorRepo = new FakeVisitorLogRepository();
        CompetitionRepo = new FakeCompetitionRepository();
        CompetitionEntryRepo = new FakeCompetitionEntryRepository();
        RewardPointsRepo = new FakeRewardPointsRepository();
        ServiceProviderRepo = new FakeServiceProviderRepository();
        ServiceProviderRequestRepo = new FakeServiceProviderRequestRepository();
        NotificationService = new FakeNotificationService();
        EventPublisher = new FakeEventPublisher();
        CurrentUserService = new FakeCurrentUserService();

        var services = new ServiceCollection();

        // Real Application layer: MediatR + handlers + validators + pipeline behaviors
        services.AddApplication();

        // Logging (required by LoggingBehavior and individual handlers)
        services.AddLogging(b => b.SetMinimumLevel(LogLevel.Warning));

        // Interfaces from Application layer
        services.AddSingleton<ICurrentUserService>(CurrentUserService);
        services.AddSingleton<INotificationService>(NotificationService);
        services.AddSingleton<IEventPublisher>(EventPublisher);
        services.AddSingleton<IQrCodeService>(new FakeQrCodeService());
        services.AddSingleton<IFileStorageService>(new FakeFileStorageService());
        services.AddSingleton<IAuthService>(new FakeAuthService());
        services.AddSingleton<ICacheService>(new FakeCacheService());
        services.AddSingleton<IRateLimitService>(new FakeRateLimitService());

        // Fake repositories
        services.AddSingleton<ISocietyRepository>(SocietyRepo);
        services.AddSingleton<IApartmentRepository>(ApartmentRepo);
        services.AddSingleton<IUserRepository>(UserRepo);
        services.AddSingleton<IAmenityRepository>(AmenityRepo);
        services.AddSingleton<IAmenityBookingRepository>(BookingRepo);
        services.AddSingleton<IComplaintRepository>(ComplaintRepo);
        services.AddSingleton<INoticeRepository>(NoticeRepo);
        services.AddSingleton<IVisitorLogRepository>(VisitorRepo);
        services.AddSingleton<ICompetitionRepository>(CompetitionRepo);
        services.AddSingleton<ICompetitionEntryRepository>(CompetitionEntryRepo);
        services.AddSingleton<IRewardPointsRepository>(RewardPointsRepo);
        services.AddSingleton<IServiceProviderRepository>(ServiceProviderRepo);
        services.AddSingleton<IServiceProviderRequestRepository>(ServiceProviderRequestRepo);

        _serviceProvider = services.BuildServiceProvider();
        Mediator = _serviceProvider.GetRequiredService<IMediator>();
    }

    public void Dispose() => _serviceProvider.Dispose();
}
