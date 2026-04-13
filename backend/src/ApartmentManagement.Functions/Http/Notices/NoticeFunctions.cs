using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Queries.Notice;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using System.Net;

namespace ApartmentManagement.Functions.Http;

public class NoticeFunctions(ISender mediator)
{
    [Function("PostNotice")]
    public async Task<IActionResult> PostNotice(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/notices")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateNoticeCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        try
        {
            var result = await mediator.Send(command with { SocietyId = societyId }, ct);
            return result.ToActionResult(201);
        }
        catch (ValidationException vex)
        {
            return await req.ToValidationErrorResponse(vex);
        }
        catch (AppException aex)
        {
            return await req.ToAppErrorResponse(aex);
        }
        catch (Exception)
        {
            return new StatusCodeResult((int)HttpStatusCode.InternalServerError);
        }
    }

    [Function("GetNotice")]
    public async Task<IActionResult> GetNotice(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/notices/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetNoticeQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ListNotices")]
    public async Task<IActionResult> ListNotices(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/notices")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetActiveNoticesQuery(societyId, null, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }
}
