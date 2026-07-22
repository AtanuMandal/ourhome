using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Domain.Entities;

namespace ApartmentManagement.Application.Mappings;

public static class VendorPaymentMappingExtensions
{
    public static VendorDto ToResponse(this Vendor vendor) =>
        new(
            vendor.Id,
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
            vendor.IsActive);

    public static VendorRecurringScheduleDto ToResponse(this VendorRecurringSchedule schedule, string vendorName) =>
        new(
            schedule.Id,
            schedule.Frequency.ToString(),
            schedule.Amount,
            schedule.StartDate,
            schedule.EndDate,
            schedule.InactiveFromDate,
            schedule.Label,
            schedule.IsActive);

    public static VendorChargeDto ToResponse(this VendorCharge charge) =>
        new(
            charge.Id,
            charge.VendorName,
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
            charge.TransactionReference,
            charge.ReceiptUrl);

    public static VendorChargeGridChargeDto ToGridResponse(this VendorCharge charge) =>
        new(
            charge.Id,
            charge.ChargeType.ToString(),
            charge.Description,
            charge.Amount,
            charge.Status.ToString(),
            charge.IsActive,
            charge.EffectiveDate,
            charge.DueDate,
            charge.IsOverdue(DateTime.UtcNow),
            charge.ReceiptUrl);
}
