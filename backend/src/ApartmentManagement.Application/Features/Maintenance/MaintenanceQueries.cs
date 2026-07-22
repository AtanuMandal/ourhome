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
    PaginationParams Pagination,
    /// <summary>Delta/auto-refresh mode (see requirements/auto_refresh.md) — when set, returns
    /// only charges created/updated at or after this timestamp (clamped server-side to at most
    /// 10 minutes ago), unpaginated, instead of the normal paged result.</summary>
    DateTime? UpdatedSince = null)
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

            IReadOnlyList<MaintenanceCharge> charges;
            if (request.UpdatedSince.HasValue)
            {
                // Delta path: only Year/Month/ApartmentId scoping is re-applied here — Status is
                // deliberately NOT re-applied. If it were, a charge that changed status away from
                // an active Status filter (e.g. Pending -> ProofSubmitted while viewing "Pending
                // only") would be excluded from the delta before the UpdatedAt check ever ran, so
                // the change would never reach the client and the stale row would never be
                // evicted. Instead every changed charge in scope comes back and the client
                // re-applies its own active Status filter locally when merging (see
                // requirements/auto_refresh.md, "stillVisible"). Fetched unpaged and floored by
                // UpdatedAt instead of Skip/Take — a 10-minute window is always small.
                var since = AutoRefreshWindow.Clamp(request.UpdatedSince.Value, DateTime.UtcNow);
                var candidates = await chargeRepository.GetBySocietyAsync(
                    request.SocietyId, 1, 10_000, effectiveApartmentId, null, request.Year, request.Month, ct);
                charges = candidates
                    .Where(c => c.UpdatedAt >= since)
                    .ToList();
            }
            else if (request.Status == PaymentStatus.Overdue)
            {
                // "Overdue" is never a persisted charge status (see MappingExtensions.IsOverdue) —
                // pushing it down as a literal Status match to the repository would always return
                // zero rows. Fetch unfiltered-by-status instead and compute + paginate in memory.
                var unfiltered = await chargeRepository.GetBySocietyAsync(
                    request.SocietyId, 1, 10_000, effectiveApartmentId, null, request.Year, request.Month, ct);
                var overdue = unfiltered.Where(c => c.IsOverdue(society.MaintenanceOverdueThresholdDays)).ToList();
                charges = overdue
                    .Skip((request.Pagination.Page - 1) * request.Pagination.PageSize)
                    .Take(request.Pagination.PageSize)
                    .ToList();
            }
            else
            {
                charges = await chargeRepository.GetBySocietyAsync(
                    request.SocietyId,
                    request.Pagination.Page,
                    request.Pagination.PageSize,
                    effectiveApartmentId,
                    request.Status,
                    request.Year,
                    request.Month,
                    ct);
            }

            // Resolve apartment display labels with as few round trips as possible: when the
            // request is already scoped to a single apartment, every charge shares it, so fetch
            // it once; otherwise bulk-fetch the whole society's apartments and map in memory
            // instead of resolving each charge's apartment with its own repository round-trip.
            IReadOnlyDictionary<string, Domain.Entities.Apartment> apartmentsById;
            if (!string.IsNullOrWhiteSpace(effectiveApartmentId))
            {
                var singleApartment = await apartmentRepository.GetByIdAsync(effectiveApartmentId, request.SocietyId, ct);
                apartmentsById = singleApartment is null
                    ? new Dictionary<string, Domain.Entities.Apartment>(StringComparer.OrdinalIgnoreCase)
                    : new Dictionary<string, Domain.Entities.Apartment>(StringComparer.OrdinalIgnoreCase) { [singleApartment.Id] = singleApartment };
            }
            else
            {
                var allApartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
                apartmentsById = allApartments.ToDictionary(a => a.Id, StringComparer.OrdinalIgnoreCase);
            }

            

            var items = new List<MaintenanceChargeDto>(charges.Count);
            foreach (var charge in charges)
            {
                apartmentsById.TryGetValue(charge.ApartmentId, out var apartment);
                items.Add(charge.ToResponse(apartment?.ToDisplayLabel() ?? charge.ApartmentId, society.MaintenanceOverdueThresholdDays));
            }

            var (resultPage, resultPageSize) = request.UpdatedSince.HasValue
                ? (1, items.Count)
                : (request.Pagination.Page, request.Pagination.PageSize);

            return Result<PagedResult<MaintenanceChargeDto>>.Success(
                new PagedResult<MaintenanceChargeDto>(items, items.Count, resultPage, resultPageSize));
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

public record GetApartmentMaintenanceHistoryQuery(
    string SocietyId,
    string ApartmentId,
    int? Year,
    int? Month,
    PaginationParams Pagination,
    /// <summary>Delta/auto-refresh mode (see requirements/auto_refresh.md) — when set, returns
    /// only charges created/updated at or after this timestamp (clamped server-side to at most
    /// 10 minutes ago), unpaginated, instead of the normal paged result.</summary>
    DateTime? UpdatedSince = null)
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
            IReadOnlyList<MaintenanceCharge> charges;
            int resultPage;
            int resultPageSize;

            if (request.UpdatedSince.HasValue)
            {
                var since = AutoRefreshWindow.Clamp(request.UpdatedSince.Value, DateTime.UtcNow);
                var candidates = await chargeRepository.GetByApartmentAsync(
                    request.SocietyId, request.ApartmentId, 1, 10_000, request.Year, request.Month, ct);
                charges = candidates.Where(c => c.UpdatedAt >= since).ToList();
                resultPage = 1;
                resultPageSize = charges.Count;
            }
            else
            {
                charges = await chargeRepository.GetByApartmentAsync(
                    request.SocietyId,
                    request.ApartmentId,
                    request.Pagination.Page,
                    request.Pagination.PageSize,
                    request.Year,
                    request.Month,
                    ct);
                resultPage = request.Pagination.Page;
                resultPageSize = request.Pagination.PageSize;
            }

            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var items = charges
                .Select(charge => charge.ToResponse(apartment?.ToDisplayLabel() ?? request.ApartmentId, society.MaintenanceOverdueThresholdDays))
                .ToList();

            return Result<PagedResult<MaintenanceChargeDto>>.Success(
                new PagedResult<MaintenanceChargeDto>(items, items.Count, resultPage, resultPageSize));
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
    DateTime? ToDate,
    /// <summary>Delta/auto-refresh mode (see requirements/auto_refresh.md) — when set, returns
    /// only the rows/cells/charges changed at or after this timestamp (clamped server-side to at
    /// most 10 minutes ago) instead of the full grid. Rows/cells with no surviving charges are
    /// dropped, so the result is a sparse subset of the same shape the client already has.</summary>
    DateTime? UpdatedSince = null)
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

            var isDelta = request.UpdatedSince.HasValue;
            var since = isDelta ? AutoRefreshWindow.Clamp(request.UpdatedSince!.Value, DateTime.UtcNow) : (DateTime?)null;

            var apartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
            var apartmentLookup = apartments.ToDictionary(apartment => apartment.Id, StringComparer.OrdinalIgnoreCase);
            var filteredRows = gridView.Rows
                // ApartmentId/Block/Floor are stable scoping — a charge's own apartment never
                // changes — so they're always re-applied, delta or not.
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
                                // Delta path: Status/FromDate/ToDate are cosmetic view filters,
                                // deliberately NOT re-applied here — same reasoning as the flat
                                // charges list (see GetMaintenanceChargesQueryHandler above). If
                                // they were, a charge that changed status away from an active
                                // filter would be excluded before the UpdatedAt check ever ran,
                                // so the change would never reach the client and the stale cell
                                // would never be corrected. The client re-applies its own active
                                // filter locally when merging (see requirements/auto_refresh.md).
                                .Where(charge => isDelta || !request.Status.HasValue
                                    || (request.Status.Value == PaymentStatus.Overdue
                                        ? IsOverdueCharge(charge, society.MaintenanceOverdueThresholdDays)
                                        : string.Equals(charge.Status, request.Status.Value.ToString(), StringComparison.OrdinalIgnoreCase)))
                                .Where(charge => isDelta || !request.FromDate.HasValue || charge.DueDate.Date >= request.FromDate.Value.Date)
                                .Where(charge => isDelta || !request.ToDate.HasValue || charge.DueDate.Date <= request.ToDate.Value.Date)
                                .Where(charge => !isDelta || charge.UpdatedAt >= since!.Value)
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
                // Delta mode always drops rows/cells with nothing changed — a sparse result is
                // the point. Non-delta mode keeps the "show every apartment" behavior when no
                // view filter is active, unchanged from before.
                .Where(row => row.Months.Any(month => month.Charges.Count > 0)
                    || (!isDelta && !request.Status.HasValue && !request.FromDate.HasValue && !request.ToDate.HasValue))
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

    /// <summary>"Overdue" is never a persisted status (see MappingExtensions.IsOverdue) — it's
    /// always computed from the due date, both for the response DTO and for matching a
    /// Status=Overdue filter against the domain GridCharge before it's mapped to a DTO.</summary>
    private static bool IsOverdueCharge(MaintenanceChargeGridView.GridCharge charge, int overdueThresholdDays) =>
        !string.Equals(charge.Status, PaymentStatus.Paid.ToString(), StringComparison.OrdinalIgnoreCase) &&
        charge.DueDate.Date.AddDays(overdueThresholdDays) < DateTime.UtcNow.Date;

    private static MaintenanceChargeGridChargeDto ToGridChargeDto(MaintenanceChargeGridView.GridCharge charge, int overdueThresholdDays) =>
        new(
            charge.ChargeId,
            charge.ScheduleId,
            charge.ScheduleName,
            charge.Amount,
            charge.Status,
            charge.DueDate,
            IsOverdueCharge(charge, overdueThresholdDays),
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
                    proof.SubmittedAt,
                    proof.SubmissionGroupId))
                .ToList(),
            charge.RejectionReason,
            charge.RejectedAt,
            charge.Proofs.Count > 0 ? charge.Proofs[^1].SubmissionGroupId : null);
}
