using System;

namespace ApartmentManagement.Application.DTOs.Amenity;

public record AvailabilitySlot(
    DateTime Start,
    DateTime End,
    bool IsAvailable
);
