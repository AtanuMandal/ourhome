using ApartmentManagement.Domain.Enums;
using System.Text.Json.Serialization;

namespace ApartmentManagement.Application.DTOs;

public sealed record VendorContactDto(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string Email);

public sealed record VendorDto(
    string Id,
    string SocietyId,
    string Name,
    AddressDto Address,
    string? PictureUrl,
    VendorContactDto PointOfContact,
    string Overview,
    DateTime ValidUptoDate,
    int PaymentDueDays,
    string? GeographicServiceArea,
    string? BusinessType,
    string? ContractUrl,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record VendorRecurringScheduleDto(
    string Id,
    string SocietyId,
    string VendorId,
    string VendorName,
    string Frequency,
    decimal Amount,
    decimal MonthlyEquivalentAmount,
    decimal AnnualEquivalentAmount,
    DateTime StartDate,
    DateTime? EndDate,
    DateTime? InactiveFromDate,
    DateTime NextChargeDate,
    string? Label,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record VendorChargeDto(
    string Id,
    string SocietyId,
    string VendorId,
    string VendorName,
    string? ScheduleId,
    string ChargeType,
    string Description,
    DateTime EffectiveDate,
    int ChargeYear,
    int ChargeMonth,
    decimal Amount,
    DateTime DueDate,
    string Status,
    bool IsActive,
    bool IsOverdue,
    DateTime? PaidAt,
    string? PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record VendorChargeGridChargeDto(
    string Id,
    string? ScheduleId,
    string ChargeType,
    string Description,
    decimal Amount,
    string Status,
    bool IsActive,
    DateTime EffectiveDate,
    DateTime DueDate,
    bool IsOverdue,
    DateTime? PaidAt,
    string? ReceiptUrl,
    string? Notes);

public sealed record VendorChargeGridCellDto(
    int Month,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal DueAmount,
    bool HasOverdue,
    IReadOnlyList<VendorChargeGridChargeDto> Charges);

public sealed record VendorChargeGridRowDto(
    string VendorId,
    string VendorName,
    string? BusinessType,
    IReadOnlyList<VendorChargeGridCellDto> Months);

public sealed record VendorChargeGridMonthTotalDto(
    int Month,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal DueAmount);

public sealed record VendorChargeGridDto(
    string SocietyId,
    int Year,
    IReadOnlyList<int> Months,
    IReadOnlyList<VendorChargeGridRowDto> Rows,
    IReadOnlyList<VendorChargeGridMonthTotalDto> Totals);

public sealed record CreateVendorRequest(
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
    string? ContractUrl);

public sealed record UpdateVendorRequest(
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
    bool IsActive);

public sealed record CreateVendorRecurringScheduleRequest(
    string VendorId,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] VendorPaymentFrequency Frequency,
    decimal Amount,
    DateTime StartDate,
    DateTime? EndDate,
    string? Label);

public sealed record UpdateVendorRecurringScheduleRequest(
    DateTime? EndDate,
    DateTime? InactiveFromDate);

public sealed record CreateVendorOneTimeChargeRequest(
    string VendorId,
    decimal Amount,
    DateTime EffectiveDate,
    string? Description);

public sealed record MarkVendorChargePaidRequest(
    DateTime PaymentDate,
    string PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes);

public sealed record VendorDocumentUploadResponse(
    string FileName,
    string FileUrl);
