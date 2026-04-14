using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Application.DTOs.Fee;

public record CreateFeeScheduleRequest(
    string ApartmentId,
    string Description,
    decimal Amount,
    FeeAmountType AmountType,
    AreaBasis? AreaBasis,
    FeeFrequency Frequency,
    int DueDay
);
