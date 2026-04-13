using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Queries.Society;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using System.Text.Json;

namespace ApartmentManagement.Functions.Http;

public class SocietyFunctions(ISender mediator)
{
    [Function("CreateSociety")]
    public async Task<IActionResult> CreateSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies")] HttpRequest req,
        CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateSocietyCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command, ct);
        return result.ToActionResult(201);
    }

    [Function("GetSociety")]
    public async Task<IActionResult> GetSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{id}")] HttpRequest req,
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
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetAllSocietiesQuery(new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("UpdateSociety")]
    public async Task<IActionResult> UpdateSociety(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{id}")] HttpRequest req,
        string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<UpdateSocietyRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(
            new UpdateSocietyCommand(
                id,
                body.Name,
                body.ContactEmail,
                body.ContactPhone,
                body.TotalBlocks,
                body.TotalApartments,
                body.SocietyUsers,
                body.Committees),
            ct);
        return result.ToActionResult();
    }
}
