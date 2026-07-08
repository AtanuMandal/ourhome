using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Functions.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

/// <summary>
/// Manages mobile push tokens (FCM/APNs) for native iOS and Android app push notifications.
/// Tokens are registered per-device and fanned out by the MobilePushPublisher function.
/// </summary>
public class MobilePushTokenFunctions(INotificationService notificationService, ICurrentUserService currentUser)
{
    [Function("RegisterMobilePushToken")]
    public async Task<IActionResult> RegisterMobilePushToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "societies/{societyId}/users/{userId}/mobile-push-tokens")] HttpRequest req,
        string societyId, string userId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            return new UnauthorizedResult();

        if (currentUser.UserId != userId && !currentUser.IsInRoles("SUAdmin", "HQAdmin"))
            return new ObjectResult(new { error = "You are not authorised to manage tokens for this user." })
                { StatusCode = 403 };

        var dto = await req.DeserializeAsync<MobilePushTokenDto>(ct);
        if (dto is null || string.IsNullOrWhiteSpace(dto.Token))
            return new BadRequestObjectResult("token is required.");

        var platform = dto.Platform?.Trim().ToLowerInvariant();
        if (platform is not ("android" or "ios"))
            return new BadRequestObjectResult("platform must be 'android' or 'ios'.");

        await notificationService.SaveMobilePushTokenAsync(
            userId, societyId, platform, dto.Token, dto.AppVersion, ct);

        return new StatusCodeResult(201);
    }

    [Function("DeleteMobilePushToken")]
    public async Task<IActionResult> DeleteMobilePushToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete",
            Route = "societies/{societyId}/users/{userId}/mobile-push-tokens")] HttpRequest req,
        string societyId, string userId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            return new UnauthorizedResult();

        if (currentUser.UserId != userId && !currentUser.IsInRoles("SUAdmin", "HQAdmin"))
            return new ObjectResult(new { error = "You are not authorised to manage tokens for this user." })
                { StatusCode = 403 };

        var dto = await req.DeserializeAsync<MobilePushTokenDeleteDto>(ct);
        if (dto is null || string.IsNullOrWhiteSpace(dto.Token))
            return new BadRequestObjectResult("token is required.");

        await notificationService.DeleteMobilePushTokenAsync(userId, societyId, dto.Token, ct);
        return new NoContentResult();
    }
}

public sealed record MobilePushTokenDto(string Platform, string Token, string? AppVersion);
public sealed record MobilePushTokenDeleteDto(string Token);
