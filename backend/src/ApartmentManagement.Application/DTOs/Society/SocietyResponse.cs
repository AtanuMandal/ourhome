using System;
using System.Collections.Generic;

namespace ApartmentManagement.Application.DTOs.Society;

public record SocietyResponse(
    string Id,
    string Name,
    AddressDto Address,
    string ContactEmail,
    string ContactPhone,
    int TotalBlocks,
    int TotalApartments,
    string Status,
    IReadOnlyList<string> AdminUserIds,
    DateTime CreatedAt
);
