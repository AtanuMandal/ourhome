using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Queries.Apartment;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Functions.Helpers;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class ApartmentFunctions(ISender mediator)
{
    [Function("CreateApartment")]
    public async Task<IActionResult> CreateApartment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/apartments")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateApartmentCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("GetApartment")]
    public async Task<IActionResult> GetApartment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/apartments/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetApartmentQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ListApartments")]
    public async Task<IActionResult> ListApartments(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/apartments")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetApartmentsBySocietyQuery(societyId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }, null, null), ct);
        return result.ToActionResult();
    }

    [Function("UpdateApartment")]
    public async Task<IActionResult> UpdateApartment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/apartments/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<UpdateApartmentCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId, ApartmentId = id }, ct);
        return result.ToActionResult();
    }
}

public class UserFunctions(ISender mediator)
{
    [Function("RegisterUser")]
    public async Task<IActionResult> RegisterUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateUserCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("ListUsers")]
    public async Task<IActionResult> ListUsers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(
            new GetUsersBySocietyQuery(societyId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }, null), ct);
        return result.ToActionResult();
    }

    [Function("RequestOtpByEmail")]
    public async Task<IActionResult> RequestOtpByEmail(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/auth/request-otp")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<RequestOtpByEmailRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(new RequestOtpByEmailCommand(societyId, body.Email), ct);
        return result.ToActionResult();
    }

    [Function("GetUser")]
    public async Task<IActionResult> GetUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetUserQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("SendOtp")]
    public async Task<IActionResult> SendOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/send-otp")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new SendOtpCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("VerifyOtp")]
    public async Task<IActionResult> VerifyOtp(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{id}/verify-otp")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<OtpCodeBody>(ct);
        if (body is null || string.IsNullOrWhiteSpace(body.OtpCode))
            return new BadRequestObjectResult("Request body must contain { \"otpCode\": \"...\" }");
        var result = await mediator.Send(new VerifyOtpCommand(societyId, id, body.OtpCode), ct);
        return result.ToActionResult();
    }
}
