using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.DTOs.Visitor;
using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class VisitorFunctions(ISender mediator)
{
    [Function("RegisterVisitor")]
    public async Task<IActionResult> RegisterVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<RegisterVisitorRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new RegisterVisitorCommand(
                societyId,
                body.VisitorName,
                body.VisitorPhone,
                body.VisitorEmail,
                body.Purpose,
                body.HostApartmentId,
                body.HostUserId,
                body.VehicleNumber),
            ct);
        return result.ToActionResult(201);
    }

    [Function("GetVisitor")]
    public async Task<IActionResult> GetVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetVisitorLogQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ListVisitors")]
    public async Task<IActionResult> ListVisitors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);

        DateOnly? fromDate = DateOnly.TryParse(req.Query["fromDate"], out var parsedFrom) ? parsedFrom : null;
        DateOnly? toDate = DateOnly.TryParse(req.Query["toDate"], out var parsedTo) ? parsedTo : null;
        var apartmentId = req.Query["apartmentId"].ToString();
        var visitorName = req.Query["visitorName"].ToString();
        var status = req.Query["status"].ToString();

        var result = await mediator.Send(
            new GetVisitorsBySocietyQuery(
                societyId,
                fromDate,
                toDate,
                string.IsNullOrWhiteSpace(apartmentId) ? null : apartmentId,
                string.IsNullOrWhiteSpace(visitorName) ? null : visitorName,
                string.IsNullOrWhiteSpace(status) ? null : status,
                new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }),
            ct);
        return result.ToActionResult();
    }

    [Function("ListMyVisitors")]
    public async Task<IActionResult> ListMyVisitors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/my")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);

        DateOnly? fromDate = DateOnly.TryParse(req.Query["fromDate"], out var parsedFrom) ? parsedFrom : null;
        DateOnly? toDate = DateOnly.TryParse(req.Query["toDate"], out var parsedTo) ? parsedTo : null;
        var apartmentId = req.Query["apartmentId"].ToString();
        var visitorName = req.Query["visitorName"].ToString();
        var status = req.Query["status"].ToString();

        var result = await mediator.Send(
            new GetMyVisitorsQuery(
                societyId,
                fromDate,
                toDate,
                string.IsNullOrWhiteSpace(apartmentId) ? null : apartmentId,
                string.IsNullOrWhiteSpace(visitorName) ? null : visitorName,
                string.IsNullOrWhiteSpace(status) ? null : status,
                new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }),
            ct);
        return result.ToActionResult();
    }

    [Function("ListPendingVisitorApprovals")]
    public async Task<IActionResult> ListPendingVisitorApprovals(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/pending-approvals")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);

        var result = await mediator.Send(
            new GetPendingVisitorApprovalsQuery(
                societyId,
                new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }),
            ct);
        return result.ToActionResult();
    }

    [Function("ApproveVisitor")]
    public async Task<IActionResult> ApproveVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/approve")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new ApproveVisitorCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("DenyVisitor")]
    public async Task<IActionResult> DenyVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/deny")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new DenyVisitorCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("CheckInVisitor")]
    public async Task<IActionResult> CheckInVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/checkin")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<CheckInVisitorRequest>(ct);
        var result = await mediator.Send(new CheckInVisitorCommand(societyId, id, body?.PassCode), ct);
        return result.ToActionResult();
    }

    [Function("CheckOutVisitor")]
    public async Task<IActionResult> CheckOutVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/checkout")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new CheckOutVisitorCommand(societyId, id), ct);
        return result.ToActionResult();
    }
}
