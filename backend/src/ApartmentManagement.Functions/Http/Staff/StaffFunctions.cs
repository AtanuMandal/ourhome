using ApartmentManagement.Application.Commands.Staff;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Staff;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class StaffFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("CreateShift")]
    public async Task<IActionResult> CreateShift(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/shifts")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var request = await req.DeserializeAsync<CreateShiftRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new CreateShiftCommand(societyId, request.Name, request.StartTime, request.EndTime, request.GraceMinutes), ct);
        return result.ToActionResult(201);
    }

    [Function("ListShifts")]
    public async Task<IActionResult> ListShifts(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/shifts")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new GetShiftsQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("CreateStaff")]
    public async Task<IActionResult> CreateStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/staff")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var request = await req.DeserializeAsync<CreateStaffRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(new CreateStaffCommand(
            societyId, request.FullName, request.Phone, request.Category, request.EmploymentType,
            request.PhotoUrl, request.VendorId, request.ShiftId), ct);
        return result.ToActionResult(201);
    }

    [Function("UpdateStaff")]
    public async Task<IActionResult> UpdateStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/staff/{id}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var request = await req.DeserializeAsync<UpdateStaffRequest>(ct);
        if (request is null) return HttpHelpers.MissingBody();

        var result = await mediator.Send(
            new UpdateStaffCommand(societyId, id, request.FullName, request.Phone, request.PhotoUrl, request.ShiftId), ct);
        return result.ToActionResult();
    }

    [Function("DeactivateStaff")]
    public async Task<IActionResult> DeactivateStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/staff/{id}/deactivate")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var result = await mediator.Send(new DeactivateStaffCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("ListStaff")]
    public async Task<IActionResult> ListStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/staff")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        bool? activeOnly = bool.TryParse(req.Query["activeOnly"], out var parsedActiveOnly) ? parsedActiveOnly : null;

        var result = await mediator.Send(new GetStaffListQuery(
            societyId,
            EmptyToNull(req.Query["category"]),
            activeOnly,
            new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("GetStaff")]
    public async Task<IActionResult> GetStaff(
        // Constrained to :guid so the literal sibling route (on-duty) never binds here as "id".
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/staff/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new GetStaffQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("CheckInStaff")]
    public async Task<IActionResult> CheckInStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/staff/{id}/check-in")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new CheckInStaffCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("CheckOutStaff")]
    public async Task<IActionResult> CheckOutStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/staff/{id}/check-out")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new CheckOutStaffCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("GetOnDutyStaff")]
    public async Task<IActionResult> GetOnDutyStaff(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/staff/on-duty")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "SUSecurity")) return new ForbidResult();
        var result = await mediator.Send(new GetOnDutyStaffQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("GetStaffAttendanceHistory")]
    public async Task<IActionResult> GetStaffAttendanceHistory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/staff/{id}/attendance")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetStaffAttendanceHistoryQuery(
            societyId, id,
            ParseDate(req.Query["fromDate"]),
            ParseDate(req.Query["toDate"]),
            new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("GetStaffAttendanceReport")]
    public async Task<IActionResult> GetStaffAttendanceReport(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/staff/attendance/report")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();

        var fromDate = ParseDate(req.Query["fromDate"]) ?? DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(-1);
        var toDate = ParseDate(req.Query["toDate"]) ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var result = await mediator.Send(
            new GetStaffAttendanceReportQuery(societyId, EmptyToNull(req.Query["category"]), fromDate, toDate), ct);
        return result.ToActionResult();
    }

    private static DateOnly? ParseDate(string? value) =>
        DateOnly.TryParse(value, out var date) ? date : null;

    private static string? EmptyToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
