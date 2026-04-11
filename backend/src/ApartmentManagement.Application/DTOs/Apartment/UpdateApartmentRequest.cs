namespace ApartmentManagement.Application.DTOs.Apartment;

public record UpdateApartmentRequest(
    string BlockName,
    int FloorNumber,
    int NumberOfRooms,
    IReadOnlyList<string> ParkingSlots
);
