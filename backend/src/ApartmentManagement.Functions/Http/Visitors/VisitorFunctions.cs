using ApartmentManagement.Application.Commands.Visitor;
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
        var command = await req.DeserializeAsync<RegisterVisitorCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("CheckOutVisitor")]
    public async Task<IActionResult> CheckOutVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/checkout")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new CheckOutVisitorCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ListVisitors")]
    public async Task<IActionResult> ListVisitors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetVisitorsBySocietyQuery(societyId, null, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }
}
