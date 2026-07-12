using ApartmentManagement.Application.Commands.Sos;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Sos;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class SosFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("TriggerSosAlert")]
    public async Task<IActionResult> TriggerSosAlert(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/sos-alerts")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUUser")) return new ForbidResult();
        var request = await req.DeserializeAsync<TriggerSosAlertRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new TriggerSosAlertCommand(societyId, currentUser.UserId, request.Category, request.Note), ct);
        return result.ToActionResult(201);
    }

    [Function("ListSosAlerts")]
    public async Task<IActionResult> ListSosAlerts(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/sos-alerts")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        // Any authenticated society member can view active SOS alerts — only SUAdmin/SUSecurity
        // can acknowledge/resolve them (see AcknowledgeSosAlert/ResolveSosAlert below).
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var status = Enum.TryParse<SosAlertStatus>(req.Query["status"], true, out var parsedStatus) ? parsedStatus : (SosAlertStatus?)null;
        var category = Enum.TryParse<SosCategory>(req.Query["category"], true, out var parsedCategory) ? parsedCategory : (SosCategory?)null;

        var result = await mediator.Send(new GetSosAlertsQuery(
            societyId, status, category,
            ParseDate(req.Query["fromDate"]), ParseDate(req.Query["toDate"]),
            new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("GetSosAlert")]
    public async Task<IActionResult> GetSosAlert(
        // Constrained to :guid so the literal sibling route (report) never binds here as "id".
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/sos-alerts/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var result = await mediator.Send(new GetSosAlertQuery(societyId, id, currentUser.UserId, currentUser.Role), ct);
        return result.ToActionResult();
    }

    [Function("AcknowledgeSosAlert")]
    public async Task<IActionResult> AcknowledgeSosAlert(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/sos-alerts/{id}/acknowledge")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new AcknowledgeSosAlertCommand(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("ResolveSosAlert")]
    public async Task<IActionResult> ResolveSosAlert(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/sos-alerts/{id}/resolve")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new ResolveSosAlertCommand(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("MarkSosAlertFalseAlarm")]
    public async Task<IActionResult> MarkSosAlertFalseAlarm(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/sos-alerts/{id}/false-alarm")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUUser")) return new ForbidResult();
        var result = await mediator.Send(new MarkSosAlertFalseAlarmCommand(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("GetSosAlertReport")]
    public async Task<IActionResult> GetSosAlertReport(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/sos-alerts/report")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();

        var fromDate = ParseDate(req.Query["fromDate"]) ?? DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1);
        var toDate = ParseDate(req.Query["toDate"]) ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await mediator.Send(new GetSosAlertReportQuery(societyId, fromDate, toDate), ct);
        return result.ToActionResult();
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var date) ? date : null;
}
