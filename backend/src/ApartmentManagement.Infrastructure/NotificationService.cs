using ApartmentManagement.Application.Interfaces;
using Azure.Communication.Sms;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using WebPush;

namespace ApartmentManagement.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly InfrastructureSettings _settings;
    private readonly IEmailSender _emailSender;
    private readonly IPushSubscriptionStore _pushSubscriptionStore;
    private readonly IMobilePushTokenStore _mobilePushTokenStore;
    private readonly ILogger<NotificationService> _logger;
    // Client is expensive to construct (wraps HttpClient); create once per service instance.
    private readonly SmsClient? _smsClient;
    private readonly WebPushClient _webPushClient = new();

    public NotificationService(
        IOptions<InfrastructureSettings> settings,
        IEmailSender emailSender,
        IPushSubscriptionStore pushSubscriptionStore,
        IMobilePushTokenStore mobilePushTokenStore,
        ILogger<NotificationService> logger)
    {
        _settings = settings.Value;
        _emailSender = emailSender;
        _pushSubscriptionStore = pushSubscriptionStore;
        _mobilePushTokenStore = mobilePushTokenStore;
        _logger = logger;

        if (!string.IsNullOrWhiteSpace(_settings.AzureCommunicationConnectionString))
        {
            _smsClient = new SmsClient(_settings.AzureCommunicationConnectionString);
        }
    }

    // ── Email ────────────────────────────────────────────────────────────────
    // Delegates to the injected IEmailSender (BrevoEmailSender by default — see Program.cs)
    // rather than talking to a mail provider directly, so the transport stays swappable.

    public Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
        => _emailSender.SendEmailAsync(to, subject, body, ct);

    public Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default)
        => Task.WhenAll(recipients.Select(r => SendEmailAsync(r, subject, body, ct)));

    // ── SMS ─────────────────────────────────────────────────────────────────

    public bool IsSmsConfigured => _smsClient is not null && !string.IsNullOrWhiteSpace(_settings.SmsSenderNumber);

    public async Task SendSmsAsync(string phone, string message, CancellationToken ct = default)
    {
        try
        {
            if (_smsClient is null)
            {
                _logger.LogWarning("SMS not configured. Skipping SMS to {Phone}", phone);
                return;
            }
            await _smsClient.SendAsync(from: _settings.SmsSenderNumber, to: phone, message: message, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SMS to {Phone}", phone);
        }
    }

    // ── Web Push ─────────────────────────────────────────────────────────────

    public string GetVapidPublicKey() => _settings.VapidPublicKey;

    public async Task SavePushSubscriptionAsync(
        string userId, string societyId, string endpoint, string p256dh, string auth,
        CancellationToken ct = default)
    {
        // Use endpoint hash as deterministic ID so upsert overwrites the existing row for the same browser
        var endpointHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(endpoint)))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=')[..16];

        var doc = new PushSubscriptionDocument
        {
            Id        = $"{userId}_{endpointHash}",
            UserId    = userId,
            SocietyId = societyId,
            Endpoint  = endpoint,
            P256dh    = p256dh,
            Auth      = auth,
            CreatedAt = DateTime.UtcNow
        };
        await _pushSubscriptionStore.UpsertAsync(doc, ct);
        _logger.LogInformation("Saved push subscription for user {UserId}", userId);
    }

    public async Task DeletePushSubscriptionAsync(
        string userId, string societyId, string endpoint, CancellationToken ct = default)
    {
        await _pushSubscriptionStore.DeleteByEndpointAsync(endpoint, societyId, ct);
        _logger.LogInformation("Deleted push subscription for user {UserId}", userId);
    }

    public async Task SendPushNotificationAsync(
        string userId, string title, string body,
        CancellationToken ct = default,
        IReadOnlyDictionary<string, string>? data = null)
    {
        if (string.IsNullOrWhiteSpace(_settings.VapidPublicKey) ||
            string.IsNullOrWhiteSpace(_settings.VapidPrivateKey))
        {
            _logger.LogWarning("VAPID keys not configured — push skipped for user {UserId}", userId);
            return;
        }

        // societyId is required to partition the subscription lookup
        if (data is null || !data.TryGetValue("societyId", out var societyId) || string.IsNullOrWhiteSpace(societyId))
        {
            _logger.LogWarning("No societyId in notification data — cannot look up subscriptions for user {UserId}", userId);
            return;
        }

        var subscriptions = await _pushSubscriptionStore.GetByUserIdAsync(userId, societyId, ct);
        if (subscriptions.Count == 0)
        {
            _logger.LogDebug("No push subscriptions for user {UserId}", userId);
            return;
        }

        var vapidDetails = new VapidDetails(
            _settings.VapidSubject,
            _settings.VapidPublicKey,
            _settings.VapidPrivateKey);

        var payload = JsonConvert.SerializeObject(new
        {
            title,
            body,
            icon  = "/icons/icon-192x192.png",
            badge = "/icons/badge-72x72.png",
            data  = data
        });

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await _webPushClient.SendNotificationAsync(pushSub, payload, vapidDetails);
                _logger.LogInformation("Push sent to user {UserId}", userId);
            }
            catch (WebPushException ex) when ((int)ex.StatusCode is 410 or 404)
            {
                _logger.LogInformation("Push subscription expired — removing for user {UserId}", userId);
                await _pushSubscriptionStore.DeleteByEndpointAsync(sub.Endpoint, sub.SocietyId, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send push to user {UserId}", userId);
            }
        }
    }

    // ── Mobile Push Tokens (FCM/APNs) ────────────────────────────────────────

    public async Task SaveMobilePushTokenAsync(
        string userId, string societyId, string platform, string token, string? appVersion,
        CancellationToken ct = default)
    {
        var tokenHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=')[..16];

        var doc = new MobilePushTokenDocument
        {
            Id         = $"{userId}_{tokenHash}",
            UserId     = userId,
            SocietyId  = societyId,
            Platform   = platform,
            Token      = token,
            AppVersion = appVersion,
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow
        };
        await _mobilePushTokenStore.UpsertAsync(doc, ct);
        _logger.LogInformation("Saved mobile push token for user {UserId} platform={Platform}", userId, platform);
    }

    public async Task DeleteMobilePushTokenAsync(
        string userId, string societyId, string token, CancellationToken ct = default)
    {
        await _mobilePushTokenStore.DeleteByTokenAsync(token, societyId, ct);
        _logger.LogInformation("Deleted mobile push token for user {UserId}", userId);
    }

    public async Task SendMobilePushNotificationAsync(
        string userId, string societyId, string title, string body,
        CancellationToken ct = default,
        IReadOnlyDictionary<string, string>? data = null)
    {
        var tokens = await _mobilePushTokenStore.GetByUserIdAsync(userId, societyId, ct);
        if (tokens.Count == 0)
        {
            _logger.LogWarning("No mobile push tokens for user {UserId} — skipping mobile push", userId);
            return;
        }

        // Stub: actual FCM/APNs dispatch is handled by MobilePushPublisher Azure Function.
        _logger.LogInformation(
            "Mobile push stub: would deliver {Title} to {Count} token(s) for user {UserId}",
            title, tokens.Count, userId);
    }
}
