using System.Collections.Generic;

namespace ApartmentManagement.Application.DTOs.Gamification;

public record UserPointsResponse(
    string UserId,
    string SocietyId,
    int TotalPoints,
    IReadOnlyList<PointHistoryDto> History
);
