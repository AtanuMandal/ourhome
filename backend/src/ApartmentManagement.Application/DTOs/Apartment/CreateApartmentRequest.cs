namespace ApartmentManagement.Application.DTOs.Apartment;

public record CreateApartmentRequest(
    string ApartmentNumber,
    string BlockName,
    int FloorNumber,
    int NumberOfRooms,
    IReadOnlyList<string> ParkingSlots,
    string? OwnerId
);
