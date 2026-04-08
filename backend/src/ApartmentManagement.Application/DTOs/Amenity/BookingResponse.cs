using System;

namespace ApartmentManagement.Application.DTOs.Amenity;

public record BookingResponse(
    string Id,
    string SocietyId,
    string AmenityId,
    string AmenityName,
    string BookedByUserId,
    string BookedByApartmentId,
    DateTime StartTime,
    DateTime EndTime,
    string Status,
    string? AdminNotes,
    double Duration,
    DateTime CreatedAt
);
