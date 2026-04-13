using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Queries.Apartment;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
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

    [Function("GetApartmentResidentHistory")]
    public async Task<IActionResult> GetApartmentResidentHistory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/apartments/{id}/resident-history")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetApartmentResidentHistoryQuery(societyId, id), ct);
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

    [Function("DeleteApartment")]
    public async Task<IActionResult> DeleteApartment(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "societies/{societyId}/apartments/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new DeleteApartmentCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ChangeApartmentStatus")]
    public async Task<IActionResult> ChangeApartmentStatus(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/apartments/{id}/status")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<ChangeApartmentStatusRequest>(ct);
        if (body is null)
            return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new ChangeApartmentStatusCommand(societyId, id, body.Status, body.Reason), ct);
        return result.ToActionResult();
    }

    [Function("BulkImportApartmentsFromCsv")]
    public async Task<IActionResult> BulkImportApartmentsFromCsv(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/apartments/import-csv")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var form = await req.ReadFormAsync(ct);
        var file = form.Files.GetFile("file");
        if (file is null)
            return new BadRequestObjectResult(new { error = "Upload a CSV file using the 'file' form field." });

        try
        {
            var apartments = await ApartmentCsvParser.ParseAsync(file, ct);
            var result = await mediator.Send(new BulkImportApartmentsCommand(societyId, apartments), ct);
            return result.ToActionResult();
        }
        catch (InvalidDataException ex)
        {
            return new BadRequestObjectResult(new { error = ex.Message });
        }
    }
}
