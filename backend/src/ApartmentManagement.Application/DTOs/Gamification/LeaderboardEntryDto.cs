namespace ApartmentManagement.Application.DTOs.Gamification;

public record LeaderboardEntryDto(
    int Rank,
    string UserId,
    string ApartmentId,
    decimal Score
);
