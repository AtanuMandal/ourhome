using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Commands.VendorPayments;

public record CreateVendorCommand(
    string SocietyId,
    string Name,
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    string? PictureUrl,
    string ContactFirstName,
    string ContactLastName,
    string ContactPhone,
    string ContactEmail,
    string Overview,
    DateTime ValidUptoDate,
    int PaymentDueDays,
    string? GeographicServiceArea,
    string? BusinessType,
    string? ContractUrl)
    : IRequest<Result<VendorDto>>;

public sealed class CreateVendorCommandHandler(
    IVendorRepository vendorRepository,
    ISocietyRepository societyRepository,
    ICurrentUserService currentUserService,
    ILogger<CreateVendorCommandHandler> logger)
    : IRequestHandler<CreateVendorCommand, Result<VendorDto>>
{
    public async Task<Result<VendorDto>> Handle(CreateVendorCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            await VendorPaymentsLookup.EnsureSocietyExistsAsync(societyRepository, request.SocietyId, ct);

            var vendor = Vendor.Create(
                request.SocietyId,
                request.Name,
                new Address(request.Street, request.City, request.State, request.PostalCode, request.Country),
                request.PictureUrl,
                request.ContactFirstName,
                request.ContactLastName,
                request.ContactPhone,
                request.ContactEmail,
                request.Overview,
                request.ValidUptoDate,
                request.PaymentDueDays,
                request.GeographicServiceArea,
                request.BusinessType,
                request.ContractUrl);

            var created = await vendorRepository.CreateAsync(vendor, ct);
            return Result<VendorDto>.Success(created.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VendorDto>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<VendorDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create vendor {VendorName}", request.Name);
            return Result<VendorDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UpdateVendorCommand(
    string SocietyId,
    string VendorId,
    string Name,
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    string? PictureUrl,
    string ContactFirstName,
    string ContactLastName,
    string ContactPhone,
    string ContactEmail,
    string Overview,
    DateTime ValidUptoDate,
    int PaymentDueDays,
    string? GeographicServiceArea,
    string? BusinessType,
    string? ContractUrl,
    bool IsActive)
    : IRequest<Result<VendorDto>>;

public sealed class UpdateVendorCommandHandler(
    IVendorRepository vendorRepository,
    IVendorRecurringScheduleRepository scheduleRepository,
    ICurrentUserService currentUserService,
    ILogger<UpdateVendorCommandHandler> logger)
    : IRequestHandler<UpdateVendorCommand, Result<VendorDto>>
{
    public async Task<Result<VendorDto>> Handle(UpdateVendorCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var vendor = await vendorRepository.GetByIdAsync(request.VendorId, request.SocietyId, ct)
                ?? throw new NotFoundException("Vendor", request.VendorId);

            var updatedValidUptoDate = Vendor.NormalizeUtcDate(request.ValidUptoDate, nameof(request.ValidUptoDate));
            var schedules = await scheduleRepository.GetByVendorAsync(request.SocietyId, request.VendorId, ct);
            if (schedules.Any(schedule => schedule.EndDate.HasValue && schedule.EndDate.Value.Date > updatedValidUptoDate.Date))
                return Result<VendorDto>.Failure(ErrorCodes.Conflict, "Vendor validity cannot be earlier than an existing schedule end date.");

            vendor.Update(
                request.Name,
                new Address(request.Street, request.City, request.State, request.PostalCode, request.Country),
                request.PictureUrl,
                request.ContactFirstName,
                request.ContactLastName,
                request.ContactPhone,
                request.ContactEmail,
                request.Overview,
                updatedValidUptoDate,
                request.PaymentDueDays,
                request.GeographicServiceArea,
                request.BusinessType,
                request.ContractUrl,
                request.IsActive);

            var saved = await vendorRepository.UpdateAsync(vendor, ct);
            return Result<VendorDto>.Success(saved.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VendorDto>.Failure(ErrorCodes.VendorNotFound, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<VendorDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update vendor {VendorId}", request.VendorId);
            return Result<VendorDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UploadVendorDocumentCommand(
    string SocietyId,
    string DocumentType,
    string FileName,
    string ContentType,
    byte[] Content)
    : IRequest<Result<VendorDocumentUploadResponse>>;

public sealed class UploadVendorDocumentCommandHandler(
    IFileStorageService fileStorageService,
    ICurrentUserService currentUserService,
    ILogger<UploadVendorDocumentCommandHandler> logger)
    : IRequestHandler<UploadVendorDocumentCommand, Result<VendorDocumentUploadResponse>>
{
    private const string ContainerName = "vendor-payments";

    public async Task<Result<VendorDocumentUploadResponse>> Handle(UploadVendorDocumentCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var extension = Path.GetExtension(request.FileName);
            var safeCategory = request.DocumentType.Trim().ToLowerInvariant();
            var blobName = $"{request.SocietyId}/{safeCategory}/{Guid.NewGuid():N}{extension}";

            await using var stream = new MemoryStream(request.Content, writable: false);
            var fileUrl = await fileStorageService.UploadAsync(stream, blobName, request.ContentType, ContainerName, ct);

            return Result<VendorDocumentUploadResponse>.Success(new VendorDocumentUploadResponse(request.FileName, fileUrl));
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorDocumentUploadResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload vendor document {FileName}", request.FileName);
            return Result<VendorDocumentUploadResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CreateVendorRecurringScheduleCommand(
    string SocietyId,
    string VendorId,
    VendorPaymentFrequency Frequency,
    decimal Amount,
    DateTime StartDate,
    DateTime? EndDate,
    string? Label)
    : IRequest<Result<VendorRecurringScheduleDto>>;

public sealed class CreateVendorRecurringScheduleCommandHandler(
    IVendorRepository vendorRepository,
    IVendorRecurringScheduleRepository scheduleRepository,
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<CreateVendorRecurringScheduleCommandHandler> logger)
    : IRequestHandler<CreateVendorRecurringScheduleCommand, Result<VendorRecurringScheduleDto>>
{
    public async Task<Result<VendorRecurringScheduleDto>> Handle(CreateVendorRecurringScheduleCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var vendor = await vendorRepository.GetByIdAsync(request.VendorId, request.SocietyId, ct)
                ?? throw new NotFoundException("Vendor", request.VendorId);

            var normalizedStartDate = Vendor.NormalizeUtcMonthStart(request.StartDate, nameof(request.StartDate));
            DateTime? normalizedEndDate = request.EndDate is null
                ? null
                : Vendor.NormalizeUtcMonthEnd(request.EndDate.Value, nameof(request.EndDate));

            VendorPaymentsAuthorization.EnsureVendorActive(vendor);
            VendorPaymentsAuthorization.EnsureDateWithinVendorWindow(normalizedEndDate ?? normalizedStartDate, vendor);

            var schedule = VendorRecurringSchedule.Create(
                request.SocietyId,
                request.VendorId,
                request.Frequency,
                request.Amount,
                normalizedStartDate,
                normalizedEndDate,
                request.Label);

            var created = await scheduleRepository.CreateAsync(schedule, ct);
            await VendorChargeGenerator.SyncFutureChargesAsync(created, vendor, chargeRepository, VendorChargeGenerator.DefaultHorizon(vendor), ct);

            return Result<VendorRecurringScheduleDto>.Success(created.ToResponse(vendor.Name));
        }
        catch (NotFoundException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.VendorNotFound, ex.Message);
        }
        catch (ValidationException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create recurring vendor schedule for vendor {VendorId}", request.VendorId);
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UpdateVendorRecurringScheduleCommand(
    string SocietyId,
    string ScheduleId,
    DateTime? EndDate,
    DateTime? InactiveFromDate)
    : IRequest<Result<VendorRecurringScheduleDto>>;

public sealed class UpdateVendorRecurringScheduleCommandHandler(
    IVendorRecurringScheduleRepository scheduleRepository,
    IVendorRepository vendorRepository,
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<UpdateVendorRecurringScheduleCommandHandler> logger)
    : IRequestHandler<UpdateVendorRecurringScheduleCommand, Result<VendorRecurringScheduleDto>>
{
    public async Task<Result<VendorRecurringScheduleDto>> Handle(UpdateVendorRecurringScheduleCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var schedule = await scheduleRepository.GetByIdAsync(request.ScheduleId, request.SocietyId, ct)
                ?? throw new NotFoundException("VendorRecurringSchedule", request.ScheduleId);
            var vendor = await vendorRepository.GetByIdAsync(schedule.VendorId, request.SocietyId, ct)
                ?? throw new NotFoundException("Vendor", schedule.VendorId);

            if (!request.EndDate.HasValue && !request.InactiveFromDate.HasValue)
                return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.ValidationFailed, "Either schedule end date or inactive-from date is required.");

            DateTime? normalizedEndDate = request.EndDate.HasValue
                ? Vendor.NormalizeUtcMonthEnd(request.EndDate.Value, nameof(request.EndDate))
                : null;
            DateTime? normalizedInactiveFromDate = request.InactiveFromDate.HasValue
                ? Vendor.NormalizeUtcMonthStart(request.InactiveFromDate.Value, nameof(request.InactiveFromDate))
                : null;

            if (normalizedEndDate.HasValue)
                VendorPaymentsAuthorization.EnsureDateWithinVendorWindow(normalizedEndDate.Value, vendor);
            if (normalizedInactiveFromDate.HasValue)
                VendorPaymentsAuthorization.EnsureDateWithinVendorWindow(normalizedInactiveFromDate.Value, vendor);

            schedule.UpdateWindow(normalizedEndDate, normalizedInactiveFromDate);
            var updated = await scheduleRepository.UpdateAsync(schedule, ct);
            await VendorChargeGenerator.SyncFutureChargesAsync(updated, vendor, chargeRepository, VendorChargeGenerator.DefaultHorizon(vendor), ct);

            return Result<VendorRecurringScheduleDto>.Success(updated.ToResponse(vendor.Name));
        }
        catch (NotFoundException ex)
        {
            var errorCode = ex.Message.Contains("VendorRecurringSchedule", StringComparison.OrdinalIgnoreCase)
                ? ErrorCodes.VendorScheduleNotFound
                : ErrorCodes.VendorNotFound;
            return Result<VendorRecurringScheduleDto>.Failure(errorCode, ex.Message);
        }
        catch (ValidationException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update recurring vendor schedule {ScheduleId}", request.ScheduleId);
            return Result<VendorRecurringScheduleDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CreateVendorOneTimeChargeCommand(
    string SocietyId,
    string VendorId,
    decimal Amount,
    DateTime EffectiveDate,
    string? Description)
    : IRequest<Result<VendorChargeDto>>;

public sealed class CreateVendorOneTimeChargeCommandHandler(
    IVendorRepository vendorRepository,
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<CreateVendorOneTimeChargeCommandHandler> logger)
    : IRequestHandler<CreateVendorOneTimeChargeCommand, Result<VendorChargeDto>>
{
    public async Task<Result<VendorChargeDto>> Handle(CreateVendorOneTimeChargeCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var vendor = await vendorRepository.GetByIdAsync(request.VendorId, request.SocietyId, ct)
                ?? throw new NotFoundException("Vendor", request.VendorId);

            var normalizedEffectiveDate = Vendor.NormalizeUtcMonthStart(request.EffectiveDate, nameof(request.EffectiveDate));
            VendorPaymentsAuthorization.EnsureVendorActive(vendor);
            VendorPaymentsAuthorization.EnsureDateWithinVendorWindow(normalizedEffectiveDate, vendor);

            var charge = VendorCharge.CreateAdHoc(
                request.SocietyId,
                request.VendorId,
                vendor.Name,
                request.Amount,
                normalizedEffectiveDate,
                vendor.PaymentDueDays,
                request.Description);

            var created = await chargeRepository.CreateAsync(charge, ct);
            return Result<VendorChargeDto>.Success(created.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.VendorNotFound, ex.Message);
        }
        catch (ValidationException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create one-time vendor charge for vendor {VendorId}", request.VendorId);
            return Result<VendorChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record MarkVendorChargePaidCommand(
    string SocietyId,
    string ChargeId,
    DateTime PaymentDate,
    string PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes)
    : IRequest<Result<VendorChargeDto>>;

public record InactivateVendorChargeCommand(
    string SocietyId,
    string ChargeId)
    : IRequest<Result<VendorChargeDto>>;

public record ActivateVendorChargeCommand(
    string SocietyId,
    string ChargeId)
    : IRequest<Result<VendorChargeDto>>;

public record DeleteVendorChargeCommand(
    string SocietyId,
    string ChargeId)
    : IRequest<Result<bool>>;

public sealed class MarkVendorChargePaidCommandHandler(
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<MarkVendorChargePaidCommandHandler> logger)
    : IRequestHandler<MarkVendorChargePaidCommand, Result<VendorChargeDto>>
{
    public async Task<Result<VendorChargeDto>> Handle(MarkVendorChargePaidCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var charge = await chargeRepository.GetByIdAsync(request.ChargeId, request.SocietyId, ct)
                ?? throw new NotFoundException("VendorCharge", request.ChargeId);

            charge.MarkPaid(request.PaymentDate, request.PaymentMethod, request.TransactionReference, request.ReceiptUrl, request.Notes);
            var updated = await chargeRepository.UpdateAsync(charge, ct);
            return Result<VendorChargeDto>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.VendorChargeNotFound, ex.Message);
        }
        catch (ValidationException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to mark vendor charge {ChargeId} paid", request.ChargeId);
            return Result<VendorChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public sealed class InactivateVendorChargeCommandHandler(
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<InactivateVendorChargeCommandHandler> logger)
    : IRequestHandler<InactivateVendorChargeCommand, Result<VendorChargeDto>>
{
    public async Task<Result<VendorChargeDto>> Handle(InactivateVendorChargeCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var charge = await chargeRepository.GetByIdAsync(request.ChargeId, request.SocietyId, ct)
                ?? throw new NotFoundException("VendorCharge", request.ChargeId);

            charge.Inactivate();
            var updated = await chargeRepository.UpdateAsync(charge, ct);
            return Result<VendorChargeDto>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.VendorChargeNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to inactivate vendor charge {ChargeId}", request.ChargeId);
            return Result<VendorChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public sealed class ActivateVendorChargeCommandHandler(
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<ActivateVendorChargeCommandHandler> logger)
    : IRequestHandler<ActivateVendorChargeCommand, Result<VendorChargeDto>>
{
    public async Task<Result<VendorChargeDto>> Handle(ActivateVendorChargeCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var charge = await chargeRepository.GetByIdAsync(request.ChargeId, request.SocietyId, ct)
                ?? throw new NotFoundException("VendorCharge", request.ChargeId);

            charge.Activate();
            var updated = await chargeRepository.UpdateAsync(charge, ct);
            return Result<VendorChargeDto>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.VendorChargeNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to activate vendor charge {ChargeId}", request.ChargeId);
            return Result<VendorChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public sealed class DeleteVendorChargeCommandHandler(
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<DeleteVendorChargeCommandHandler> logger)
    : IRequestHandler<DeleteVendorChargeCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteVendorChargeCommand request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var charge = await chargeRepository.GetByIdAsync(request.ChargeId, request.SocietyId, ct)
                ?? throw new NotFoundException("VendorCharge", request.ChargeId);

            charge.SoftDelete();
            await chargeRepository.UpdateAsync(charge, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.VendorChargeNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete vendor charge {ChargeId}", request.ChargeId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GenerateDueVendorChargesCommand(DateTime? AsOfUtc = null) : IRequest<Result<int>>;

public sealed class GenerateDueVendorChargesCommandHandler(
    IVendorRecurringScheduleRepository scheduleRepository,
    IVendorRepository vendorRepository,
    IVendorChargeRepository chargeRepository,
    ILogger<GenerateDueVendorChargesCommandHandler> logger)
    : IRequestHandler<GenerateDueVendorChargesCommand, Result<int>>
{
    public async Task<Result<int>> Handle(GenerateDueVendorChargesCommand request, CancellationToken ct)
    {
        try
        {
            var asOf = (request.AsOfUtc ?? DateTime.UtcNow).Date;
            var schedules = await scheduleRepository.GetActiveDueOnAsync(asOf, ct);
            var count = 0;

            foreach (var schedule in schedules)
            {
                var vendor = await vendorRepository.GetByIdAsync(schedule.VendorId, schedule.SocietyId, ct);
                if (vendor is null)
                    continue;

                while (schedule.AppliesTo(schedule.NextChargeDate) && schedule.NextChargeDate.Date <= asOf)
                {
                    count += await VendorChargeGenerator.UpsertRecurringChargeAsync(schedule, vendor, schedule.NextChargeDate, chargeRepository, ct);
                    schedule.AdvanceNextChargeDate();
                }

                await scheduleRepository.UpdateAsync(schedule, ct);
            }

            return Result<int>.Success(count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate due vendor charges.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record NotifyOverdueVendorChargesCommand(DateTime? AsOfUtc = null) : IRequest<Result<int>>;

public sealed class NotifyOverdueVendorChargesCommandHandler(
    IVendorChargeRepository chargeRepository,
    ISocietyRepository societyRepository,
    INotificationService notificationService,
    ILogger<NotifyOverdueVendorChargesCommandHandler> logger)
    : IRequestHandler<NotifyOverdueVendorChargesCommand, Result<int>>
{
    public async Task<Result<int>> Handle(NotifyOverdueVendorChargesCommand request, CancellationToken ct)
    {
        try
        {
            var overdueCharges = await chargeRepository.GetOverduePendingAcrossSocietiesAsync(request.AsOfUtc ?? DateTime.UtcNow, ct);
            var notified = 0;

            foreach (var societyGroup in overdueCharges.GroupBy(charge => charge.SocietyId, StringComparer.OrdinalIgnoreCase))
            {
                var society = await societyRepository.GetByIdAsync(societyGroup.Key, societyGroup.Key, ct);
                if (society is null)
                    continue;

                foreach (var charge in societyGroup)
                {
                    foreach (var adminUserId in society.AdminUserIds.Distinct(StringComparer.OrdinalIgnoreCase))
                    {
                        await notificationService.SendPushNotificationAsync(
                            adminUserId,
                            "Vendor payment overdue",
                            $"{charge.VendorName} has an unpaid vendor charge due on {charge.DueDate:dd MMM yyyy}.",
                            ct);
                    }

                    charge.MarkOverdueNotificationSent();
                    await chargeRepository.UpdateAsync(charge, ct);
                    notified++;
                }
            }

            return Result<int>.Success(notified);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to notify overdue vendor charges.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

internal static class VendorChargeGenerator
{
    public static DateTime DefaultHorizon(Vendor vendor)
    {
        var rollingHorizon = DateTime.UtcNow.Date.AddMonths(12);
        return vendor.ValidUptoDate.Date < rollingHorizon ? vendor.ValidUptoDate.Date : rollingHorizon;
    }

    public static async Task<int> SyncFutureChargesAsync(
        VendorRecurringSchedule schedule,
        Vendor vendor,
        IVendorChargeRepository chargeRepository,
        DateTime horizonUtc,
        CancellationToken ct)
    {
        var desiredEffectiveDates = new HashSet<DateTime>();
        var count = 0;

        foreach (var effectiveDate in EnumerateEffectiveDates(schedule, horizonUtc))
        {
            desiredEffectiveDates.Add(effectiveDate.Date);
            count += await UpsertRecurringChargeAsync(schedule, vendor, effectiveDate, chargeRepository, ct);
        }

        var existingCharges = await chargeRepository.GetByScheduleAsync(schedule.SocietyId, schedule.Id, ct);
        foreach (var charge in existingCharges.Where(charge =>
                     !charge.IsDeleted &&
                     charge.Status != PaymentStatus.Paid &&
                     charge.EffectiveDate.Date >= schedule.NextChargeDate.Date))
        {
            if (desiredEffectiveDates.Contains(charge.EffectiveDate.Date))
            {
                if (!charge.IsActive)
                {
                    charge.Activate();
                    await chargeRepository.UpdateAsync(charge, ct);
                }

                continue;
            }

            if (charge.IsActive)
            {
                charge.Inactivate();
                await chargeRepository.UpdateAsync(charge, ct);
            }
        }

        return count;
    }

    public static async Task<int> UpsertRecurringChargeAsync(
        VendorRecurringSchedule schedule,
        Vendor vendor,
        DateTime effectiveDate,
        IVendorChargeRepository chargeRepository,
        CancellationToken ct)
    {
        var existing = await chargeRepository.GetByScheduleAndEffectiveDateAsync(schedule.SocietyId, schedule.Id, effectiveDate, ct);
        if (existing is null)
        {
            await chargeRepository.CreateAsync(
                VendorCharge.CreateRecurring(
                    schedule.SocietyId,
                    vendor.Id,
                    vendor.Name,
                    schedule.Id,
                    schedule.Amount,
                    effectiveDate,
                    vendor.PaymentDueDays,
                    schedule.Label),
                ct);
            return 1;
        }

        if (existing.IsDeleted)
            return 0;

        existing.RefreshRecurringCharge(vendor.Name, schedule.Amount, effectiveDate, vendor.PaymentDueDays, schedule.Label);
        await chargeRepository.UpdateAsync(existing, ct);
        return 1;
    }

    private static IEnumerable<DateTime> EnumerateEffectiveDates(VendorRecurringSchedule schedule, DateTime horizonUtc)
    {
        var effectiveDate = schedule.NextChargeDate.Date;
        while (effectiveDate <= horizonUtc.Date)
        {
            if (!schedule.AppliesTo(effectiveDate))
                yield break;

            yield return effectiveDate;
            effectiveDate = schedule.AdvanceDate(effectiveDate).Date;
        }
    }
}
