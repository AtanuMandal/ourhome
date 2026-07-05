using ApartmentManagement.Infrastructure;
using Azure.Messaging;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ApartmentManagement.Functions;

/// <summary>
/// Event Grid subscriber that fans out mobile push notifications (FCM/APNs) to registered device
/// tokens. Actual HTTP dispatch to FCM/APNs is a future enhancement — this function stubs it with
/// log messages per token so the wiring and token lookup are in place.
/// </summary>
public class MobilePushPublisher(
    IMobilePushTokenStore mobilePushTokenStore,
    ILogger<MobilePushPublisher> logger)
{
    [Function("MobilePushPublisher")]
    public async Task Run([EventGridTrigger] CloudEvent cloudEvent)
    {
        if (cloudEvent is null)
        {
            logger.LogWarning("MobilePushPublisher received a null CloudEvent.");
            return;
        }

        // Determine user-friendly title and body from the event type.
        var (title, body) = cloudEvent.Type switch
        {
            "ApartmentManagement.MaintenanceChargeCreated"    => ("Maintenance Due",         "A new maintenance charge has been added."),
            "ApartmentManagement.MaintenancePaymentApproved"  => ("Payment Confirmed",        "Your maintenance payment has been approved."),
            "ApartmentManagement.VisitorRegistered"           => ("Visitor at Gate",          "A visitor is waiting for your approval."),
            "ApartmentManagement.NoticePublished"             => ("New Notice",               "A new notice has been posted."),
            "ApartmentManagement.ComplaintStatusChanged"      => ("Complaint Update",         "Your complaint status has been updated."),
            _                                                 => (cloudEvent.Type ?? "Update", "You have a new notification.")
        };

        // Parse the event data to extract userId and societyId.
        JsonElement? dataElement = null;
        try
        {
            dataElement = cloudEvent.Data?.ToObjectFromJson<JsonElement>();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "MobilePushPublisher could not deserialise event data for type {EventType}", cloudEvent.Type);
            return;
        }

        if (dataElement is null)
        {
            logger.LogWarning("MobilePushPublisher received event {EventType} with no data payload.", cloudEvent.Type);
            return;
        }

        if (!dataElement.Value.TryGetProperty("userId", out var userIdElement) ||
            string.IsNullOrWhiteSpace(userIdElement.GetString()))
        {
            logger.LogWarning("MobilePushPublisher: missing userId in event data for {EventType}", cloudEvent.Type);
            return;
        }

        if (!dataElement.Value.TryGetProperty("societyId", out var societyIdElement) ||
            string.IsNullOrWhiteSpace(societyIdElement.GetString()))
        {
            logger.LogWarning("MobilePushPublisher: missing societyId in event data for {EventType}", cloudEvent.Type);
            return;
        }

        var userId    = userIdElement.GetString()!;
        var societyId = societyIdElement.GetString()!;

        var tokens = await mobilePushTokenStore.GetByUserIdAsync(userId, societyId);
        if (tokens.Count == 0)
        {
            logger.LogDebug("MobilePushPublisher: no mobile push tokens for user {UserId}", userId);
            return;
        }

        // Stub: log each token — actual FCM/APNs HTTP dispatch is a future enhancement.
        foreach (var tokenDoc in tokens)
        {
            logger.LogInformation(
                "MobilePushPublisher stub: would send '{Title}' to {Platform} token for user {UserId} (token prefix: {Prefix}…)",
                title, tokenDoc.Platform, userId,
                tokenDoc.Token.Length > 8 ? tokenDoc.Token[..8] : tokenDoc.Token);
        }

        logger.LogInformation(
            "MobilePushPublisher: processed {EventType} — '{Title}' queued for {Count} token(s) for user {UserId}",
            cloudEvent.Type, title, tokens.Count, userId);
    }
}
