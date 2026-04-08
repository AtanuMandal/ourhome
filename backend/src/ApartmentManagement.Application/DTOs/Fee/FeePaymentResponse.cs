using System;

namespace ApartmentManagement.Application.DTOs.Fee;

public record FeePaymentResponse(
    string Id,
    string SocietyId,
    string ApartmentId,
    string FeeScheduleId,
    string Description,
    decimal Amount,
    string Status,
    DateTime DueDate,
    DateTime? PaidAt,
    string? PaymentMethod,
    string? TransactionId,
    string? ReceiptUrl
);
