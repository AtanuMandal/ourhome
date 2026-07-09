using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

/// <summary>
/// Platform-level HQ user endpoints. HQ users (HQAdmin / HQUser) are not scoped
/// to any society; they are stored under the reserved "hq" partition key.
/// Routes: /api/hq/users/...
/// </summary>
public class HQUserFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("CreateHQUser")]
    public async Task<IActionResult> CreateHQUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "hq/users")] HttpRequest req,
        CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin")) return new ForbidResult();

        var body = await req.DeserializeAsync<CreateHQUserRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body.");

        if (body.Role != UserRole.HQAdmin && body.Role != UserRole.HQUser)
            return new BadRequestObjectResult("Role must be HQAdmin or HQUser for HQ users.");

        var command = new CreateUserCommand(
            HqConstants.PartitionKey, body.FullName, body.Email, body.Phone, body.Role, ResidentType.SocietyAdmin, null);

        var result = await mediator.Send(command, ct);
        return result.ToActionResult(201);
    }

    [Function("GetHQUser")]
    public async Task<IActionResult> GetHQUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "hq/users/{id:guid}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin", "HQUser")) return new ForbidResult();

        var result = await mediator.Send(new GetUserQuery(HqConstants.PartitionKey, id), ct);
        return result.ToActionResult();
    }

    [Function("ListHQUsers")]
    public async Task<IActionResult> ListHQUsers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "hq/users")] HttpRequest req,
        CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin", "HQUser")) return new ForbidResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);

        var result = await mediator.Send(new GetUsersBySocietyQuery(
            HqConstants.PartitionKey, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }, null), ct);
        return result.ToActionResult();
    }

    [Function("ActivateHQUser")]
    public async Task<IActionResult> ActivateHQUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "hq/users/{id}/activate")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin")) return new ForbidResult();

        var result = await mediator.Send(new ActivateUserCommand(HqConstants.PartitionKey, id), ct);
        return result.ToActionResult();
    }

    [Function("DeactivateHQUser")]
    public async Task<IActionResult> DeactivateHQUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "hq/users/{id}/deactivate")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin")) return new ForbidResult();

        var result = await mediator.Send(new DeactivateUserCommand(HqConstants.PartitionKey, id), ct);
        return result.ToActionResult();
    }

    [Function("SendHQUserOtp")]
    public async Task<IActionResult> SendHQUserOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "hq/users/{id}/send-otp")] HttpRequest req,
        string id, CancellationToken ct)
    {
        var result = await mediator.Send(new SendOtpCommand(HqConstants.PartitionKey, id), ct);
        return result.ToActionResult();
    }

    [Function("VerifyHQUserOtp")]
    public async Task<IActionResult> VerifyHQUserOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "hq/users/{id}/verify-otp")] HttpRequest req,
        string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<OtpCodeBody>(ct);
        if (body is null || string.IsNullOrWhiteSpace(body.OtpCode))
            return new BadRequestObjectResult("Request body must contain { \"otpCode\": \"...\" }");
        var result = await mediator.Send(new VerifyOtpCommand(HqConstants.PartitionKey, id, body.OtpCode), ct);
        return result.ToActionResult();
    }
}
