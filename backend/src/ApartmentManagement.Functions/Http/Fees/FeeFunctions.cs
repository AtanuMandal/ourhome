using ApartmentManagement.Application.Commands.Fee;
using ApartmentManagement.Application.Queries.Fee;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class FeeFunctions(ISender mediator)
{
    [Function("CreateFeeSchedule")]
    public async Task<IActionResult> CreateFeeSchedule(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/fee-schedules")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateFeeScheduleCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("ListFeeSchedules")]
    public async Task<IActionResult> ListFeeSchedules(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/fee-schedules")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var apartmentId = req.Query["apartmentId"].FirstOrDefault() ?? string.Empty;
        var result = await mediator.Send(new GetFeeSchedulesByApartmentQuery(societyId, apartmentId), ct);
        return result.ToActionResult();
    }

    [Function("GetPaymentHistory")]
    public async Task<IActionResult> GetPaymentHistory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/apartments/{apartmentId}/payments")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetFeeHistoryQuery(societyId, apartmentId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("MarkPaymentPaid")]
    public async Task<IActionResult> MarkPaymentPaid(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/payments/{id}/mark-paid")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<RecordFeePaymentCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId, PaymentId = id }, ct);
        return result.ToActionResult();
    }
}
