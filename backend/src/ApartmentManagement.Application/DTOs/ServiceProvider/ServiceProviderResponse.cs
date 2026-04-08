using System.Collections.Generic;

namespace ApartmentManagement.Application.DTOs.ServiceProvider;

public record ServiceProviderResponse(
    string Id,
    string ProviderName,
    string ContactName,
    string ContactPhone,
    IReadOnlyList<string> ServiceTypes,
    string Description,
    string Status,
    decimal Rating,
    int ReviewCount
);
