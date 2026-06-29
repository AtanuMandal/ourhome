using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Functions.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

/// <summary>
/// Manages Web Push subscriptions for browser-native push notifications.
/// Clients exchange VAPID public key via GET then register their subscription via POST/DELETE.
/// </summary>
public class PushSubscriptionFunctions(INotificationService notificationService, ICurrentUserService currentUser)
{
    [Function("GetVapidPublicKey")]
    public IActionResult GetVapidPublicKey(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "push/vapid-public-key")] HttpRequest req)
    {
        var key = notificationService.GetVapidPublicKey();
        if (string.IsNullOrWhiteSpace(key))
            return new ObjectResult(new { message = "Push notifications are not configured on this server." })
                { StatusCode = 503 };

        return new OkObjectResult(new { vapidPublicKey = key });
    }

    [Function("SavePushSubscription")]
    public async Task<IActionResult> SavePushSubscription(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/push-subscriptions")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            return new UnauthorizedResult();

        var dto = await req.DeserializeAsync<PushSubscriptionDto>(ct);
        if (dto is null || string.IsNullOrWhiteSpace(dto.Endpoint) ||
            string.IsNullOrWhiteSpace(dto.P256dh) || string.IsNullOrWhiteSpace(dto.Auth))
            return new BadRequestObjectResult("endpoint, p256dh and auth are required.");

        await notificationService.SavePushSubscriptionAsync(
            currentUser.UserId, societyId, dto.Endpoint, dto.P256dh, dto.Auth, ct);

        return new StatusCodeResult(201);
    }

    [Function("DeletePushSubscription")]
    public async Task<IActionResult> DeletePushSubscription(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "societies/{societyId}/push-subscriptions")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            return new UnauthorizedResult();

        var dto = await req.DeserializeAsync<PushSubscriptionDto>(ct);
        if (dto is null || string.IsNullOrWhiteSpace(dto.Endpoint))
            return new BadRequestObjectResult("endpoint is required.");

        await notificationService.DeletePushSubscriptionAsync(currentUser.UserId, societyId, dto.Endpoint, ct);
        return new NoContentResult();
    }
}

public sealed record PushSubscriptionDto(string Endpoint, string P256dh, string Auth);
