using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Queries.Amenity;
using ApartmentManagement.Functions.Helpers;
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
