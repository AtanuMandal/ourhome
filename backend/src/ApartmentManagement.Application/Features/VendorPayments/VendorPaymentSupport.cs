using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Exceptions;

namespace ApartmentManagement.Application.Commands.VendorPayments;

internal static class VendorPaymentsAuthorization
{
    public static void EnsureAdmin(ICurrentUserService currentUserService)
    {
        if (!currentUserService.IsInRoles("SUAdmin", "HQAdmin"))
            throw new ForbiddenException("Only society admins can perform this action.");
    }

    public static void EnsureVendorActive(Vendor vendor)
    {
        if (!vendor.IsActive || vendor.ValidUptoDate.Date < DateTime.UtcNow.Date)
            throw new ForbiddenException("Vendor is inactive.");
    }

    public static void EnsureDateWithinVendorWindow(DateTime date, Vendor vendor)
    {
        var normalizedDate = Vendor.NormalizeUtcDate(date, nameof(date));
        if (normalizedDate.Date > vendor.ValidUptoDate.Date)
            throw new ValidationException("VALIDATION_FAILED", "Date cannot be later than vendor valid upto date.");
    }
}

internal static class VendorPaymentsLookup
{
    public static async Task EnsureSocietyExistsAsync(ISocietyRepository societyRepository, string societyId, CancellationToken ct)
    {
        _ = await societyRepository.GetByIdAsync(societyId, societyId, ct)
            ?? throw new NotFoundException("Society", societyId);
    }
}
