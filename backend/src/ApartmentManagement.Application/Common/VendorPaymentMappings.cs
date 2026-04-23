using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Domain.Entities;

namespace ApartmentManagement.Application.Mappings;

public static class VendorPaymentMappingExtensions
{
    public static VendorDto ToResponse(this Vendor vendor) =>
        new(
            vendor.Id,
            vendor.SocietyId,
            vendor.Name,
            new AddressDto(
                vendor.Address.Street,
                vendor.Address.City,
                vendor.Address.State,
                vendor.Address.PostalCode,
                vendor.Address.Country),
            vendor.PictureUrl,
            new VendorContactDto(
                vendor.ContactFirstName,
                vendor.ContactLastName,
                vendor.ContactPhone,
                vendor.ContactEmail),
            vendor.Overview,
            vendor.ValidUptoDate,
            vendor.PaymentDueDays,
            vendor.GeographicServiceArea,
            vendor.BusinessType,
            vendor.ContractUrl,
            vendor.IsActive,
            vendor.CreatedAt,
            vendor.UpdatedAt);

    public static VendorRecurringScheduleDto ToResponse(this VendorRecurringSchedule schedule, string vendorName) =>
        new(
            schedule.Id,
            schedule.SocietyId,
            schedule.VendorId,
            vendorName,
            schedule.Frequency.ToString(),
            schedule.Amount,
            schedule.MonthlyEquivalentAmount(),
            schedule.AnnualEquivalentAmount(),
            schedule.StartDate,
            schedule.EndDate,
            schedule.InactiveFromDate,
            schedule.NextChargeDate,
            schedule.Label,
            schedule.IsActive,
            schedule.CreatedAt,
            schedule.UpdatedAt);

    public static VendorChargeDto ToResponse(this VendorCharge charge) =>
        new(
            charge.Id,
            charge.SocietyId,
            charge.VendorId,
            charge.VendorName,
            charge.ScheduleId,
            charge.ChargeType.ToString(),
            charge.Description,
            charge.EffectiveDate,
            charge.ChargeYear,
            charge.ChargeMonth,
            charge.Amount,
            charge.DueDate,
            charge.Status.ToString(),
            charge.IsActive,
            charge.IsOverdue(DateTime.UtcNow),
            charge.PaidAt,
            charge.PaymentMethod,
            charge.TransactionReference,
            charge.ReceiptUrl,
            charge.Notes,
            charge.CreatedAt,
            charge.UpdatedAt);

    public static VendorChargeGridChargeDto ToGridResponse(this VendorCharge charge) =>
        new(
            charge.Id,
            charge.ScheduleId,
            charge.ChargeType.ToString(),
            charge.Description,
            charge.Amount,
            charge.Status.ToString(),
            charge.IsActive,
            charge.EffectiveDate,
            charge.DueDate,
            charge.IsOverdue(DateTime.UtcNow),
            charge.PaidAt,
            charge.ReceiptUrl,
            charge.Notes);
}
