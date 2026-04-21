using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Commands.Maintenance;

public record CreateMaintenanceScheduleCommand(
    string SocietyId,
    string Name,
    string? Description,
    string? ApartmentId,
    decimal Rate,
    MaintenancePricingType PricingType,
    MaintenanceAreaBasis? AreaBasis,
    FeeFrequency Frequency,
    int DueDay,
    int StartMonth,
    int StartYear)
    : IRequest<Result<MaintenanceScheduleDto>>;

public sealed class CreateMaintenanceScheduleCommandHandler(
    IMaintenanceScheduleRepository scheduleRepository,
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ICurrentUserService currentUserService,
    ILogger<CreateMaintenanceScheduleCommandHandler> logger)
    : IRequestHandler<CreateMaintenanceScheduleCommand, Result<MaintenanceScheduleDto>>
{
    public async Task<Result<MaintenanceScheduleDto>> Handle(CreateMaintenanceScheduleCommand request, CancellationToken ct)
    {
        try
        {
            MaintenanceAuthorization.EnsureAdmin(currentUserService);

            var newActiveFromDate = new DateTime(request.StartYear, request.StartMonth, request.DueDay, 0, 0, 0, DateTimeKind.Utc);
            var allSchedules = await scheduleRepository.GetAllAsync(request.SocietyId, ct);
            if (allSchedules.Any(schedule => MaintenanceScheduleWindowHelper.ScheduleWindowsOverlap(schedule.ActiveFromDate, schedule.InactiveFromDate, newActiveFromDate, null)))
                return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.Conflict, "Another maintenance schedule is already active during the selected period.");

            var schedule = MaintenanceSchedule.Create(
                request.SocietyId,
                request.ApartmentId,
                request.Name,
                request.Description,
                request.Rate,
                request.PricingType,
                request.AreaBasis,
                request.Frequency,
                request.DueDay,
                request.StartMonth,
                request.StartYear);

            var created = await scheduleRepository.CreateAsync(schedule, ct);
            await MaintenanceChargeGenerator.EnsureUpcomingChargesAsync(created, created.ActiveFromDate.Date.AddMonths(5), apartmentRepository, chargeRepository, ct);

            return Result<MaintenanceScheduleDto>.Success(created.ToResponse());
        }
        catch (ForbiddenException ex)
        {
            return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create maintenance schedule for society {SocietyId}", request.SocietyId);
            return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UpdateMaintenanceScheduleCommand(
    string SocietyId,
    string ScheduleId,
    bool IsActive,
    int EffectiveMonth,
    int EffectiveYear,
    string ChangeReason)
    : IRequest<Result<MaintenanceScheduleDto>>;

public sealed class UpdateMaintenanceScheduleCommandHandler(
    IMaintenanceScheduleRepository scheduleRepository,
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUserService,
    ILogger<UpdateMaintenanceScheduleCommandHandler> logger)
    : IRequestHandler<UpdateMaintenanceScheduleCommand, Result<MaintenanceScheduleDto>>
{
    public async Task<Result<MaintenanceScheduleDto>> Handle(UpdateMaintenanceScheduleCommand request, CancellationToken ct)
    {
        try
        {
            MaintenanceAuthorization.EnsureAdmin(currentUserService);

            var schedule = await scheduleRepository.GetByIdAsync(request.ScheduleId, request.SocietyId, ct)
                ?? throw new NotFoundException("MaintenanceSchedule", request.ScheduleId);

            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct);
            var actorName = actor?.FullName ?? currentUserService.UserId;
            var effectiveDueDate = new DateTime(request.EffectiveYear, request.EffectiveMonth, schedule.DueDay, 0, 0, 0, DateTimeKind.Utc);

            if (request.IsActive)
            {
                var allSchedules = await scheduleRepository.GetAllAsync(request.SocietyId, ct);
                if (allSchedules.Any(existingSchedule =>
                        !string.Equals(existingSchedule.Id, schedule.Id, StringComparison.OrdinalIgnoreCase) &&
                        MaintenanceScheduleWindowHelper.ScheduleWindowsOverlap(existingSchedule.ActiveFromDate, existingSchedule.InactiveFromDate, effectiveDueDate, null)))
                {
                    return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.Conflict, "Another maintenance schedule is already active during the selected period.");
                }
            }

            schedule.UpdateStatus(
                request.IsActive,
                request.EffectiveMonth,
                request.EffectiveYear,
                currentUserService.UserId,
                actorName,
                request.ChangeReason);

            var updated = await scheduleRepository.UpdateAsync(schedule, ct);
            var horizon = updated.NextDueDate.Date.AddMonths(5);
            await MaintenanceChargeGenerator.EnsureUpcomingChargesAsync(updated, horizon, apartmentRepository, chargeRepository, ct);

            return Result<MaintenanceScheduleDto>.Success(updated.ToResponse());
        }
        catch (ForbiddenException ex)
        {
            return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.FeeScheduleNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update maintenance schedule {ScheduleId}", request.ScheduleId);
            return Result<MaintenanceScheduleDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record DeleteMaintenanceScheduleCommand(
    string SocietyId,
    string ScheduleId,
    string ChangeReason)
    : IRequest<Result<bool>>;

public sealed class DeleteMaintenanceScheduleCommandHandler(
    IMaintenanceScheduleRepository scheduleRepository,
    IMaintenanceChargeRepository chargeRepository,
    ICurrentUserService currentUserService,
    ILogger<DeleteMaintenanceScheduleCommandHandler> logger)
    : IRequestHandler<DeleteMaintenanceScheduleCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteMaintenanceScheduleCommand request, CancellationToken ct)
    {
        try
        {
            MaintenanceAuthorization.EnsureAdmin(currentUserService);

            var schedule = await scheduleRepository.GetByIdAsync(request.ScheduleId, request.SocietyId, ct)
                ?? throw new NotFoundException("MaintenanceSchedule", request.ScheduleId);

            if (schedule.IsActive)
                return Result<bool>.Failure(ErrorCodes.Conflict, "Only inactive maintenance schedules can be deleted.");

            var now = DateTime.UtcNow.Date;
            var allSchedules = await scheduleRepository.GetAllAsync(request.SocietyId, ct);
            if (!allSchedules.Any(otherSchedule =>
                    !string.Equals(otherSchedule.Id, schedule.Id, StringComparison.OrdinalIgnoreCase) &&
                    (otherSchedule.IsActive || otherSchedule.IsEffectiveOn(now))))
            {
                return Result<bool>.Failure(ErrorCodes.Conflict, "An inactive schedule can be deleted only when another active schedule exists for the society.");
            }

            var charges = await chargeRepository.GetByScheduleAsync(request.SocietyId, request.ScheduleId, ct);
            var cutoffDate = DateTime.UtcNow.Date;
            foreach (var charge in charges.Where(charge =>
                         charge.DueDate.Date >= cutoffDate &&
                         charge.Status != PaymentStatus.Paid))
            {
                await chargeRepository.DeleteAsync(charge.Id, charge.SocietyId, ct);
            }

            await scheduleRepository.DeleteAsync(schedule.Id, request.SocietyId, ct);
            return Result<bool>.Success(true);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.FeeScheduleNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete maintenance schedule {ScheduleId}", request.ScheduleId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record SubmitMaintenancePaymentProofCommand(
    string SocietyId,
    IReadOnlyList<string> ChargeIds,
    string ProofUrl,
    string? Notes)
    : IRequest<Result<IReadOnlyList<MaintenanceChargeDto>>>;

public sealed class SubmitMaintenancePaymentProofCommandHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ICurrentUserService currentUserService,
    ILogger<SubmitMaintenancePaymentProofCommandHandler> logger)
    : IRequestHandler<SubmitMaintenancePaymentProofCommand, Result<IReadOnlyList<MaintenanceChargeDto>>>
{
    public async Task<Result<IReadOnlyList<MaintenanceChargeDto>>> Handle(SubmitMaintenancePaymentProofCommand request, CancellationToken ct)
    {
        try
        {
            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct)
                ?? throw new ForbiddenException("Only residents or admins can submit payment proof.");

            var isAdmin = currentUserService.IsInRoles("SUAdmin", "HQAdmin");
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var updated = new List<MaintenanceChargeDto>(request.ChargeIds.Count);
            foreach (var chargeId in request.ChargeIds.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                var charge = await chargeRepository.GetByIdAsync(chargeId, request.SocietyId, ct)
                    ?? throw new NotFoundException("MaintenanceCharge", chargeId);

                if (!isAdmin && actor.ApartmentId != charge.ApartmentId)
                    throw new ForbiddenException("Residents can only submit proof for their own apartment charges.");

                charge.SubmitProof(request.ProofUrl, request.Notes, actor.Id);
                var saved = await chargeRepository.UpdateAsync(charge, ct);
                var apartment = await apartmentRepository.GetByIdAsync(saved.ApartmentId, request.SocietyId, ct);
                updated.Add(saved.ToResponse(apartment?.ToDisplayLabel() ?? saved.ApartmentId, society.MaintenanceOverdueThresholdDays));
            }

            foreach (var adminUserId in society.AdminUserIds.Distinct(StringComparer.OrdinalIgnoreCase))
                await notificationService.SendPushNotificationAsync(adminUserId, "Maintenance payment proof submitted", "A resident uploaded maintenance payment proof for approval.", ct);

            return Result<IReadOnlyList<MaintenanceChargeDto>>.Success(updated);
        }
        catch (ForbiddenException ex)
        {
            return Result<IReadOnlyList<MaintenanceChargeDto>>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<IReadOnlyList<MaintenanceChargeDto>>.Failure(ErrorCodes.PaymentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to submit maintenance proof for society {SocietyId}", request.SocietyId);
            return Result<IReadOnlyList<MaintenanceChargeDto>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record MarkMaintenanceChargePaidCommand(
    string SocietyId,
    string ChargeId,
    string PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes)
    : IRequest<Result<MaintenanceChargeDto>>;

public sealed class MarkMaintenanceChargePaidCommandHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository,
    IEventPublisher eventPublisher,
    ICurrentUserService currentUserService,
    ILogger<MarkMaintenanceChargePaidCommandHandler> logger)
    : IRequestHandler<MarkMaintenanceChargePaidCommand, Result<MaintenanceChargeDto>>
{
    public async Task<Result<MaintenanceChargeDto>> Handle(MarkMaintenanceChargePaidCommand request, CancellationToken ct)
    {
        try
        {
            MaintenanceAuthorization.EnsureAdmin(currentUserService);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);
            var charge = await chargeRepository.GetByIdAsync(request.ChargeId, request.SocietyId, ct)
                ?? throw new NotFoundException("MaintenanceCharge", request.ChargeId);

            charge.MarkPaid(request.PaymentMethod, request.TransactionReference, request.ReceiptUrl, request.Notes);
            var updated = await chargeRepository.UpdateAsync(charge, ct);

            foreach (var evt in updated.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            updated.ClearDomainEvents();

            var apartment = await apartmentRepository.GetByIdAsync(updated.ApartmentId, request.SocietyId, ct);
            return Result<MaintenanceChargeDto>.Success(updated.ToResponse(apartment?.ToDisplayLabel() ?? updated.ApartmentId, society.MaintenanceOverdueThresholdDays));
        }
        catch (ForbiddenException ex)
        {
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.PaymentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to mark maintenance charge {ChargeId} paid", request.ChargeId);
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record ApproveMaintenancePaymentProofCommand(
    string SocietyId,
    string ChargeId,
    string PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes)
    : IRequest<Result<MaintenanceChargeDto>>;

public sealed class ApproveMaintenancePaymentProofCommandHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository,
    IEventPublisher eventPublisher,
    ICurrentUserService currentUserService,
    ILogger<ApproveMaintenancePaymentProofCommandHandler> logger)
    : IRequestHandler<ApproveMaintenancePaymentProofCommand, Result<MaintenanceChargeDto>>
{
    public async Task<Result<MaintenanceChargeDto>> Handle(ApproveMaintenancePaymentProofCommand request, CancellationToken ct)
    {
        try
        {
            MaintenanceAuthorization.EnsureAdmin(currentUserService);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);
            var charge = await chargeRepository.GetByIdAsync(request.ChargeId, request.SocietyId, ct)
                ?? throw new NotFoundException("MaintenanceCharge", request.ChargeId);

            charge.ApprovePayment(request.PaymentMethod, request.TransactionReference, request.ReceiptUrl, request.Notes);
            var updated = await chargeRepository.UpdateAsync(charge, ct);

            foreach (var evt in updated.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            updated.ClearDomainEvents();

            var apartment = await apartmentRepository.GetByIdAsync(updated.ApartmentId, request.SocietyId, ct);
            return Result<MaintenanceChargeDto>.Success(updated.ToResponse(apartment?.ToDisplayLabel() ?? updated.ApartmentId, society.MaintenanceOverdueThresholdDays));
        }
        catch (ForbiddenException ex)
        {
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.PaymentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to approve maintenance payment proof for charge {ChargeId}", request.ChargeId);
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CreateMaintenancePenaltyChargeCommand(
    string SocietyId,
    string ApartmentId,
    decimal Amount,
    DateTime DueDate,
    string Reason)
    : IRequest<Result<MaintenanceChargeDto>>;

public sealed class CreateMaintenancePenaltyChargeCommandHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository,
    ICurrentUserService currentUserService,
    ILogger<CreateMaintenancePenaltyChargeCommandHandler> logger)
    : IRequestHandler<CreateMaintenancePenaltyChargeCommand, Result<MaintenanceChargeDto>>
{
    public async Task<Result<MaintenanceChargeDto>> Handle(CreateMaintenancePenaltyChargeCommand request, CancellationToken ct)
    {
        try
        {
            MaintenanceAuthorization.EnsureAdmin(currentUserService);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);

            var charge = MaintenanceCharge.Create(
                request.SocietyId,
                apartment.Id,
                $"penalty-{Guid.NewGuid():N}",
                "Late payment penalty",
                request.Amount,
                NormalizeDueDate(request.DueDate),
                request.Reason);

            var created = await chargeRepository.CreateAsync(charge, ct);
            return Result<MaintenanceChargeDto>.Success(created.ToResponse(apartment.ToDisplayLabel(), society.MaintenanceOverdueThresholdDays));
        }
        catch (ForbiddenException ex)
        {
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.PaymentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create maintenance penalty for apartment {ApartmentId}", request.ApartmentId);
            return Result<MaintenanceChargeDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private static DateTime NormalizeDueDate(DateTime dueDate)
    {
        var date = dueDate.Date;
        return DateTime.SpecifyKind(date, DateTimeKind.Utc);
    }
}

public record GenerateDueMaintenanceChargesCommand(DateTime? AsOfUtc = null) : IRequest<Result<int>>;

public sealed class GenerateDueMaintenanceChargesCommandHandler(
    IMaintenanceScheduleRepository scheduleRepository,
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ILogger<GenerateDueMaintenanceChargesCommandHandler> logger)
    : IRequestHandler<GenerateDueMaintenanceChargesCommand, Result<int>>
{
    public async Task<Result<int>> Handle(GenerateDueMaintenanceChargesCommand request, CancellationToken ct)
    {
        try
        {
            var asOf = (request.AsOfUtc ?? DateTime.UtcNow).Date;
            var dueSchedules = await scheduleRepository.GetActiveDueOnAsync(asOf, ct);
            var count = 0;

            foreach (var schedule in dueSchedules)
            {
                while (schedule.AppliesToDueDate(schedule.NextDueDate) && schedule.NextDueDate.Date <= asOf)
                {
                    count += await MaintenanceChargeGenerator.UpsertChargesForDueDateAsync(schedule, schedule.NextDueDate, apartmentRepository, chargeRepository, ct);
                    schedule.AdvanceNextDueDate();
                    await scheduleRepository.UpdateAsync(schedule, ct);
                }
            }

            return Result<int>.Success(count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate due maintenance charges.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

internal static class MaintenanceChargeGenerator
{
    public static async Task<int> EnsureUpcomingChargesAsync(
        MaintenanceSchedule schedule,
        DateTime horizonUtc,
        IApartmentRepository apartmentRepository,
        IMaintenanceChargeRepository chargeRepository,
        CancellationToken ct)
    {
        var apartments = await ResolveTargetApartmentsAsync(schedule, apartmentRepository, ct);
        var desiredChargeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var createdOrUpdated = 0;

        foreach (var dueDate in EnumerateDueDates(schedule, horizonUtc))
        {
            foreach (var apartment in apartments)
                desiredChargeKeys.Add(ChargeKey(apartment.Id, dueDate.Year, dueDate.Month));

            createdOrUpdated += await UpsertChargesForDueDateAsync(schedule, dueDate, apartments, chargeRepository, ct);
        }

        var existingCharges = await chargeRepository.GetByScheduleAsync(schedule.SocietyId, schedule.Id, ct);
        var cancellationStartDate = schedule.IsActive
            ? schedule.NextDueDate.Date
            : (schedule.InactiveFromDate?.Date ?? schedule.NextDueDate.Date);

        foreach (var charge in existingCharges.Where(charge =>
                     charge.DueDate.Date >= cancellationStartDate &&
                     !desiredChargeKeys.Contains(ChargeKey(charge.ApartmentId, charge.ChargeYear, charge.ChargeMonth)) &&
                     charge.Status != PaymentStatus.Paid))
        {
            await chargeRepository.DeleteAsync(charge.Id, charge.SocietyId, ct);
        }

        return createdOrUpdated;
    }

    public static async Task<int> UpsertChargesForDueDateAsync(
        MaintenanceSchedule schedule,
        DateTime dueDate,
        IApartmentRepository apartmentRepository,
        IMaintenanceChargeRepository chargeRepository,
        CancellationToken ct)
    {
        var apartments = await ResolveTargetApartmentsAsync(schedule, apartmentRepository, ct);
        return await UpsertChargesForDueDateAsync(schedule, dueDate, apartments, chargeRepository, ct);
    }

    private static async Task<int> UpsertChargesForDueDateAsync(
        MaintenanceSchedule schedule,
        DateTime dueDate,
        IReadOnlyList<Domain.Entities.Apartment> apartments,
        IMaintenanceChargeRepository chargeRepository,
        CancellationToken ct)
    {
        var count = 0;
        foreach (var apartment in apartments)
        {
            var amount = CalculateAmount(schedule, apartment);
            var existing = await chargeRepository.GetByScheduleAndPeriodAsync(
                schedule.SocietyId,
                schedule.Id,
                apartment.Id,
                dueDate.Year,
                dueDate.Month,
                ct);

            if (existing is null)
            {
                await chargeRepository.CreateAsync(
                    MaintenanceCharge.Create(schedule.SocietyId, apartment.Id, schedule.Id, schedule.Name, amount, dueDate),
                    ct);
                count++;
                continue;
            }

            if (existing.Status == PaymentStatus.Paid)
                continue;

            existing.RefreshAmount(amount, schedule.Name, dueDate);
            await chargeRepository.UpdateAsync(existing, ct);
        }

        return count;
    }

    private static async Task<IReadOnlyList<Domain.Entities.Apartment>> ResolveTargetApartmentsAsync(
        MaintenanceSchedule schedule,
        IApartmentRepository apartmentRepository,
        CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(schedule.ApartmentId))
        {
            var apartment = await apartmentRepository.GetByIdAsync(schedule.ApartmentId, schedule.SocietyId, ct);
            return apartment is null ? [] : [apartment];
        }

        return await apartmentRepository.GetAllAsync(schedule.SocietyId, ct);
    }

    private static decimal CalculateAmount(MaintenanceSchedule schedule, Domain.Entities.Apartment apartment)
    {
        if (schedule.PricingType == MaintenancePricingType.FixedAmount)
            return decimal.Round(schedule.Rate, 2, MidpointRounding.AwayFromZero);

        var area = schedule.AreaBasis switch
        {
            MaintenanceAreaBasis.CarpetArea => apartment.CarpetArea,
            MaintenanceAreaBasis.BuildUpArea => apartment.BuildUpArea,
            MaintenanceAreaBasis.SuperBuildUpArea => apartment.SuperBuildArea,
            _ => 0d
        };

        return decimal.Round(schedule.Rate * (decimal)area, 2, MidpointRounding.AwayFromZero);
    }

    private static IEnumerable<DateTime> EnumerateDueDates(MaintenanceSchedule schedule, DateTime horizonUtc)
    {
        if (!schedule.IsActive && schedule.InactiveFromDate is null)
            yield break;

        var dueDate = schedule.NextDueDate;
        while (dueDate.Date <= horizonUtc.Date)
        {
            if (!schedule.AppliesToDueDate(dueDate))
                yield break;

            yield return dueDate;
            dueDate = AdvanceDueDate(schedule.Frequency, dueDate);
        }
    }

    private static DateTime AdvanceDueDate(FeeFrequency frequency, DateTime dueDate) =>
        frequency switch
        {
            FeeFrequency.Monthly => dueDate.AddMonths(1),
            FeeFrequency.Quarterly => dueDate.AddMonths(3),
            FeeFrequency.Annual => dueDate.AddYears(1),
            _ => dueDate.AddMonths(1)
        };

    private static string ChargeKey(string apartmentId, int year, int month) => $"{apartmentId}:{year}:{month}";

}

file static class MaintenanceAuthorization
{
    public static void EnsureAdmin(ICurrentUserService currentUserService)
    {
        if (!currentUserService.IsInRoles("SUAdmin", "HQAdmin"))
            throw new ForbiddenException("Only society admins can perform this action.");
    }
}

file static class MaintenanceScheduleWindowHelper
{
    public static bool ScheduleWindowsOverlap(DateTime firstStart, DateTime? firstEndExclusive, DateTime secondStart, DateTime? secondEndExclusive)
    {
        var firstEnd = firstEndExclusive ?? DateTime.MaxValue;
        var secondEnd = secondEndExclusive ?? DateTime.MaxValue;
        return firstStart < secondEnd && secondStart < firstEnd;
    }
}
