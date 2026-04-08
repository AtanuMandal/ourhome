using System;

namespace ApartmentManagement.Application.DTOs.ServiceProvider;

public record CreateServiceRequestRequest(
    string ServiceType,
    string Description,
    DateTime PreferredDateTime
);
