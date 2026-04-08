using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.DTOs;
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
public class HQUserFunctions(ISender mediator)
{
    [Function("CreateHQUser")]
    public async Task<IActionResult> CreateHQUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "hq/users")] HttpRequest req,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<CreateHQUserRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body.");

        if (body.Role != UserRole.HQAdmin && body.Role != UserRole.HQUser)
            return new BadRequestObjectResult("Role must be HQAdmin or HQUser for HQ users.");

        var command = new CreateUserCommand(
            HqConstants.PartitionKey, body.FullName, body.Email, body.Phone, body.Role, null);

        var result = await mediator.Send(command, ct);
        return result.ToActionResult(201);
    }

    [Function("GetHQUser")]
    public async Task<IActionResult> GetHQUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "hq/users/{id}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetUserQuery(HqConstants.PartitionKey, id), ct);
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
