namespace ApartmentManagement.Application.DTOs.Amenity;

public record CreateAmenityRequest(
    string Name,
    string Description,
    int Capacity,
    string Rules,
    int BookingSlotMinutes,
    string OperatingStart,
    string OperatingEnd,
    int AdvanceBookingDays
);
