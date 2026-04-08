namespace ApartmentManagement.Application.DTOs.Amenity;

public record AmenityResponse(
    string Id,
    string SocietyId,
    string Name,
    string Description,
    int Capacity,
    string Rules,
    bool IsActive,
    int BookingSlotMinutes,
    string OperatingStart,
    string OperatingEnd,
    int AdvanceBookingDays
);
