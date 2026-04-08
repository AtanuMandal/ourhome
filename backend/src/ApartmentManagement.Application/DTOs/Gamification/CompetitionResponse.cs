using System;

namespace ApartmentManagement.Application.DTOs.Gamification;

public record CompetitionResponse(
    string Id,
    string SocietyId,
    string Title,
    string Description,
    DateTime StartDate,
    DateTime EndDate,
    string Status,
    string Prize,
    int MaxParticipants,
    DateTime CreatedAt
);
