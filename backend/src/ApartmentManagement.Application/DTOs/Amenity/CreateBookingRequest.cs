using System;

namespace ApartmentManagement.Application.DTOs.Amenity;

public record CreateBookingRequest(
    string AmenityId,
    string ApartmentId,
    DateTime StartTime,
    DateTime EndTime
);
