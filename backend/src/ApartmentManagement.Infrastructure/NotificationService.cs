using ApartmentManagement.Application.Interfaces;
using Azure.Communication.Email;
using Azure.Communication.Sms;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using WebPush;

namespace ApartmentManagement.Infrastructure.Services;

public class NotificationService(
    IOptions<InfrastructureSettings> settings,
    IPushSubscriptionStore pushSubscriptionStore,
    ILogger<NotificationService> logger) : INotificationService
{
    private readonly InfrastructureSettings _settings = settings.Value;

    // ── Email ────────────────────────────────────────────────────────────────

    public async Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_settings.AzureCommunicationConnectionString))
            {
                logger.LogWarning("Email not configured. Skipping email to {To}", to);
                return;
            }
            var client = new EmailClient(_settings.AzureCommunicationConnectionString);
            var message = new EmailMessage(
                senderAddress: _settings.EmailSenderAddress,
                recipients: new EmailRecipients([new EmailAddress(to)]),
                content: new EmailContent(subject) { PlainText = body, Html = $"<p>{body}</p>" });
            await client.SendAsync(Azure.WaitUntil.Started, message, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To}", to);
        }
    }

    public async Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default)
    {
        foreach (var recipient in recipients)
            await SendEmailAsync(recipient, subject, body, ct);
    }

    // ── SMS ─────────────────────────────────────────────────────────────────

    public async Task SendSmsAsync(string phone, string message, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_settings.AzureCommunicationConnectionString))
            {
                logger.LogWarning("SMS not configured. Skipping SMS to {Phone}", phone);
                return;
            }
            var client = new SmsClient(_settings.AzureCommunicationConnectionString);
            await client.SendAsync(from: _settings.SmsSenderNumber, to: phone, message: message, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send SMS to {Phone}", phone);
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
        await pushSubscriptionStore.UpsertAsync(doc, ct);
        logger.LogInformation("Saved push subscription for user {UserId}", userId);
    }

    public async Task DeletePushSubscriptionAsync(
        string userId, string societyId, string endpoint, CancellationToken ct = default)
    {
        await pushSubscriptionStore.DeleteByEndpointAsync(endpoint, societyId, ct);
        logger.LogInformation("Deleted push subscription for user {UserId}", userId);
    }

    public async Task SendPushNotificationAsync(
        string userId, string title, string body,
        CancellationToken ct = default,
        IReadOnlyDictionary<string, string>? data = null)
    {
        if (string.IsNullOrWhiteSpace(_settings.VapidPublicKey) ||
            string.IsNullOrWhiteSpace(_settings.VapidPrivateKey))
        {
            logger.LogWarning("VAPID keys not configured — push skipped for user {UserId}", userId);
            return;
        }

        // societyId is required to partition the subscription lookup
        if (data is null || !data.TryGetValue("societyId", out var societyId) || string.IsNullOrWhiteSpace(societyId))
        {
            logger.LogWarning("No societyId in notification data — cannot look up subscriptions for user {UserId}", userId);
            return;
        }

        var subscriptions = await pushSubscriptionStore.GetByUserIdAsync(userId, societyId, ct);
        if (subscriptions.Count == 0)
        {
            logger.LogDebug("No push subscriptions for user {UserId}", userId);
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

        var pushClient = new WebPushClient();

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await pushClient.SendNotificationAsync(pushSub, payload, vapidDetails);
                logger.LogInformation("Push sent to user {UserId}", userId);
            }
            catch (WebPushException ex) when ((int)ex.StatusCode is 410 or 404)
            {
                logger.LogInformation("Push subscription expired — removing for user {UserId}", userId);
                await pushSubscriptionStore.DeleteByEndpointAsync(sub.Endpoint, sub.SocietyId, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send push to user {UserId}", userId);
            }
        }
    }
}
