using System;

namespace ApartmentManagement.Application.DTOs.Fee;

public record FeeScheduleResponse(
    string Id,
    string SocietyId,
    string ApartmentId,
    string Description,
    decimal Amount,
    string AmountType,
    string? AreaBasis,
    string Frequency,
    int DueDay,
    DateTime NextDueDate,
    bool IsActive
);
