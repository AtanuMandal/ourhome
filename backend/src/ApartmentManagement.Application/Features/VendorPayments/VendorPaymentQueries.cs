using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Application.Commands.VendorPayments;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;

namespace ApartmentManagement.Application.Queries.VendorPayments;

public record GetVendorsQuery(string SocietyId, string? SearchText) : IRequest<Result<IReadOnlyList<VendorDto>>>;

public sealed class GetVendorsQueryHandler(
    IVendorRepository vendorRepository,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetVendorsQuery, Result<IReadOnlyList<VendorDto>>>
{
    public async Task<Result<IReadOnlyList<VendorDto>>> Handle(GetVendorsQuery request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);
            var vendors = await vendorRepository.SearchAsync(request.SocietyId, request.SearchText, ct);
            return Result<IReadOnlyList<VendorDto>>.Success(
                vendors
                    .OrderBy(vendor => vendor.Name, StringComparer.OrdinalIgnoreCase)
                    .Select(vendor => vendor.ToResponse())
                    .ToList());
        }
        catch (ForbiddenException ex)
        {
            return Result<IReadOnlyList<VendorDto>>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
    }
}

public record GetVendorRecurringSchedulesQuery(string SocietyId, string VendorId) : IRequest<Result<IReadOnlyList<VendorRecurringScheduleDto>>>;

public sealed class GetVendorRecurringSchedulesQueryHandler(
    IVendorRecurringScheduleRepository scheduleRepository,
    IVendorRepository vendorRepository,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetVendorRecurringSchedulesQuery, Result<IReadOnlyList<VendorRecurringScheduleDto>>>
{
    public async Task<Result<IReadOnlyList<VendorRecurringScheduleDto>>> Handle(GetVendorRecurringSchedulesQuery request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);

            var vendor = await vendorRepository.GetByIdAsync(request.VendorId, request.SocietyId, ct)
                ?? throw new NotFoundException("Vendor", request.VendorId);
            var schedules = await scheduleRepository.GetByVendorAsync(request.SocietyId, request.VendorId, ct);

            return Result<IReadOnlyList<VendorRecurringScheduleDto>>.Success(
                schedules
                    .OrderBy(schedule => schedule.StartDate)
                    .Select(schedule => schedule.ToResponse(vendor.Name))
                    .ToList());
        }
        catch (ForbiddenException ex)
        {
            return Result<IReadOnlyList<VendorRecurringScheduleDto>>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (NotFoundException ex)
        {
            return Result<IReadOnlyList<VendorRecurringScheduleDto>>.Failure(ErrorCodes.VendorNotFound, ex.Message);
        }
    }
}

public record GetVendorChargesQuery(
    string SocietyId,
    string? VendorId,
    int? Year,
    int? Month,
    PaymentStatus? Status,
    PaginationParams Pagination)
    : IRequest<Result<PagedResult<VendorChargeDto>>>;

public sealed class GetVendorChargesQueryHandler(
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetVendorChargesQuery, Result<PagedResult<VendorChargeDto>>>
{
    public async Task<Result<PagedResult<VendorChargeDto>>> Handle(GetVendorChargesQuery request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);

            var charges = string.IsNullOrWhiteSpace(request.VendorId)
                ? await chargeRepository.GetBySocietyAsync(request.SocietyId, request.Pagination.Page, request.Pagination.PageSize, null, request.Status, request.Year, request.Month, ct)
                : await chargeRepository.GetByVendorAsync(request.SocietyId, request.VendorId, request.Pagination.Page, request.Pagination.PageSize, request.Year, request.Month, request.Status, ct);

            var items = charges
                .OrderByDescending(charge => charge.EffectiveDate)
                .Select(charge => charge.ToResponse())
                .ToList();

            return Result<PagedResult<VendorChargeDto>>.Success(
                new PagedResult<VendorChargeDto>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (ForbiddenException ex)
        {
            return Result<PagedResult<VendorChargeDto>>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
    }
}

public record GetVendorChargeGridQuery(string SocietyId, int Year) : IRequest<Result<VendorChargeGridDto>>;

public sealed class GetVendorChargeGridQueryHandler(
    IVendorRepository vendorRepository,
    IVendorChargeRepository chargeRepository,
    ICurrentUserService currentUserService)
    : IRequestHandler<GetVendorChargeGridQuery, Result<VendorChargeGridDto>>
{
    public async Task<Result<VendorChargeGridDto>> Handle(GetVendorChargeGridQuery request, CancellationToken ct)
    {
        try
        {
            VendorPaymentsAuthorization.EnsureAdmin(currentUserService);

            var vendors = await vendorRepository.GetAllAsync(request.SocietyId, ct);
            var charges = await chargeRepository.GetByYearAsync(request.SocietyId, request.Year, ct);
            var monthNumbers = Enumerable.Range(1, 12).ToList();

            var rows = vendors
                .OrderBy(vendor => vendor.Name, StringComparer.OrdinalIgnoreCase)
                .Select(vendor =>
                {
                    var vendorCharges = charges
                        .Where(charge => string.Equals(charge.VendorId, vendor.Id, StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    var months = monthNumbers
                        .Select(month =>
                        {
                            var monthCharges = vendorCharges
                                .Where(charge => charge.ChargeMonth == month)
                                .OrderBy(charge => charge.DueDate)
                                .Select(charge => charge.ToGridResponse())
                                .ToList();
                            var activeMonthCharges = monthCharges.Where(charge => charge.IsActive).ToList();

                            return new VendorChargeGridCellDto(
                                month,
                                activeMonthCharges.Sum(charge => charge.Amount),
                                activeMonthCharges.Where(charge => string.Equals(charge.Status, PaymentStatus.Paid.ToString(), StringComparison.OrdinalIgnoreCase)).Sum(charge => charge.Amount),
                                activeMonthCharges.Where(charge => !string.Equals(charge.Status, PaymentStatus.Paid.ToString(), StringComparison.OrdinalIgnoreCase)).Sum(charge => charge.Amount),
                                activeMonthCharges.Any(charge => charge.IsOverdue),
                                monthCharges);
                        })
                        .ToList();

                    return new VendorChargeGridRowDto(vendor.Id, vendor.Name, vendor.BusinessType, months);
                })
                .ToList();

            var totals = monthNumbers
                .Select(month =>
                {
                    var monthCharges = charges.Where(charge => charge.ChargeMonth == month && charge.IsActive).ToList();
                    var paidAmount = monthCharges.Where(charge => charge.Status == PaymentStatus.Paid).Sum(charge => charge.Amount);
                    var totalAmount = monthCharges.Sum(charge => charge.Amount);
                    return new VendorChargeGridMonthTotalDto(month, totalAmount, paidAmount, totalAmount - paidAmount);
                })
                .ToList();

            return Result<VendorChargeGridDto>.Success(new VendorChargeGridDto(request.SocietyId, request.Year, monthNumbers, rows, totals));
        }
        catch (ForbiddenException ex)
        {
            return Result<VendorChargeGridDto>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
    }
}
