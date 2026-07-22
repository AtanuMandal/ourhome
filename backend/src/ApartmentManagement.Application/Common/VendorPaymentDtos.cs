using ApartmentManagement.Domain.Enums;
using System.Text.Json.Serialization;

namespace ApartmentManagement.Application.DTOs;

public sealed record VendorContactDto(
    [property: JsonPropertyName("fn")] string FirstName,
    [property: JsonPropertyName("ln")] string LastName,
    [property: JsonPropertyName("ph")] string PhoneNumber,
    [property: JsonPropertyName("em")] string Email);

public sealed record VendorDto(
    string Id,
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("addr")] AddressDto Address,
    [property: JsonPropertyName("pic")] string? PictureUrl,
    [property: JsonPropertyName("poc")] VendorContactDto PointOfContact,
    [property: JsonPropertyName("ov")] string Overview,
    [property: JsonPropertyName("vud")] DateTime ValidUptoDate,
    [property: JsonPropertyName("pdd")] int PaymentDueDays,
    [property: JsonPropertyName("gsa")] string? GeographicServiceArea,
    [property: JsonPropertyName("bt")] string? BusinessType,
    [property: JsonPropertyName("cu")] string? ContractUrl,
    [property: JsonPropertyName("ac")] bool IsActive);

public sealed record VendorRecurringScheduleDto(
    string Id,
    [property: JsonPropertyName("fq")] string Frequency,
    [property: JsonPropertyName("amt")] decimal Amount,
    [property: JsonPropertyName("sd")] DateTime StartDate,
    [property: JsonPropertyName("ed")] DateTime? EndDate,
    [property: JsonPropertyName("ifd")] DateTime? InactiveFromDate,
    [property: JsonPropertyName("lbl")] string? Label,
    [property: JsonPropertyName("ac")] bool IsActive);

public sealed record VendorChargeDto(
    string Id,
    [property: JsonPropertyName("vnm")] string VendorName,
    [property: JsonPropertyName("ct")] string ChargeType,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("efd")] DateTime EffectiveDate,
    [property: JsonPropertyName("cy")] int ChargeYear,
    [property: JsonPropertyName("cm")] int ChargeMonth,
    [property: JsonPropertyName("amt")] decimal Amount,
    [property: JsonPropertyName("dd")] DateTime DueDate,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("ac")] bool IsActive,
    [property: JsonPropertyName("ov")] bool IsOverdue,
    [property: JsonPropertyName("tr")] string? TransactionReference,
    [property: JsonPropertyName("ru")] string? ReceiptUrl);

public sealed record VendorChargeGridChargeDto(
    string Id,
    [property: JsonPropertyName("ct")] string ChargeType,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("amt")] decimal Amount,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("ac")] bool IsActive,
    [property: JsonPropertyName("efd")] DateTime EffectiveDate,
    [property: JsonPropertyName("dd")] DateTime DueDate,
    [property: JsonPropertyName("ov")] bool IsOverdue,
    [property: JsonPropertyName("ru")] string? ReceiptUrl);

public sealed record VendorChargeGridCellDto(
    [property: JsonPropertyName("mo")] int Month,
    [property: JsonPropertyName("ta")] decimal TotalAmount,
    [property: JsonPropertyName("pda")] decimal PaidAmount,
    [property: JsonPropertyName("dua")] decimal DueAmount,
    [property: JsonPropertyName("ho")] bool HasOverdue,
    [property: JsonPropertyName("chg")] IReadOnlyList<VendorChargeGridChargeDto> Charges);

public sealed record VendorChargeGridRowDto(
    [property: JsonPropertyName("vid")] string VendorId,
    [property: JsonPropertyName("vnm")] string VendorName,
    [property: JsonPropertyName("bt")] string? BusinessType,
    [property: JsonPropertyName("mos")] IReadOnlyList<VendorChargeGridCellDto> Months);

public sealed record VendorChargeGridMonthTotalDto(
    [property: JsonPropertyName("mo")] int Month,
    [property: JsonPropertyName("ta")] decimal TotalAmount,
    [property: JsonPropertyName("pda")] decimal PaidAmount,
    [property: JsonPropertyName("dua")] decimal DueAmount);

public sealed record VendorChargeGridDto(
    [property: JsonPropertyName("mos")] IReadOnlyList<int> Months,
    [property: JsonPropertyName("rows")] IReadOnlyList<VendorChargeGridRowDto> Rows,
    [property: JsonPropertyName("tot")] IReadOnlyList<VendorChargeGridMonthTotalDto> Totals);

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
    [property: JsonPropertyName("fn")] string FileName,
    [property: JsonPropertyName("fu")] string FileUrl);
