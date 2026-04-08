using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Queries.Amenity;
using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Queries.Complaint;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Queries.Notice;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class AmenityFunctions(ISender mediator)
{
    [Function("CreateAmenity")]
    public async Task<IActionResult> CreateAmenity(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/amenities")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateAmenityCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("ListAmenities")]
    public async Task<IActionResult> ListAmenities(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/amenities")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetAmenitiesBySocietyQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("BookAmenity")]
    public async Task<IActionResult> BookAmenity(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/amenity-bookings")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<BookAmenityCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("GetAmenityAvailability")]
    public async Task<IActionResult> GetAmenityAvailability(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/amenities/{amenityId}/availability")] HttpRequest req,
        string societyId, string amenityId, CancellationToken ct)
    {
        var dateStr = req.Query["date"].FirstOrDefault();
        if (!DateOnly.TryParse(dateStr, out var date)) date = DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await mediator.Send(new GetAmenityAvailabilityQuery(societyId, amenityId, date), ct);
        return result.ToActionResult();
    }
}

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

public class NoticeFunctions(ISender mediator)
{
    [Function("PostNotice")]
    public async Task<IActionResult> PostNotice(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/notices")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateNoticeCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
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
