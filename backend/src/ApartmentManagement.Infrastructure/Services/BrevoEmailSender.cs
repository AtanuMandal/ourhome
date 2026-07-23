using System.Net.Http.Headers;
using System.Text;
using ApartmentManagement.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace ApartmentManagement.Infrastructure.Services;

/// <summary>Sends transactional email via the Brevo API (POST /v3/smtp/email, authenticated
/// with an api-key header — see Infrastructure:BrevoApiKey in local.settings.json), instead of
/// a mailbox/SMTP relay. Registered as a typed HttpClient directly in Program.cs (not just via
/// AddInfrastructure) so the email transport is explicitly dependency-injectable and swappable
/// independent of <see cref="NotificationService"/>, which depends only on <see cref="IEmailSender"/>.</summary>
public sealed class BrevoEmailSender(
    HttpClient httpClient,
    IOptions<InfrastructureSettings> settings,
    ILogger<BrevoEmailSender> logger) : IEmailSender
{
    private const string SendEmailUrl = "https://api.brevo.com/v3/smtp/email";
    private readonly InfrastructureSettings _settings = settings.Value;

    public async Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.BrevoApiKey))
        {
            logger.LogWarning("Brevo API key not configured. Skipping email to {To}", to);
            return;
        }

        try
        {
            var payload = new
            {
                sender = new { name = _settings.EmailSenderName, email = _settings.EmailSenderAddress },
                to = new[] { new { email = to } },
                subject,
                htmlContent = $"<p>{body}</p>",
                textContent = body,
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, SendEmailUrl)
            {
                Content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json"),
            };
            request.Headers.TryAddWithoutValidation("api-key", _settings.BrevoApiKey);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            using var response = await httpClient.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(ct);
                logger.LogError("Brevo email send to {To} failed with {StatusCode}: {Body}", to, response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To} via Brevo", to);
        }
    }
}
