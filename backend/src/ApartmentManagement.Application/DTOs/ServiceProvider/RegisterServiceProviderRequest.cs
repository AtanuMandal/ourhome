using System.Collections.Generic;

namespace ApartmentManagement.Application.DTOs.ServiceProvider;

public record RegisterServiceProviderRequest(
    string ProviderName,
    string ContactName,
    string ContactPhone,
    string ContactEmail,
    List<string> ServiceTypes,
    string Description
);
