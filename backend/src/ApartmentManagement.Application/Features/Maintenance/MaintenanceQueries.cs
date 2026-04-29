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
                items.Add(charge.ToResponse(apartment?.ToDisplayLabel() ?? charge.ApartmentId, society.MaintenanceOverdueThresholdDays));
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
                .Select(charge => charge.ToResponse(apartment?.ToDisplayLabel() ?? request.ApartmentId, society.MaintenanceOverdueThresholdDays))
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

public record GetMaintenanceChargeGridQuery(
    string SocietyId,
    int FinancialYearStart,
    string? ApartmentId,
    string? Block,
    int? Floor,
    PaymentStatus? Status,
    DateTime? FromDate,
    DateTime? ToDate)
    : IRequest<Result<MaintenanceChargeGridDto>>;

public sealed class GetMaintenanceChargeGridQueryHandler(
    IMaintenanceChargeGridViewRepository gridViewRepository,
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

            var gridView = await gridViewRepository.GetByFinancialYearAsync(request.SocietyId, request.FinancialYearStart, ct);
            if (gridView is null)
                return Result<MaintenanceChargeGridDto>.Success(new MaintenanceChargeGridDto(
                    request.SocietyId,
                    request.FinancialYearStart,
                    Enumerable.Range(0, 12).Select(offset => new DateTime(request.FinancialYearStart, 4, 1).AddMonths(offset).Month).ToList(),
                    new MaintenanceChargeGridSummaryDto(0, 0, 0, 0, 0, 0),
                    []));

            var apartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
            var apartmentLookup = apartments.ToDictionary(apartment => apartment.Id, StringComparer.OrdinalIgnoreCase);
            var filteredRows = gridView.Rows
                .Where(row => string.IsNullOrWhiteSpace(request.ApartmentId) || string.Equals(row.ApartmentId, request.ApartmentId, StringComparison.OrdinalIgnoreCase))
                .Where(row => string.IsNullOrWhiteSpace(request.Block) || string.Equals(row.BlockName, request.Block, StringComparison.OrdinalIgnoreCase))
                .Where(row => !request.Floor.HasValue || row.FloorNumber == request.Floor.Value)
                .Select(row =>
                {
                    var apartment = apartmentLookup.GetValueOrDefault(row.ApartmentId);
                    var filteredCells = row.Cells
                        .Select(cell =>
                        {
                            var charges = cell.Charges
                                .Where(charge => !request.Status.HasValue || string.Equals(charge.Status, request.Status.Value.ToString(), StringComparison.OrdinalIgnoreCase))
                                .Where(charge => !request.FromDate.HasValue || charge.DueDate.Date >= request.FromDate.Value.Date)
                                .Where(charge => !request.ToDate.HasValue || charge.DueDate.Date <= request.ToDate.Value.Date)
                                .Select(charge => ToGridChargeDto(charge, society.MaintenanceOverdueThresholdDays))
                                .ToList();

                            return new MaintenanceChargeGridCellDto(
                                cell.Month,
                                charges.Sum(charge => charge.Amount),
                                charges.Any(charge => charge.IsOverdue),
                                charges);
                        })
                        .ToList();

                    return new MaintenanceChargeGridRowDto(
                        row.ApartmentId,
                        apartment?.ToDisplayLabel() ?? row.ApartmentNumber,
                        row.ResidentName,
                        filteredCells);
                })
                .Where(row => row.Months.Any(month => month.Charges.Count > 0)
                    || (!request.Status.HasValue && !request.FromDate.HasValue && !request.ToDate.HasValue))
                .ToList();

            var allCharges = filteredRows.SelectMany(row => row.Months).SelectMany(month => month.Charges).ToList();
            var summary = new MaintenanceChargeGridSummaryDto(
                allCharges.Where(charge => charge.Status == PaymentStatus.Pending.ToString()).Sum(charge => charge.Amount),
                allCharges.Where(charge => charge.Status == PaymentStatus.ProofSubmitted.ToString()).Sum(charge => charge.Amount),
                allCharges.Where(charge => charge.Status == PaymentStatus.Paid.ToString()).Sum(charge => charge.Amount),
                allCharges.Count(charge => charge.Status == PaymentStatus.Pending.ToString()),
                allCharges.Count(charge => charge.Status == PaymentStatus.ProofSubmitted.ToString()),
                allCharges.Count(charge => charge.Status == PaymentStatus.Paid.ToString()));

            return Result<MaintenanceChargeGridDto>.Success(new MaintenanceChargeGridDto(
                request.SocietyId,
                request.FinancialYearStart,
                gridView.Months,
                summary,
                filteredRows));
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

    private static MaintenanceChargeGridChargeDto ToGridChargeDto(MaintenanceChargeGridView.GridCharge charge, int overdueThresholdDays) =>
        new(
            charge.ChargeId,
            charge.ScheduleId,
            charge.ScheduleName,
            charge.Amount,
            charge.Status,
            charge.DueDate,
            !string.Equals(charge.Status, PaymentStatus.Paid.ToString(), StringComparison.OrdinalIgnoreCase) &&
            charge.DueDate.Date.AddDays(overdueThresholdDays) < DateTime.UtcNow.Date,
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
