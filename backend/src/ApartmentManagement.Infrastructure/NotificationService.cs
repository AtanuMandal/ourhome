using ApartmentManagement.Application.Interfaces;
using Azure.Communication.Email;
using Azure.Communication.Sms;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Infrastructure.Services;

public class NotificationService(
    IOptions<InfrastructureSettings> settings,
    ILogger<NotificationService> logger) : INotificationService
{
    private readonly InfrastructureSettings _settings = settings.Value;

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

    public Task SendPushNotificationAsync(string userId, string title, string body, CancellationToken ct = default)
    {
        logger.LogInformation("Push notification (stub): UserId={UserId} Title={Title}", userId, title);
        return Task.CompletedTask;
    }

    public async Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default)
    {
        foreach (var recipient in recipients)
            await SendEmailAsync(recipient, subject, body, ct);
    }
}