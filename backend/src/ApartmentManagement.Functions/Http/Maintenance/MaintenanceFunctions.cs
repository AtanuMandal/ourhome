using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Queries.Maintenance;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class MaintenanceFunctions(ISender mediator)
{
    [Function("CreateMaintenanceSchedule")]
    public async Task<IActionResult> CreateMaintenanceSchedule(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/maintenance/schedules")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<CreateMaintenanceScheduleRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new CreateMaintenanceScheduleCommand(
                societyId,
                body.Name,
                body.Description,
                body.ApartmentId,
                body.Rate,
                body.PricingType,
                body.AreaBasis,
                body.Frequency,
                body.DueDay),
            ct);
        return result.ToActionResult(201);
    }

    [Function("UpdateMaintenanceSchedule")]
    public async Task<IActionResult> UpdateMaintenanceSchedule(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/maintenance/schedules/{scheduleId}")] HttpRequest req,
        string societyId, string scheduleId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<UpdateMaintenanceScheduleRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new UpdateMaintenanceScheduleCommand(
                societyId,
                scheduleId,
                body.Name,
                body.Description,
                body.ApartmentId,
                body.Rate,
                body.PricingType,
                body.AreaBasis,
                body.Frequency,
                body.DueDay,
                body.IsActive,
                body.ChangeReason),
            ct);
        return result.ToActionResult();
    }

    [Function("ListMaintenanceSchedules")]
    public async Task<IActionResult> ListMaintenanceSchedules(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/maintenance/schedules")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var apartmentId = req.Query["apartmentId"].FirstOrDefault();
        var result = await mediator.Send(new GetMaintenanceSchedulesQuery(societyId, apartmentId), ct);
        return result.ToActionResult();
    }

    [Function("GetApartmentMaintenanceHistory")]
    public async Task<IActionResult> GetApartmentMaintenanceHistory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/apartments/{apartmentId}/maintenance/charges")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        int.TryParse(req.Query["year"], out var year);
        int.TryParse(req.Query["month"], out var month);

        var result = await mediator.Send(
            new GetApartmentMaintenanceHistoryQuery(
                societyId,
                apartmentId,
                year > 0 ? year : null,
                month > 0 ? month : null,
                new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }),
            ct);
        return result.ToActionResult();
    }

    [Function("ListMaintenanceCharges")]
    public async Task<IActionResult> ListMaintenanceCharges(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/maintenance/charges")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        int.TryParse(req.Query["year"], out var year);
        int.TryParse(req.Query["month"], out var month);
        var apartmentId = req.Query["apartmentId"].FirstOrDefault();
        PaymentStatus? status = Enum.TryParse<PaymentStatus>(req.Query["status"], true, out var parsedStatus) ? parsedStatus : null;

        var result = await mediator.Send(
            new GetMaintenanceChargesQuery(
                societyId,
                apartmentId,
                year > 0 ? year : null,
                month > 0 ? month : null,
                status,
                new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }),
            ct);
        return result.ToActionResult();
    }

    [Function("GetMaintenanceChargeGrid")]
    public async Task<IActionResult> GetMaintenanceChargeGrid(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/maintenance/grid")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["year"], out var year);
        var effectiveYear = year > 0 ? year : DateTime.UtcNow.Year;
        var result = await mediator.Send(new GetMaintenanceChargeGridQuery(societyId, effectiveYear), ct);
        return result.ToActionResult();
    }

    [Function("SubmitMaintenancePaymentProof")]
    public async Task<IActionResult> SubmitMaintenancePaymentProof(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/maintenance/payments/proof")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<SubmitMaintenancePaymentProofRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new SubmitMaintenancePaymentProofCommand(societyId, body.ChargeIds, body.ProofUrl, body.Notes),
            ct);
        return result.ToActionResult();
    }

    [Function("MarkMaintenanceChargePaid")]
    public async Task<IActionResult> MarkMaintenanceChargePaid(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/maintenance/charges/{chargeId}/mark-paid")] HttpRequest req,
        string societyId, string chargeId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<MarkMaintenanceChargePaidRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new MarkMaintenanceChargePaidCommand(societyId, chargeId, body.PaymentMethod, body.TransactionReference, body.ReceiptUrl, body.Notes),
            ct);
        return result.ToActionResult();
    }

    [Function("ApproveMaintenancePaymentProof")]
    public async Task<IActionResult> ApproveMaintenancePaymentProof(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/maintenance/charges/{chargeId}/approve")] HttpRequest req,
        string societyId, string chargeId, CancellationToken ct)
    {
        var body = await req.DeserializeAsync<MarkMaintenanceChargePaidRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new ApproveMaintenancePaymentProofCommand(societyId, chargeId, body.PaymentMethod, body.TransactionReference, body.ReceiptUrl, body.Notes),
            ct);
        return result.ToActionResult();
    }
}
