using System;

namespace ApartmentManagement.Application.DTOs.Gamification;

public record CompetitionEntryResponse(
    string Id,
    string CompetitionId,
    string ApartmentId,
    string UserId,
    decimal Score,
    int Rank,
    DateTime RegisteredAt
);
