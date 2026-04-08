using System;

namespace ApartmentManagement.Application.DTOs.ServiceProvider;

public record ServiceRequestResponse(
    string Id,
    string SocietyId,
    string ApartmentId,
    string ServiceType,
    string Description,
    DateTime PreferredDateTime,
    string Status,
    string? AcceptedByProviderId,
    decimal? Rating,
    string? ReviewComment,
    DateTime CreatedAt
);
