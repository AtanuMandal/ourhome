using System;

namespace ApartmentManagement.Application.DTOs.Apartment;

public record ApartmentResponse(
    string Id,
    string SocietyId,
    string ApartmentNumber,
    string BlockName,
    int FloorNumber,
    int NumberOfRooms,
    IReadOnlyList<string> ParkingSlots,
    string Status,
    string? OwnerId,
    string? TenantId,
    DateTime CreatedAt
);
