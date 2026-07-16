using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using IO = System.IO;

namespace ApartmentManagement.Functions.Http;

public class VisitorFunctions(ISender mediator, ICurrentUserService currentUser, IConfiguration configuration)
{
    [Function("RegisterVisitor")]
    public async Task<IActionResult> RegisterVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity", "SUUser")) return new ForbidResult();
        var request = await req.DeserializeAsync<RegisterVisitorRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(new RegisterVisitorCommand(
            societyId,
            request.VisitorName,
            request.VisitorPhone,
            request.VisitorEmail,
            request.Purpose,
            request.ApartmentId,
            request.CompanyName,
            request.VehicleNumber,
            request.IsPreApproved,
            request.ValidityHours,
            request.VisitorImageUrl), ct);

        return result.ToActionResult(201);
    }

    [Function("ApproveVisitor")]
    public async Task<IActionResult> ApproveVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/approve")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var result = await mediator.Send(new ApproveVisitorCommand(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("DenyVisitor")]
    public async Task<IActionResult> DenyVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/deny")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var result = await mediator.Send(new DenyVisitorCommand(societyId, id, currentUser.UserId), ct);
        return result.ToActionResult();
    }

    [Function("CheckInVisitor")]
    public async Task<IActionResult> CheckInVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/checkin")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var request = await req.DeserializeAsync<CheckInVisitorRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(new CheckInVisitorCommand(societyId, request.PassCode), ct);
        return result.ToActionResult();
    }

    [Function("CheckOutVisitor")]
    public async Task<IActionResult> CheckOutVisitor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/checkout")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new CheckOutVisitorCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("GetVisitor")]
    public async Task<IActionResult> GetVisitor(
        // Constrained to :guid so literal sibling routes (verify/active/lookups/export) never bind here as "id".
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetVisitorLogQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("VerifyVisitorPass")]
    public async Task<IActionResult> VerifyVisitorPass(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/verify")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var passCode = req.Query["passCode"].ToString();
        if (string.IsNullOrWhiteSpace(passCode))
            return new BadRequestObjectResult("passCode is required.");

        var result = await mediator.Send(new GetVisitorByPassCodeQuery(societyId, passCode), ct);
        return result.ToActionResult();
    }

    [Function("ListVisitors")]
    public async Task<IActionResult> ListVisitors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        DateOnly? fromDate = ParseDate(req.Query["fromDate"]);
        DateOnly? toDate = ParseDate(req.Query["toDate"]);

        // Residents may only see their own apartment's visitors
        var apartmentId = currentUser.IsInRole("SUUser")
            ? currentUser.ApartmentId
            : EmptyToNull(req.Query["apartmentId"]);

        var result = await mediator.Send(new GetVisitorsBySocietyQuery(
            societyId,
            apartmentId,
            EmptyToNull(req.Query["search"]),
            EmptyToNull(req.Query["residentName"]),
            EmptyToNull(req.Query["status"]),
            fromDate,
            toDate,
            new PaginationParams
            {
                Page = page < 1 ? 1 : page,
                PageSize = pageSize < 1 ? 20 : pageSize
            }), ct);

        return result.ToActionResult();
    }

    [Function("GetVisitorDefaultView")]
    public async Task<IActionResult> GetVisitorDefaultView(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/default-view")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        int.TryParse(req.Query["recentCount"], out var recentCount);

        // Residents may only see their own apartment's visitors
        var apartmentId = currentUser.IsInRole("SUUser") ? currentUser.ApartmentId : null;

        var result = await mediator.Send(new GetVisitorDefaultViewQuery(societyId, apartmentId, recentCount), ct);
        return result.ToActionResult();
    }

    [Function("ListActiveVisitors")]
    public async Task<IActionResult> ListActiveVisitors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/active")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetActiveVisitorsQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("GetVisitorLookups")]
    public async Task<IActionResult> GetVisitorLookups(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/lookups")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var result = await mediator.Send(new GetVisitorLookupsQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("ExportVisitors")]
    public async Task<IActionResult> ExportVisitors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/visitors/export")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var result = await mediator.Send(new ExportVisitorsQuery(
            societyId,
            EmptyToNull(req.Query["apartmentId"]),
            EmptyToNull(req.Query["search"]),
            EmptyToNull(req.Query["residentName"]),
            EmptyToNull(req.Query["status"]),
            ParseDate(req.Query["fromDate"]),
            ParseDate(req.Query["toDate"])), ct);

        if (!result.IsSuccess || result.Value is null)
            return result.ToActionResult();

        return new FileContentResult(result.Value.Content, result.Value.ContentType)
        {
            FileDownloadName = result.Value.FileName
        };
    }

    [Function("UploadVisitorImage")]
    public async Task<IActionResult> UploadVisitorImage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/images/upload")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!req.HasFormContentType)
            return new BadRequestObjectResult("Request must be multipart/form-data");

        var form = await req.ReadFormAsync(ct);
        var file = form.Files["file"];
        if (file is null || file.Length == 0)
            return new BadRequestObjectResult("A visitor image file is required.");

        await using var stream = file.OpenReadStream();
        using var memory = new IO.MemoryStream();
        await stream.CopyToAsync(memory, ct);

        var result = await mediator.Send(
            new UploadVisitorImageCommand(societyId, file.FileName, file.ContentType, memory.ToArray()), ct);
        return result.ToActionResult(201);
    }

    [Function("GetPublicVisitorPass")]
    public async Task<IActionResult> GetPublicVisitorPass(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "visitors/pass/{passCode}")] HttpRequest req,
        string passCode, CancellationToken ct)
    {
        var result = await mediator.Send(new GetPublicVisitorPassQuery(passCode), ct);
        return result.ToActionResult();
    }

    [Function("ShareVisitorPass")]
    public async Task<IActionResult> ShareVisitorPass(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/visitors/{id}/share")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var request = await req.DeserializeAsync<ShareVisitorPassRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var frontendUrl = configuration["FrontendUrl"] ?? "https://localhost:4200";
        var result = await mediator.Send(new ShareVisitorPassCommand(societyId, id, request.Email, request.Phone, frontendUrl), ct);
        return result.ToActionResult();
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var date) ? date : null;

    private static string? EmptyToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
