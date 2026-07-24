using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Amenity;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class AmenityFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("CreateAmenity")]
    public async Task<IActionResult> CreateAmenity(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/amenities")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateAmenityCommand>(ct);
        if (command is null) return HttpHelpers.MissingBody();
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
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var command = await req.DeserializeAsync<BookAmenityCommand>(ct);
        if (command is null) return HttpHelpers.MissingBody();

        // The booker is always the authenticated user; the apartment falls back to the
        // JWT claim so clients that don't (or can't) send it still book correctly.
        var result = await mediator.Send(command with
        {
            SocietyId = societyId,
            UserId = currentUser.UserId,
            ApartmentId = string.IsNullOrWhiteSpace(command.ApartmentId)
                ? currentUser.ApartmentId ?? string.Empty
                : command.ApartmentId
        }, ct);
        return result.ToActionResult(201);
    }

    [Function("ListAmenityBookings")]
    public async Task<IActionResult> ListAmenityBookings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/amenity-bookings")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var pagination = new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 50 : pageSize };

        // Admins see every booking (to approve/reject/cancel); residents see their own.
        var result = currentUser.IsInRoles("SUAdmin", "HQAdmin")
            ? await mediator.Send(new GetSocietyBookingsQuery(societyId, pagination), ct)
            : await mediator.Send(new GetMyBookingsQuery(societyId, currentUser.UserId, pagination), ct);
        return result.ToActionResult();
    }

    [Function("CancelAmenityBooking")]
    public async Task<IActionResult> CancelAmenityBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/amenity-bookings/{id}/cancel")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var request = await req.DeserializeAsync<CancelBookingRequest>(ct) ?? new CancelBookingRequest(null);
        var result = await mediator.Send(new CancelBookingCommand(societyId, id, currentUser.UserId, request.Remarks), ct);
        return result.ToActionResult();
    }

    [Function("ApproveAmenityBooking")]
    public async Task<IActionResult> ApproveAmenityBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/amenity-bookings/{id}/approve")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ObjectResult(new { error = "Forbidden" }) { StatusCode = 403 };
        var request = await req.DeserializeAsync<ApproveRejectBookingRequest>(ct) ?? new ApproveRejectBookingRequest(null);
        var result = await mediator.Send(new ApproveBookingCommand(societyId, id, request.AdminNotes), ct);
        return result.ToActionResult();
    }

    [Function("RejectAmenityBooking")]
    public async Task<IActionResult> RejectAmenityBooking(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/amenity-bookings/{id}/reject")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ObjectResult(new { error = "Forbidden" }) { StatusCode = 403 };
        var request = await req.DeserializeAsync<ApproveRejectBookingRequest>(ct) ?? new ApproveRejectBookingRequest(null);
        var result = await mediator.Send(new RejectBookingCommand(societyId, id, request.AdminNotes), ct);
        return result.ToActionResult();
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
