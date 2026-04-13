using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Queries.Complaint;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class ComplaintFunctions(ISender mediator)
{
    [Function("RaiseComplaint")]
    public async Task<IActionResult> RaiseComplaint(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/complaints")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateComplaintCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("GetComplaint")]
    public async Task<IActionResult> GetComplaint(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/complaints/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetComplaintQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ListComplaints")]
    public async Task<IActionResult> ListComplaints(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/complaints")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetComplaintsBySocietyQuery(societyId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }, null, null), ct);
        return result.ToActionResult();
    }

    [Function("ResolveComplaint")]
    public async Task<IActionResult> ResolveComplaint(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/complaints/{id}/resolve")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<UpdateComplaintStatusCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId, ComplaintId = id }, ct);
        return result.ToActionResult();
    }
}
