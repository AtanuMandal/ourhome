using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
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

public class NoticeFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("PostNotice")]
    public async Task<IActionResult> PostNotice(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/notices")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateNoticeCommand>(ct);
        if (command is null) return HttpHelpers.MissingBody();
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

    [Function("UpdateNotice")]
    public async Task<IActionResult> UpdateNotice(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/notices/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<UpdateNoticeCommand>(ct);
        if (command is null) return HttpHelpers.MissingBody();
        try
        {
            var result = await mediator.Send(command with { SocietyId = societyId, NoticeId = id }, ct);
            return result.ToActionResult();
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
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/notices/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetNoticeQuery(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("ListNotices")]
    public async Task<IActionResult> ListNotices(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/notices")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetActiveNoticesQuery(
            societyId, null,
            new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize },
            currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("MarkNoticeRead")]
    public async Task<IActionResult> MarkNoticeRead(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "societies/{societyId}/notices/{id}/read")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new MarkNoticeReadCommand(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("GetNoticeReadReceipts")]
    public async Task<IActionResult> GetNoticeReadReceipts(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/notices/{id}/read-receipts")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetNoticeReadReceiptsQuery(societyId, id), ct);
        return result.ToActionResult();
    }
}
