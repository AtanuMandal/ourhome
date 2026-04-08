namespace ApartmentManagement.Application.DTOs.Fee;

public record RecordPaymentRequest(
    string PaymentMethod,
    string TransactionId,
    string? ReceiptUrl
);
