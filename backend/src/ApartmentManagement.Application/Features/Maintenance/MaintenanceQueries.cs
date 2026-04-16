using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Application.DTOs;
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
