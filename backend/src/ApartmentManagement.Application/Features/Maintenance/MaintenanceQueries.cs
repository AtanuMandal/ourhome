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

namespace ApartmentManagement.Application.Queries.Maintenance;

public record GetMaintenanceSchedulesQuery(string SocietyId, string? ApartmentId)
    : IRequest<Result<IReadOnlyList<MaintenanceScheduleDto>>>;

public sealed class GetMaintenanceSchedulesQueryHandler(IMaintenanceScheduleRepository scheduleRepository)
    : IRequestHandler<GetMaintenanceSchedulesQuery, Result<IReadOnlyList<MaintenanceScheduleDto>>>
{
    public async Task<Result<IReadOnlyList<MaintenanceScheduleDto>>> Handle(GetMaintenanceSchedulesQuery request, CancellationToken ct)
    {
        try
        {
            var schedules = string.IsNullOrWhiteSpace(request.ApartmentId)
                ? await scheduleRepository.GetAllAsync(request.SocietyId, ct)
                : await scheduleRepository.GetByApartmentAsync(request.SocietyId, request.ApartmentId, ct);

            return Result<IReadOnlyList<MaintenanceScheduleDto>>.Success(schedules.Select(schedule => schedule.ToResponse()).ToList());
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<MaintenanceScheduleDto>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetMaintenanceChargesQuery(
    string SocietyId,
    string? ApartmentId,
    int? Year,
    int? Month,
    PaymentStatus? Status,
    PaginationParams Pagination)
    : IRequest<Result<PagedResult<MaintenanceChargeDto>>>;

public sealed class GetMaintenanceChargesQueryHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetMaintenanceChargesQuery, Result<PagedResult<MaintenanceChargeDto>>>
{
    public async Task<Result<PagedResult<MaintenanceChargeDto>>> Handle(GetMaintenanceChargesQuery request, CancellationToken ct)
    {
        try
        {
            var effectiveApartmentId = request.ApartmentId;
            if (!currentUserService.IsInRoles("SUAdmin", "HQAdmin") && string.IsNullOrWhiteSpace(effectiveApartmentId))
                throw new ForbiddenException("Residents must request maintenance charges for their apartment.");

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var charges = await chargeRepository.GetBySocietyAsync(
                request.SocietyId,
                request.Pagination.Page,
                request.Pagination.PageSize,
                effectiveApartmentId,
                request.Status,
                request.Year,
                request.Month,
                ct);

            var items = new List<MaintenanceChargeDto>(charges.Count);
            foreach (var charge in charges)
            {
                var apartment = await apartmentRepository.GetByIdAsync(charge.ApartmentId, request.SocietyId, ct);
                items.Add(charge.ToResponse(apartment?.ApartmentNumber ?? charge.ApartmentId, society.MaintenanceOverdueThresholdDays));
            }

            return Result<PagedResult<MaintenanceChargeDto>>.Success(
                new PagedResult<MaintenanceChargeDto>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (ForbiddenException ex)
        {
            return Result<PagedResult<MaintenanceChargeDto>>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<PagedResult<MaintenanceChargeDto>>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<PagedResult<MaintenanceChargeDto>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetApartmentMaintenanceHistoryQuery(string SocietyId, string ApartmentId, int? Year, int? Month, PaginationParams Pagination)
    : IRequest<Result<PagedResult<MaintenanceChargeDto>>>;

public sealed class GetApartmentMaintenanceHistoryQueryHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository)
    : IRequestHandler<GetApartmentMaintenanceHistoryQuery, Result<PagedResult<MaintenanceChargeDto>>>
{
    public async Task<Result<PagedResult<MaintenanceChargeDto>>> Handle(GetApartmentMaintenanceHistoryQuery request, CancellationToken ct)
    {
        try
        {
            var charges = await chargeRepository.GetByApartmentAsync(
                request.SocietyId,
                request.ApartmentId,
                request.Pagination.Page,
                request.Pagination.PageSize,
                request.Year,
                request.Month,
                ct);

            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var items = charges
                .Select(charge => charge.ToResponse(apartment?.ApartmentNumber ?? request.ApartmentId, society.MaintenanceOverdueThresholdDays))
                .ToList();

            return Result<PagedResult<MaintenanceChargeDto>>.Success(
                new PagedResult<MaintenanceChargeDto>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (NotFoundException ex)
        {
            return Result<PagedResult<MaintenanceChargeDto>>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<PagedResult<MaintenanceChargeDto>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetMaintenanceChargeGridQuery(string SocietyId, int Year)
    : IRequest<Result<MaintenanceChargeGridDto>>;

public sealed class GetMaintenanceChargeGridQueryHandler(
    IMaintenanceChargeRepository chargeRepository,
    IApartmentRepository apartmentRepository,
    ISocietyRepository societyRepository,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetMaintenanceChargeGridQuery, Result<MaintenanceChargeGridDto>>
{
    public async Task<Result<MaintenanceChargeGridDto>> Handle(GetMaintenanceChargeGridQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUserService.IsInRoles("SUAdmin", "HQAdmin"))
                throw new ForbiddenException("Only society admins can access the maintenance payment grid.");

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var apartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
            var charges = await chargeRepository.GetBySocietyAsync(request.SocietyId, 1, 10000, null, null, request.Year, null, ct);
            var monthNumbers = Enumerable.Range(1, 12).ToList();

            var rows = apartments
                .OrderBy(apartment => apartment.BlockName, StringComparer.OrdinalIgnoreCase)
                .ThenBy(apartment => apartment.ApartmentNumber, StringComparer.OrdinalIgnoreCase)
                .Select(apartment =>
                {
                    var apartmentCharges = charges
                        .Where(charge => string.Equals(charge.ApartmentId, apartment.Id, StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    var months = monthNumbers
                        .Select(month =>
                        {
                            var monthCharges = apartmentCharges
                                .Where(charge => charge.ChargeMonth == month)
                                .OrderBy(charge => charge.DueDate)
                                .Select(charge => ToGridChargeDto(charge, society.MaintenanceOverdueThresholdDays))
                                .ToList();

                            return new MaintenanceChargeGridCellDto(
                                month,
                                monthCharges.Sum(charge => charge.Amount),
                                monthCharges.Any(charge => charge.IsOverdue),
                                monthCharges);
                        })
                        .ToList();

                    var residentName = apartment.GetResident(ResidentType.Owner)?.UserName
                        ?? apartment.GetResident(ResidentType.Tenant)?.UserName
                        ?? apartment.GetResidentsForRead().FirstOrDefault()?.UserName;

                    return new MaintenanceChargeGridRowDto(
                        apartment.Id,
                        apartment.ApartmentNumber,
                        residentName,
                        months);
                })
                .ToList();

            return Result<MaintenanceChargeGridDto>.Success(new MaintenanceChargeGridDto(
                request.SocietyId,
                request.Year,
                monthNumbers,
                rows));
        }
        catch (ForbiddenException ex)
        {
            return Result<MaintenanceChargeGridDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<MaintenanceChargeGridDto>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<MaintenanceChargeGridDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private static MaintenanceChargeGridChargeDto ToGridChargeDto(MaintenanceCharge charge, int overdueThresholdDays) =>
        new(
            charge.Id,
            charge.ScheduleId,
            charge.ScheduleName,
            charge.Amount,
            charge.Status.ToString(),
            charge.DueDate,
            charge.Status != PaymentStatus.Paid && charge.DueDate.Date.AddDays(overdueThresholdDays) < DateTime.UtcNow.Date,
            charge.PaidAt,
            charge.PaymentMethod,
            charge.TransactionReference,
            charge.ReceiptUrl,
            charge.Notes,
            charge.Proofs
                .Select(proof => new MaintenancePaymentProofDto(
                    proof.ProofUrl,
                    proof.Notes,
                    proof.SubmittedByUserId,
                    proof.SubmittedAt))
                .ToList());
}
