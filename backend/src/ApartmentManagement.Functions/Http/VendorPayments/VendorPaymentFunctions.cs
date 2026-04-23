using ApartmentManagement.Application.Commands.VendorPayments;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Queries.VendorPayments;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class VendorPaymentFunctions(ISender mediator)
{
    [Function("ListVendors")]
    public async Task<IActionResult> ListVendors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/vendor-payments/vendors")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        var search = req.Query["search"].FirstOrDefault();
        var result = await mediator.Send(new GetVendorsQuery(societyId, search), ct);
        return result.ToActionResult();
    }

    [Function("CreateVendor")]
    public async Task<IActionResult> CreateVendor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/vendors")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<CreateVendorRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(new CreateVendorCommand(
            societyId,
            body.Name,
            body.Street,
            body.City,
            body.State,
            body.PostalCode,
            body.Country,
            body.PictureUrl,
            body.ContactFirstName,
            body.ContactLastName,
            body.ContactPhone,
            body.ContactEmail,
            body.Overview,
            body.ValidUptoDate,
            body.PaymentDueDays,
            body.GeographicServiceArea,
            body.BusinessType,
            body.ContractUrl), ct);

        return result.ToActionResult(201);
    }

    [Function("UpdateVendor")]
    public async Task<IActionResult> UpdateVendor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/vendor-payments/vendors/{vendorId}")] HttpRequest req,
        string societyId,
        string vendorId,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<UpdateVendorRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(new UpdateVendorCommand(
            societyId,
            vendorId,
            body.Name,
            body.Street,
            body.City,
            body.State,
            body.PostalCode,
            body.Country,
            body.PictureUrl,
            body.ContactFirstName,
            body.ContactLastName,
            body.ContactPhone,
            body.ContactEmail,
            body.Overview,
            body.ValidUptoDate,
            body.PaymentDueDays,
            body.GeographicServiceArea,
            body.BusinessType,
            body.ContractUrl,
            body.IsActive), ct);

        return result.ToActionResult();
    }

    [Function("UploadVendorDocument")]
    public async Task<IActionResult> UploadVendorDocument(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/uploads/{documentType}")] HttpRequest req,
        string societyId,
        string documentType,
        CancellationToken ct)
    {
        var form = await req.ReadFormAsync(ct);
        var file = form.Files.GetFile("file");
        if (file is null)
            return new BadRequestObjectResult(new { error = "Upload a file using the 'file' form field." });

        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, ct);

        var result = await mediator.Send(
            new UploadVendorDocumentCommand(societyId, documentType, file.FileName, file.ContentType ?? "application/octet-stream", memory.ToArray()),
            ct);

        return result.ToActionResult(201);
    }

    [Function("CreateVendorRecurringSchedule")]
    public async Task<IActionResult> CreateVendorRecurringSchedule(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/schedules")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<CreateVendorRecurringScheduleRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new CreateVendorRecurringScheduleCommand(
                societyId,
                body.VendorId,
                body.Frequency,
                body.Amount,
                body.StartDate,
                body.EndDate,
                body.Label),
            ct);

        return result.ToActionResult(201);
    }

    [Function("UpdateVendorRecurringSchedule")]
    public async Task<IActionResult> UpdateVendorRecurringSchedule(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "societies/{societyId}/vendor-payments/schedules/{scheduleId}")] HttpRequest req,
        string societyId,
        string scheduleId,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<UpdateVendorRecurringScheduleRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new UpdateVendorRecurringScheduleCommand(societyId, scheduleId, body.EndDate, body.InactiveFromDate),
            ct);

        return result.ToActionResult();
    }

    [Function("ListVendorRecurringSchedules")]
    public async Task<IActionResult> ListVendorRecurringSchedules(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/vendor-payments/schedules")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        var vendorId = req.Query["vendorId"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(vendorId))
            return new BadRequestObjectResult(new { error = "vendorId is required." });

        var result = await mediator.Send(new GetVendorRecurringSchedulesQuery(societyId, vendorId), ct);
        return result.ToActionResult();
    }

    [Function("CreateVendorOneTimeCharge")]
    public async Task<IActionResult> CreateVendorOneTimeCharge(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/charges/one-time")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<CreateVendorOneTimeChargeRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new CreateVendorOneTimeChargeCommand(societyId, body.VendorId, body.Amount, body.EffectiveDate, body.Description),
            ct);

        return result.ToActionResult(201);
    }

    [Function("ListVendorCharges")]
    public async Task<IActionResult> ListVendorCharges(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/vendor-payments/charges")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        int.TryParse(req.Query["year"], out var year);
        int.TryParse(req.Query["month"], out var month);
        var vendorId = req.Query["vendorId"].FirstOrDefault();
        PaymentStatus? status = Enum.TryParse<PaymentStatus>(req.Query["status"], true, out var parsedStatus) ? parsedStatus : null;

        var result = await mediator.Send(
            new GetVendorChargesQuery(
                societyId,
                vendorId,
                year > 0 ? year : null,
                month > 0 ? month : null,
                status,
                new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 100 : pageSize }),
            ct);

        return result.ToActionResult();
    }

    [Function("MarkVendorChargePaid")]
    public async Task<IActionResult> MarkVendorChargePaid(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/charges/{chargeId}/mark-paid")] HttpRequest req,
        string societyId,
        string chargeId,
        CancellationToken ct)
    {
        var body = await req.DeserializeAsync<MarkVendorChargePaidRequest>(ct);
        if (body is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(
            new MarkVendorChargePaidCommand(
                societyId,
                chargeId,
                body.PaymentDate,
                body.PaymentMethod,
                body.TransactionReference,
                body.ReceiptUrl,
                body.Notes),
            ct);

        return result.ToActionResult();
    }

    [Function("InactivateVendorCharge")]
    public async Task<IActionResult> InactivateVendorCharge(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/charges/{chargeId}/inactivate")] HttpRequest req,
        string societyId,
        string chargeId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new InactivateVendorChargeCommand(societyId, chargeId), ct);
        return result.ToActionResult();
    }

    [Function("ActivateVendorCharge")]
    public async Task<IActionResult> ActivateVendorCharge(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/vendor-payments/charges/{chargeId}/activate")] HttpRequest req,
        string societyId,
        string chargeId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new ActivateVendorChargeCommand(societyId, chargeId), ct);
        return result.ToActionResult();
    }

    [Function("DeleteVendorCharge")]
    public async Task<IActionResult> DeleteVendorCharge(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "societies/{societyId}/vendor-payments/charges/{chargeId}")] HttpRequest req,
        string societyId,
        string chargeId,
        CancellationToken ct)
    {
        var result = await mediator.Send(new DeleteVendorChargeCommand(societyId, chargeId), ct);
        return result.ToActionResult();
    }

    [Function("GetVendorChargeGrid")]
    public async Task<IActionResult> GetVendorChargeGrid(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/vendor-payments/grid")] HttpRequest req,
        string societyId,
        CancellationToken ct)
    {
        int.TryParse(req.Query["year"], out var year);
        var effectiveYear = year > 0 ? year : DateTime.UtcNow.Year;
        var result = await mediator.Send(new GetVendorChargeGridQuery(societyId, effectiveYear), ct);
        return result.ToActionResult();
    }
}
