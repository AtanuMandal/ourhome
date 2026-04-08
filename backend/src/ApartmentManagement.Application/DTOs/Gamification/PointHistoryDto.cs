using System;

namespace ApartmentManagement.Application.DTOs.Gamification;

public record PointHistoryDto(
    int Points,
    string Reason,
    DateTime CreatedAt
);
