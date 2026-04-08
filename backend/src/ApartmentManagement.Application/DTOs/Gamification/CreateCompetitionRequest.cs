using System;

namespace ApartmentManagement.Application.DTOs.Gamification;

public record CreateCompetitionRequest(
    string Title,
    string Description,
    DateTime StartDate,
    DateTime EndDate,
    string Prize,
    int MaxParticipants
);
