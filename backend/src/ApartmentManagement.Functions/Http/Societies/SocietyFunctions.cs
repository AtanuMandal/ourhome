using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Society;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using System.Text.Json;

namespace ApartmentManagement.Functions.Http;

public class SocietyFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("CreateSociety")]
    public async Task<IActionResult> CreateSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies")] HttpRequest req,
        CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin")) return new ForbidResult();

        var command = await req.DeserializeAsync<CreateSocietyCommand>(ct);
        if (command is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(command, ct);
        return result.ToActionResult(201);
    }

    [Function("GetSociety")]
    public async Task<IActionResult> GetSociety(
        // Constrained to :guid so any future literal sibling route (e.g. societies/summary) can't bind here as "id".
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{id:guid}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetSocietyQuery(id), ct);
        return result.ToActionResult();
    }

    [Function("ListSocieties")]
    public async Task<IActionResult> ListSocieties(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies")] HttpRequest req,
        CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin", "HQUser")) return new ForbidResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetAllSocietiesQuery(new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("UpdateSociety")]
    public async Task<IActionResult> UpdateSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{id:guid}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        var body = await req.DeserializeAsync<UpdateSocietyRequest>(ct);
        if (body is null) return HttpHelpers.MissingBody();
        var result = await mediator.Send(
            new UpdateSocietyCommand(
                id,
                body.Name,
                body.ContactEmail,
                body.ContactPhone,
                body.TotalBlocks,
                body.TotalApartments,
                body.MaintenanceOverdueThresholdDays,
                body.SocietyUsers,
                body.Committees,
                body.Street, body.City, body.State, body.PostalCode, body.Country,
                body.ThemeId,
                body.MaxUsersPerApartment,
                body.VisitorOverstayThresholdHours),
            ct);
        return result.ToActionResult();
    }

    [Function("ActivateSociety")]
    public async Task<IActionResult> ActivateSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{id:guid}/activate")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin")) return new ForbidResult();

        var result = await mediator.Send(new PublishSocietyCommand(id), ct);
        return result.ToActionResult();
    }

    [Function("DeactivateSociety")]
    public async Task<IActionResult> DeactivateSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{id:guid}/deactivate")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin")) return new ForbidResult();

        var result = await mediator.Send(new DeactivateSocietyCommand(id), ct);
        return result.ToActionResult();
    }

    [Function("GetSocietySummaryReport")]
    public async Task<IActionResult> GetSocietySummaryReport(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{id:guid}/report")] HttpRequest req,
        string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("HQAdmin", "HQUser")) return new ForbidResult();

        var result = await mediator.Send(new GetSocietySummaryReportQuery(id), ct);
        return result.ToActionResult();
    }
}
